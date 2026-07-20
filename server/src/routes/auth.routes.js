const express = require('express');
const { pool } = require('../db/pool');

const router = express.Router();

/**
 * POST /api/auth/admin/login
 * body: { username, password }
 */
router.post('/admin/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const [rows] = await pool.query('SELECT * FROM admins WHERE username = :username', {
    username,
  });
  const admin = rows[0];

  if (!admin || admin.password !== password) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  req.session.user = { id: admin.id, role: 'admin', name: admin.name, username: admin.username };
  res.json({ user: req.session.user });
});

/**
 * POST /api/auth/teacher/login
 * body: { email, password }
 */
router.post('/teacher/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const [rows] = await pool.query('SELECT * FROM teachers WHERE email = :email', { email });
  const teacher = rows[0];

  if (!teacher || teacher.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  if (!teacher.is_verified) {
    return res
      .status(403)
      .json({ error: 'Your account is pending verification by an administrator.' });
  }

  req.session.user = {
    id: teacher.id,
    role: 'teacher',
    name: teacher.name,
    email: teacher.email,
    canBulkDownload: !!teacher.can_bulk_download,
  };
  res.json({ user: req.session.user });
});

/**
 * POST /api/auth/student/login
 * body: { registerNumber, email }
 * Students authenticate with the pair of register number + email rather
 * than a separate password, per the spec.
 */
router.post('/student/login', async (req, res) => {
  const { registerNumber, email } = req.body || {};
  if (!registerNumber || !email) {
    return res.status(400).json({ error: 'Register number and email are required.' });
  }

  const [rows] = await pool.query(
    'SELECT * FROM students WHERE register_number = :registerNumber AND email = :email',
    { registerNumber, email }
  );
  const student = rows[0];

  if (!student) {
    return res
      .status(401)
      .json({ error: 'No matching student record found. Check your register number and email.' });
  }
  if (!student.is_verified) {
    return res
      .status(403)
      .json({ error: 'Your record is pending verification by an administrator.' });
  }

  req.session.user = {
    id: student.id,
    role: 'student',
    name: student.name,
    registerNumber: student.register_number,
    email: student.email,
  };
  res.json({ user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  res.json({ user: req.session.user });
});

module.exports = router;
