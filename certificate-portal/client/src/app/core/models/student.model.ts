export const COURSE_OPTIONS = [
  'FullStack Development',
  'Frontend Development',
  'Backend Development',
  'AI Development',
  'IoT Development',
] as const;

export type CourseOption = (typeof COURSE_OPTIONS)[number];

export interface Student {
  id: number;
  name: string;
  registerNumber: string;
  email: string;
  course: string;
  certificateId: string;
  issueDate: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Raw shape returned directly by the MySQL-backed API (snake_case columns). */
export interface StudentApiRow {
  id: number;
  name: string;
  register_number: string;
  email: string;
  course: string;
  certificate_id: string;
  issue_date: string;
  is_verified: number | boolean;
  created_at: string;
  updated_at: string;
}

export function mapStudentRow(row: StudentApiRow): Student {
  return {
    id: row.id,
    name: row.name,
    registerNumber: row.register_number,
    email: row.email,
    course: row.course,
    certificateId: row.certificate_id,
    issueDate: row.issue_date,
    isVerified: !!row.is_verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
