const express = require('express');
const multer = require('multer');
const archiver = require('archiver');

const { pool } = require('../db/pool');
const { requireRole } = require('../middleware/auth');
const { renderCertificateBuffer } = require('../utils/pdfGenerator');
const { readRows, normalizeKeys, field } = require('../utils/spreadsheet');
const { COURSE_OPTIONS } = require('../utils/courseOptions');

const router = express.Router();

// Every route below requires an active teacher session. Because unverified
// teachers are rejected at login (see auth.routes.js), any teacher who
// reaches these routes is, by construction, a verified teacher.
router.use(requireRole('teacher'));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ---------------------------------------------------------------------
// View all student records
// ---------------------------------------------------------------------
router.get('/students', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM students ORDER BY name ASC');
  res.json({ students: rows });
});

// ---------------------------------------------------------------------
// Edit a student record (verified teachers only — enforced by the
// router-level requireRole('teacher') guard above, see note there)
// ---------------------------------------------------------------------
router.put('/students/:id', async (req, res) => {
  const { id } = req.params;
  const { name, registerNumber, email, course, issueDate } = req.body || {};

  const [existingRows] = await pool.query('SELECT * FROM students WHERE id = :id', { id });
  if (existingRows.length === 0) {
    return res.status(404).json({ error: 'Student not found.' });
  }
  const current = existingRows[0];

  if (course && !COURSE_OPTIONS.includes(course)) {
    return res.status(400).json({ error: `Course must be one of: ${COURSE_OPTIONS.join(', ')}` });
  }

  try {
    await pool.query(
      `UPDATE students
       SET name = :name, register_number = :registerNumber, email = :email,
           course = :course, issue_date = :issueDate
       WHERE id = :id`,
      {
        id,
        name: name ?? current.name,
        registerNumber: registerNumber ?? current.register_number,
        email: email ?? current.email,
        course: course ?? current.course,
        issueDate: issueDate ?? current.issue_date,
      }
    );
    const [rows] = await pool.query('SELECT * FROM students WHERE id = :id', { id });
    res.json({ student: rows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res
        .status(409)
        .json({ error: 'A student with that register number or email already exists.' });
    }
    throw err;
  }
});

// ---------------------------------------------------------------------
// Single certificate download
// ---------------------------------------------------------------------
router.get('/students/:id/certificate', async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query('SELECT * FROM students WHERE id = :id', { id });
  const student = rows[0];
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  if (!student.is_verified) {
    return res.status(403).json({ error: 'This student record is not yet verified.' });
  }

  const buffer = await renderCertificateBuffer({
    recipientName: student.name,
    registerNumber: student.register_number,
    course: student.course,
    certificateId: student.certificate_id,
    issueDate: student.issue_date,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${student.certificate_id}.pdf"`);
  res.send(buffer);
});

// ---------------------------------------------------------------------
// Bulk download — upload a CSV/XLSX of register numbers or emails
// ---------------------------------------------------------------------
router.post('/bulk-download', upload.single('file'), async (req, res) => {
  if (!req.session.user.canBulkDownload) {
    return res
      .status(403)
      .json({ error: 'You do not have bulk download permission. Ask an administrator to enable it.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Attach a CSV or Excel file.' });
  }

  let identifiers;
  try {
    identifiers = extractIdentifiers(req.file);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  if (identifiers.length === 0) {
    return res.status(400).json({
      error:
        'No register numbers or emails found. The file needs a column named "registerNumber" or "email".',
    });
  }

  const found = [];
  const notFound = [];

  for (const identifier of identifiers) {
    const [rows] = await pool.query(
      `SELECT * FROM students WHERE register_number = :identifier OR email = :identifier LIMIT 1`,
      { identifier }
    );
    const student = rows[0];
    if (!student) {
      notFound.push(identifier);
    } else if (!student.is_verified) {
      notFound.push(`${identifier} (not yet verified)`);
    } else {
      found.push(student);
    }
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="certificates-bulk.zip"');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => {
    throw err;
  });
  archive.pipe(res);

  for (const student of found) {
    const buffer = await renderCertificateBuffer({
      recipientName: student.name,
      registerNumber: student.register_number,
      course: student.course,
      certificateId: student.certificate_id,
      issueDate: student.issue_date,
    });
    archive.append(buffer, { name: `${student.certificate_id}.pdf` });
  }

  if (notFound.length > 0) {
    const report = [
      'The following entries could not be matched to a verified student record:',
      ...notFound.map((n) => ` - ${n}`),
    ].join('\n');
    archive.append(report, { name: '_not_found.txt' });
  }

  await archive.finalize();
});

/** Reads register numbers / emails out of an uploaded CSV or XLSX file. */
function extractIdentifiers(file) {
  const records = readRows(file);
  const identifiers = [];
  for (const record of records) {
    const normalized = normalizeKeys(record);
    const value = field(normalized, 'registernumber', 'regno', 'email');
    if (value) identifiers.push(value);
  }
  return identifiers;
}

module.exports = router;
