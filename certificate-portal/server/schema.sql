-- Certificate Portal — MySQL schema + seed data
-- Run with: mysql -u cert_app -p certificate_portal < schema.sql

-- ---------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL, -- plain text for this demo build (see README security note)
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- Teachers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teachers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL, -- plain text for this demo build (see README security note)
  department VARCHAR(100),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  can_bulk_download BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- Students
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  register_number VARCHAR(30) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  course VARCHAR(100) NOT NULL,
  certificate_id VARCHAR(30) NOT NULL UNIQUE,
  issue_date DATE NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------

-- Default admin login: username "admin", password "admin123"
INSERT INTO admins (username, password, name)
VALUES ('admin', 'admin123', 'Portal Administrator')
ON DUPLICATE KEY UPDATE username = username;

-- Sample teachers.
-- "Prof. Anitha Kumar" is verified and allowed to bulk download.
-- "Mr. Ravi Shankar" is NOT yet verified, to demonstrate the admin approval flow.
INSERT INTO teachers (name, email, password, department, is_verified, can_bulk_download)
VALUES
  ('Anitha Kumar', 'anitha.kumar@college.edu', 'teacher123', 'Computer Science', TRUE, TRUE),
  ('Ravi Shankar', 'ravi.shankar@college.edu', 'teacher123', 'Information Technology', FALSE, FALSE)
ON DUPLICATE KEY UPDATE email = email;

-- Sample students (placeholder roster — replace with your real class list via
-- the Admin dashboard's Add/Import feature). All seeded as verified.
INSERT INTO students (name, register_number, email, course, certificate_id, issue_date, is_verified)
VALUES
  ('Aarthi Selvam', '21CS001', 'aarthi.selvam@student.edu', 'FullStack Development', 'CERT-2026-A1B2C3', '2026-06-01', TRUE),
  ('Bharath Raj', '21CS002', 'bharath.raj@student.edu', 'Frontend Development', 'CERT-2026-D4E5F6', '2026-06-01', TRUE),
  ('Divya Prakash', '21CS003', 'divya.prakash@student.edu', 'Backend Development', 'CERT-2026-G7H8J9', '2026-06-01', TRUE),
  ('Karthik Iyer', '21CS004', 'karthik.iyer@student.edu', 'AI Development', 'CERT-2026-K2L3M4', '2026-06-01', TRUE),
  ('Meena Sundaram', '21CS005', 'meena.sundaram@student.edu', 'IoT Development', 'CERT-2026-N5P6Q7', '2026-06-01', TRUE),
  ('Naveen Kumar', '21CS006', 'naveen.kumar@student.edu', 'FullStack Development', 'CERT-2026-R8S9T2', '2026-06-01', TRUE),
  ('Priya Dharshini', '21CS007', 'priya.dharshini@student.edu', 'Frontend Development', 'CERT-2026-U3V4W5', '2026-06-01', TRUE),
  ('Rahul Krishnan', '21CS008', 'rahul.krishnan@student.edu', 'Backend Development', 'CERT-2026-X6Y7Z8', '2026-06-01', TRUE),
  ('Sowmiya Ranganathan', '21CS009', 'sowmiya.r@student.edu', 'AI Development', 'CERT-2026-A9B2C4', '2026-06-01', TRUE),
  ('Vignesh Baskar', '21CS010', 'vignesh.baskar@student.edu', 'IoT Development', 'CERT-2026-D5E6F7', '2026-06-01', TRUE),
  ('Yamini Chandran', '21CS011', 'yamini.chandran@student.edu', 'FullStack Development', 'CERT-2026-G8H9J3', '2026-06-01', FALSE),
  ('Arun Prasath', '21CS012', 'arun.prasath@student.edu', 'Frontend Development', 'CERT-2026-K4L5M6', '2026-06-01', TRUE)
ON DUPLICATE KEY UPDATE register_number = register_number;
