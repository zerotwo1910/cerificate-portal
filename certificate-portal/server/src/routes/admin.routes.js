const express = require('express');
const multer = require('multer');
const { pool } = require('../db/pool');
const { requireRole } = require('../middleware/auth');
const { generateCertificateId } = require('../utils/certificateId');
const { readRows, normalizeKeys, field } = require('../utils/spreadsheet');
const { COURSE_OPTIONS } = require('../utils/courseOptions');

const router = express.Router();
router.use(requireRole('admin'));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ---------------------------------------------------------------------
// Students — full CRUD
// ---------------------------------------------------------------------

router.get('/students', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM students ORDER BY created_at DESC');
  res.json({ students: rows });
});

router.post('/students', async (req, res) => {
  const { name, registerNumber, email, course, issueDate } = req.body || {};
  if (!name || !registerNumber || !email || !course) {
    return res
      .status(400)
      .json({ error: 'name, registerNumber, email, and course are required.' });
  }

  let certificateId = generateCertificateId();
  // Ensure uniqueness against existing rows (extremely unlikely to collide, but check anyway).
  for (let attempts = 0; attempts < 5; attempts++) {
    const [existing] = await pool.query(
      'SELECT id FROM students WHERE certificate_id = :certificateId',
      { certificateId }
    );
    if (existing.length === 0) break;
    certificateId = generateCertificateId();
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO students (name, register_number, email, course, certificate_id, issue_date, is_verified)
       VALUES (:name, :registerNumber, :email, :course, :certificateId, :issueDate, TRUE)`,
      {
        name,
        registerNumber,
        email,
        course,
        certificateId,
        issueDate: issueDate || new Date().toISOString().slice(0, 10),
      }
    );
    const [rows] = await pool.query('SELECT * FROM students WHERE id = :id', {
      id: result.insertId,
    });
    res.status(201).json({ student: rows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A student with that register number or email already exists.' });
    }
    throw err;
  }
});

// ---------------------------------------------------------------------
// Bulk create students — upload a CSV/XLSX with name, registerNumber,
// email, course (and optional issueDate) columns.
// ---------------------------------------------------------------------
router.post('/students/bulk-upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Attach a CSV or Excel file.' });
  }

  let records;
  try {
    records = readRows(req.file);
  } catch (err) {
    return res.status(400).json({ error: 'Could not read that file. Is it a valid CSV/Excel file?' });
  }

  if (records.length === 0) {
    return res.status(400).json({ error: 'The file has no rows.' });
  }

  const created = [];
  const skipped = [];
  const seenInFile = new Set(); // register numbers / emails already used earlier in this same file

  for (let i = 0; i < records.length; i++) {
    const rowNumber = i + 2; // +1 for zero-index, +1 for the header row
    const normalized = normalizeKeys(records[i]);

    const name = field(normalized, 'name', 'studentname');
    const registerNumber = field(normalized, 'registernumber', 'regno', 'register');
    const email = field(normalized, 'email', 'emailid');
    const course = field(normalized, 'course', 'coursename');
    const issueDate = field(normalized, 'issuedate') || new Date().toISOString().slice(0, 10);

    if (!name || !registerNumber || !email || !course) {
      skipped.push({ row: rowNumber, reason: 'Missing name, registerNumber, email, or course.' });
      continue;
    }
    if (!COURSE_OPTIONS.includes(course)) {
      skipped.push({ row: rowNumber, reason: `Course "${course}" is not one of the allowed options.` });
      continue;
    }
    const dedupeKey = `${registerNumber.toLowerCase()}|${email.toLowerCase()}`;
    if (seenInFile.has(dedupeKey)) {
      skipped.push({ row: rowNumber, reason: 'Duplicate row within the uploaded file.' });
      continue;
    }

    const [existing] = await pool.query(
      'SELECT id FROM students WHERE register_number = :registerNumber OR email = :email',
      { registerNumber, email }
    );
    if (existing.length > 0) {
      skipped.push({ row: rowNumber, reason: 'A student with that register number or email already exists.' });
      continue;
    }

    let certificateId = generateCertificateId();
    for (let attempts = 0; attempts < 5; attempts++) {
      const [dupCert] = await pool.query('SELECT id FROM students WHERE certificate_id = :certificateId', {
        certificateId,
      });
      if (dupCert.length === 0) break;
      certificateId = generateCertificateId();
    }

    await pool.query(
      `INSERT INTO students (name, register_number, email, course, certificate_id, issue_date, is_verified)
       VALUES (:name, :registerNumber, :email, :course, :certificateId, :issueDate, TRUE)`,
      { name, registerNumber, email, course, certificateId, issueDate }
    );

    seenInFile.add(dedupeKey);
    created.push({ row: rowNumber, name, registerNumber, email });
  }

  res.status(201).json({ createdCount: created.length, skippedCount: skipped.length, created, skipped });
});

// ---------------------------------------------------------------------
// Bulk delete students — body: { ids: number[] }
// ---------------------------------------------------------------------
router.post('/students/bulk-delete', async (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Provide a non-empty array of student ids to delete.' });
  }
  const numericIds = ids.map(Number).filter((n) => Number.isInteger(n));
  if (numericIds.length === 0) {
    return res.status(400).json({ error: 'No valid ids provided.' });
  }

  const [result] = await pool.query('DELETE FROM students WHERE id IN (:ids)', { ids: numericIds });
  res.json({ deletedCount: result.affectedRows });
});

router.put('/students/:id', async (req, res) => {
  const { id } = req.params;
  const { name, registerNumber, email, course, issueDate, isVerified } = req.body || {};

  const [existingRows] = await pool.query('SELECT * FROM students WHERE id = :id', { id });
  if (existingRows.length === 0) {
    return res.status(404).json({ error: 'Student not found.' });
  }
  const current = existingRows[0];

  try {
    await pool.query(
      `UPDATE students
       SET name = :name, register_number = :registerNumber, email = :email,
           course = :course, issue_date = :issueDate, is_verified = :isVerified
       WHERE id = :id`,
      {
        id,
        name: name ?? current.name,
        registerNumber: registerNumber ?? current.register_number,
        email: email ?? current.email,
        course: course ?? current.course,
        issueDate: issueDate ?? current.issue_date,
        isVerified: isVerified ?? current.is_verified,
      }
    );
    const [rows] = await pool.query('SELECT * FROM students WHERE id = :id', { id });
    res.json({ student: rows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A student with that register number or email already exists.' });
    }
    throw err;
  }
});

router.delete('/students/:id', async (req, res) => {
  const { id } = req.params;
  const [result] = await pool.query('DELETE FROM students WHERE id = :id', { id });
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Student not found.' });
  }
  res.json({ ok: true });
});

router.patch('/students/:id/verify', async (req, res) => {
  const { id } = req.params;
  const { isVerified } = req.body || {};
  const [result] = await pool.query('UPDATE students SET is_verified = :isVerified WHERE id = :id', {
    id,
    isVerified: !!isVerified,
  });
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Student not found.' });
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Teachers — list, create, verify, bulk-download permission
// ---------------------------------------------------------------------

router.get('/teachers', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, email, department, is_verified, can_bulk_download, created_at FROM teachers ORDER BY created_at DESC'
  );
  res.json({ teachers: rows });
});

router.post('/teachers', async (req, res) => {
  const { name, email, password, department } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO teachers (name, email, password, department, is_verified, can_bulk_download)
       VALUES (:name, :email, :password, :department, FALSE, FALSE)`,
      { name, email, password, department: department || null }
    );
    const [rows] = await pool.query(
      'SELECT id, name, email, department, is_verified, can_bulk_download, created_at FROM teachers WHERE id = :id',
      { id: result.insertId }
    );
    res.status(201).json({ teacher: rows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A teacher with that email already exists.' });
    }
    throw err;
  }
});

// ---------------------------------------------------------------------
// Edit a teacher's details. Password is optional here — send it only if
// you want to reset it; omit or leave blank to keep the current one.
// ---------------------------------------------------------------------
router.put('/teachers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, department, password } = req.body || {};

  const [existingRows] = await pool.query('SELECT * FROM teachers WHERE id = :id', { id });
  if (existingRows.length === 0) {
    return res.status(404).json({ error: 'Teacher not found.' });
  }
  const current = existingRows[0];

  try {
    await pool.query(
      `UPDATE teachers
       SET name = :name, email = :email, department = :department,
           password = :password
       WHERE id = :id`,
      {
        id,
        name: name ?? current.name,
        email: email ?? current.email,
        department: department !== undefined ? department || null : current.department,
        password: password && password.trim() ? password : current.password,
      }
    );
    const [rows] = await pool.query(
      'SELECT id, name, email, department, is_verified, can_bulk_download, created_at FROM teachers WHERE id = :id',
      { id }
    );
    res.json({ teacher: rows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A teacher with that email already exists.' });
    }
    throw err;
  }
});

// ---------------------------------------------------------------------
// Bulk create teachers — upload a CSV/XLSX with name, email, password
// (and optional department) columns. New teachers still start out
// unverified with bulk-download disabled, same as adding one at a time.
// ---------------------------------------------------------------------
router.post('/teachers/bulk-upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Attach a CSV or Excel file.' });
  }

  let records;
  try {
    records = readRows(req.file);
  } catch (err) {
    return res.status(400).json({ error: 'Could not read that file. Is it a valid CSV/Excel file?' });
  }

  if (records.length === 0) {
    return res.status(400).json({ error: 'The file has no rows.' });
  }

  const created = [];
  const skipped = [];
  const seenInFile = new Set();

  for (let i = 0; i < records.length; i++) {
    const rowNumber = i + 2;
    const normalized = normalizeKeys(records[i]);

    const name = field(normalized, 'name', 'teachername');
    const email = field(normalized, 'email', 'emailid');
    const password = field(normalized, 'password');
    const department = field(normalized, 'department', 'dept') || null;

    if (!name || !email || !password) {
      skipped.push({ row: rowNumber, reason: 'Missing name, email, or password.' });
      continue;
    }
    const dedupeKey = email.toLowerCase();
    if (seenInFile.has(dedupeKey)) {
      skipped.push({ row: rowNumber, reason: 'Duplicate email within the uploaded file.' });
      continue;
    }

    const [existing] = await pool.query('SELECT id FROM teachers WHERE email = :email', { email });
    if (existing.length > 0) {
      skipped.push({ row: rowNumber, reason: 'A teacher with that email already exists.' });
      continue;
    }

    await pool.query(
      `INSERT INTO teachers (name, email, password, department, is_verified, can_bulk_download)
       VALUES (:name, :email, :password, :department, FALSE, FALSE)`,
      { name, email, password, department }
    );

    seenInFile.add(dedupeKey);
    created.push({ row: rowNumber, name, email });
  }

  res.status(201).json({ createdCount: created.length, skippedCount: skipped.length, created, skipped });
});

router.patch('/teachers/:id/verify', async (req, res) => {
  const { id } = req.params;
  const { isVerified } = req.body || {};
  const [result] = await pool.query('UPDATE teachers SET is_verified = :isVerified WHERE id = :id', {
    id,
    isVerified: !!isVerified,
  });
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Teacher not found.' });
  }
  res.json({ ok: true });
});

router.patch('/teachers/:id/bulk-permission', async (req, res) => {
  const { id } = req.params;
  const { canBulkDownload } = req.body || {};
  const [result] = await pool.query(
    'UPDATE teachers SET can_bulk_download = :canBulkDownload WHERE id = :id',
    { id, canBulkDownload: !!canBulkDownload }
  );
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Teacher not found.' });
  }
  res.json({ ok: true });
});

router.delete('/teachers/:id', async (req, res) => {
  const { id } = req.params;
  const [result] = await pool.query('DELETE FROM teachers WHERE id = :id', { id });
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Teacher not found.' });
  }
  res.json({ ok: true });
});

module.exports = router;
