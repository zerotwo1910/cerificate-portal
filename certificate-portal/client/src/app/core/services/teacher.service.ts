import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { Student, StudentApiRow, mapStudentRow } from '../models/student.model';
import { rethrowBlobError } from '../utils/blob-error.util';

export interface UpdateStudentPayload {
  name: string;
  registerNumber: string;
  email: string;
  course: string;
  issueDate?: string;
}

@Injectable({ providedIn: 'root' })
export class TeacherService {
  constructor(private readonly http: HttpClient) {}

  getStudents(): Observable<Student[]> {
    return this.http
      .get<{ students: StudentApiRow[] }>(`${API_BASE_URL}/teacher/students`)
      .pipe(map((res) => res.students.map(mapStudentRow)));
  }

  updateStudent(id: number, payload: UpdateStudentPayload): Observable<Student> {
    return this.http
      .put<{ student: StudentApiRow }>(`${API_BASE_URL}/teacher/students/${id}`, payload)
      .pipe(map((res) => mapStudentRow(res.student)));
  }

  downloadCertificate(studentId: number): Observable<Blob> {
    return this.http
      .get(`${API_BASE_URL}/teacher/students/${studentId}/certificate`, { responseType: 'blob' })
      .pipe(catchError(rethrowBlobError));
  }

  bulkDownload(file: File): Observable<Blob> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post(`${API_BASE_URL}/teacher/bulk-download`, formData, { responseType: 'blob' })
      .pipe(catchError(rethrowBlobError));
  }
}
