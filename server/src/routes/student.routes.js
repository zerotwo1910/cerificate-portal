const express = require('express');
const { pool } = require('../db/pool');
const { requireRole } = require('../middleware/auth');
const { renderCertificateBuffer } = require('../utils/pdfGenerator');

const router = express.Router();
router.use(requireRole('student'));

router.get('/me', async (req, res) => {
  const { id } = req.session.user;
  const [rows] = await pool.query('SELECT * FROM students WHERE id = :id', { id });
  const student = rows[0];
  if (!student) return res.status(404).json({ error: 'Student record not found.' });
  res.json({ student });
});

router.get('/me/certificate', async (req, res) => {
  const { id } = req.session.user;
  const [rows] = await pool.query('SELECT * FROM students WHERE id = :id', { id });
  const student = rows[0];
  if (!student) return res.status(404).json({ error: 'Student record not found.' });

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

module.exports = router;
