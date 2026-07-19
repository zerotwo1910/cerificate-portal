import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { TeacherService } from '../../core/services/teacher.service';
import { Student, COURSE_OPTIONS } from '../../core/models/student.model';
import { CertificateFormValidators } from '../../core/validators/certificate-form.validators';
import { downloadBlob } from '../../core/utils/download.util';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './teacher-dashboard.component.html',
  styleUrl: './teacher-dashboard.component.scss',
})
export class TeacherDashboardComponent implements OnInit {
  readonly courseOptions = COURSE_OPTIONS;

  students: Student[] = [];
  searchTerm = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  isDownloadingId: number | null = null;
  isBulkDownloading = false;
  selectedFile: File | null = null;

  showEditForm = false;
  editingStudentId: number | null = null;
  isSavingEdit = false;

  readonly editForm: ReturnType<TeacherDashboardComponent['buildEditForm']>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly teacherService: TeacherService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.editForm = this.buildEditForm();
  }

  private buildEditForm() {
    return this.fb.nonNullable.group({
      name: [
        '',
        [Validators.required, Validators.maxLength(19), CertificateFormValidators.recipientName()],
      ],
      registerNumber: ['', [Validators.required, CertificateFormValidators.registerNumber()]],
      email: [
        '',
        [Validators.required, Validators.email, CertificateFormValidators.emailAllowedChars()],
      ],
      course: ['', [Validators.required]],
    });
  }

  get currentUserName(): string {
    return this.authService.currentUser?.name ?? 'Teacher';
  }

  get canBulkDownload(): boolean {
    return !!this.authService.currentUser?.canBulkDownload;
  }

  get verifiedStudentsCount(): number {
    return this.students.filter((s) => s.isVerified).length;
  }

  get filteredStudents(): Student[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.students;
    return this.students.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.registerNumber.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term)
    );
  }

  ngOnInit(): void {
    this.loadStudents();
  }

  logout(): void {
    this.authService.logout().subscribe(() => this.router.navigate(['/login']));
  }

  loadStudents(): void {
    this.isLoading = true;
    this.teacherService.getStudents().subscribe({
      next: (students) => {
        this.students = students;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Could not load students.';
        this.isLoading = false;
      },
    });
  }

  downloadSingle(student: Student): void {
    this.clearMessages();
    this.isDownloadingId = student.id;
    this.teacherService.downloadCertificate(student.id).subscribe({
      next: (blob) => {
        downloadBlob(blob, `${student.certificateId}.pdf`);
        this.isDownloadingId = null;
      },
      error: () => {
        this.errorMessage = 'Could not download certificate.';
        this.isDownloadingId = null;
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.clearMessages();
  }

  bulkDownload(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Choose a CSV or Excel file first.';
      return;
    }
    this.clearMessages();
    this.isBulkDownloading = true;
    this.teacherService.bulkDownload(this.selectedFile).subscribe({
      next: (blob) => {
        downloadBlob(blob, 'certificates-bulk.zip');
        this.isBulkDownloading = false;
        this.successMessage = 'Bulk download ready — check the zip for a report of any unmatched entries.';
      },
      error: (err) => {
        this.isBulkDownloading = false;
        this.errorMessage = err?.error?.error || 'Bulk download failed.';
      },
    });
  }

  // --- Edit student ---

  openEditForm(student: Student): void {
    this.editingStudentId = student.id;
    this.editForm.setValue({
      name: student.name,
      registerNumber: student.registerNumber,
      email: student.email,
      course: student.course,
    });
    this.showEditForm = true;
    this.clearMessages();
  }

  cancelEditForm(): void {
    this.showEditForm = false;
    this.editingStudentId = null;
  }

  submitEditForm(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    if (!this.editingStudentId) return;

    this.clearMessages();
    this.isSavingEdit = true;
    const value = this.editForm.getRawValue();
    this.teacherService.updateStudent(this.editingStudentId, value).subscribe({
      next: () => {
        this.isSavingEdit = false;
        this.successMessage = 'Student record updated.';
        this.showEditForm = false;
        this.editingStudentId = null;
        this.loadStudents();
      },
      error: (err) => {
        this.isSavingEdit = false;
        this.errorMessage = err?.error?.error || 'Update failed.';
      },
    });
  }

  editFieldError(fieldName: string): string | null {
    const control = this.editForm.get(fieldName);
    if (!control || !control.touched || control.valid) return null;
    const errors = control.errors ?? {};
    if (errors['required']) return 'Required.';
    if (errors['maxlength']) return `Max ${errors['maxlength'].requiredLength} characters.`;
    if (errors['email']) return 'Enter a valid email.';
    if (errors['invalidCharacters']) return errors['invalidCharacters'];
    return 'Invalid value.';
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
