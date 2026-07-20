import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { Student, StudentApiRow, mapStudentRow } from '../models/student.model';
import { rethrowBlobError } from '../utils/blob-error.util';

@Injectable({ providedIn: 'root' })
export class StudentService {
  constructor(private readonly http: HttpClient) {}

  getMe(): Observable<Student> {
    return this.http
      .get<{ student: StudentApiRow }>(`${API_BASE_URL}/student/me`)
      .pipe(map((res) => mapStudentRow(res.student)));
  }

  downloadMyCertificate(): Observable<Blob> {
    return this.http
      .get(`${API_BASE_URL}/student/me/certificate`, { responseType: 'blob' })
      .pipe(catchError(rethrowBlobError));
  }
}
