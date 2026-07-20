import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { StudentService } from '../../core/services/student.service';
import { Student } from '../../core/models/student.model';
import { downloadBlob } from '../../core/utils/download.util';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.scss',
})
export class StudentDashboardComponent implements OnInit {
  student: Student | null = null;
  isLoading = true;
  isDownloading = false;
  errorMessage = '';

  constructor(
    private readonly studentService: StudentService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  get currentUserName(): string {
    return this.authService.currentUser?.name ?? 'Student';
  }

  ngOnInit(): void {
    this.studentService.getMe().subscribe({
      next: (student) => {
        this.student = student;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Could not load your record.';
        this.isLoading = false;
      },
    });
  }

  logout(): void {
    this.authService.logout().subscribe(() => this.router.navigate(['/login']));
  }

  download(): void {
    if (!this.student) return;
    this.errorMessage = '';
    this.isDownloading = true;
    this.studentService.downloadMyCertificate().subscribe({
      next: (blob) => {
        downloadBlob(blob, `${this.student!.certificateId}.pdf`);
        this.isDownloading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || 'Could not download certificate.';
        this.isDownloading = false;
      },
    });
  }
}
