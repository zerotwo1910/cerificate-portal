export type Role = 'admin' | 'teacher' | 'student';

export interface SessionUser {
  id: number;
  role: Role;
  name: string;
  username?: string; // admin
  email?: string; // teacher / student
  registerNumber?: string; // student
  canBulkDownload?: boolean; // teacher
}
