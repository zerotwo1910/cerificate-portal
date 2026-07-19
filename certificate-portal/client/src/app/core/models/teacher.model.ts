export interface Teacher {
  id: number;
  name: string;
  email: string;
  department: string | null;
  isVerified: boolean;
  canBulkDownload: boolean;
  createdAt: string;
}

export interface TeacherApiRow {
  id: number;
  name: string;
  email: string;
  department: string | null;
  is_verified: number | boolean;
  can_bulk_download: number | boolean;
  created_at: string;
}

export function mapTeacherRow(row: TeacherApiRow): Teacher {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    department: row.department,
    isVerified: !!row.is_verified,
    canBulkDownload: !!row.can_bulk_download,
    createdAt: row.created_at,
  };
}
