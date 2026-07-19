import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { Student, StudentApiRow, mapStudentRow } from '../models/student.model';
import { Teacher, TeacherApiRow, mapTeacherRow } from '../models/teacher.model';
import { rethrowBlobError } from '../utils/blob-error.util';

export interface CreateStudentPayload {
  name: string;
  registerNumber: string;
  email: string;
  course: string;
  issueDate?: string;
}

export interface UpdateStudentPayload extends Partial<CreateStudentPayload> {
  isVerified?: boolean;
}

export interface CreateTeacherPayload {
  name: string;
  email: string;
  password: string;
  department?: string;
}

export interface UpdateTeacherPayload {
  name: string;
  email: string;
  department?: string;
  password?: string; // optional — omit/blank to keep the current password
}

export interface BulkUploadRowResult {
  row: number;
  reason?: string;
  name?: string;
  registerNumber?: string;
  email?: string;
}

export interface BulkUploadSummary {
  createdCount: number;
  skippedCount: number;
  created: BulkUploadRowResult[];
  skipped: BulkUploadRowResult[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private readonly http: HttpClient) {}

  // --- Students ---

  getStudents(): Observable<Student[]> {
    return this.http
      .get<{ students: StudentApiRow[] }>(`${API_BASE_URL}/admin/students`)
      .pipe(map((res) => res.students.map(mapStudentRow)));
  }

  createStudent(payload: CreateStudentPayload): Observable<Student> {
    return this.http
      .post<{ student: StudentApiRow }>(`${API_BASE_URL}/admin/students`, payload)
      .pipe(map((res) => mapStudentRow(res.student)));
  }

  updateStudent(id: number, payload: UpdateStudentPayload): Observable<Student> {
    return this.http
      .put<{ student: StudentApiRow }>(`${API_BASE_URL}/admin/students/${id}`, payload)
      .pipe(map((res) => mapStudentRow(res.student)));
  }

  deleteStudent(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/admin/students/${id}`);
  }

  setStudentVerified(id: number, isVerified: boolean): Observable<void> {
    return this.http.patch<void>(`${API_BASE_URL}/admin/students/${id}/verify`, { isVerified });
  }

  bulkUploadStudents(file: File): Observable<BulkUploadSummary> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<BulkUploadSummary>(`${API_BASE_URL}/admin/students/bulk-upload`, formData)
      .pipe(catchError(rethrowBlobError));
  }

  bulkDeleteStudents(ids: number[]): Observable<{ deletedCount: number }> {
    return this.http.post<{ deletedCount: number }>(`${API_BASE_URL}/admin/students/bulk-delete`, {
      ids,
    });
  }

  // --- Teachers ---

  getTeachers(): Observable<Teacher[]> {
    return this.http
      .get<{ teachers: TeacherApiRow[] }>(`${API_BASE_URL}/admin/teachers`)
      .pipe(map((res) => res.teachers.map(mapTeacherRow)));
  }

  createTeacher(payload: CreateTeacherPayload): Observable<Teacher> {
    return this.http
      .post<{ teacher: TeacherApiRow }>(`${API_BASE_URL}/admin/teachers`, payload)
      .pipe(map((res) => mapTeacherRow(res.teacher)));
  }

  updateTeacher(id: number, payload: UpdateTeacherPayload): Observable<Teacher> {
    return this.http
      .put<{ teacher: TeacherApiRow }>(`${API_BASE_URL}/admin/teachers/${id}`, payload)
      .pipe(map((res) => mapTeacherRow(res.teacher)));
  }

  bulkUploadTeachers(file: File): Observable<BulkUploadSummary> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<BulkUploadSummary>(`${API_BASE_URL}/admin/teachers/bulk-upload`, formData)
      .pipe(catchError(rethrowBlobError));
  }

  setTeacherVerified(id: number, isVerified: boolean): Observable<void> {
    return this.http.patch<void>(`${API_BASE_URL}/admin/teachers/${id}/verify`, { isVerified });
  }

  setTeacherBulkPermission(id: number, canBulkDownload: boolean): Observable<void> {
    return this.http.patch<void>(`${API_BASE_URL}/admin/teachers/${id}/bulk-permission`, {
      canBulkDownload,
    });
  }

  deleteTeacher(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/admin/teachers/${id}`);
  }
}
