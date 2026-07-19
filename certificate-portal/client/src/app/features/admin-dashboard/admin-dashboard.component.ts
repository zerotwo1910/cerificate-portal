import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { AdminService, BulkUploadSummary } from '../../core/services/admin.service';
import { Student, COURSE_OPTIONS } from '../../core/models/student.model';
import { Teacher } from '../../core/models/teacher.model';
import { CertificateFormValidators } from '../../core/validators/certificate-form.validators';

type AdminTab = 'students' | 'teachers';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  readonly courseOptions = COURSE_OPTIONS;
  activeTab: AdminTab = 'students';

  students: Student[] = [];
  teachers: Teacher[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  showStudentForm = false;
  editingStudentId: number | null = null;

  showTeacherForm = false;
  editingTeacherId: number | null = null;

  // --- Bulk upload state ---
  studentUploadFile: File | null = null;
  isUploadingStudents = false;
  studentUploadSummary: BulkUploadSummary | null = null;

  teacherUploadFile: File | null = null;
  isUploadingTeachers = false;
  teacherUploadSummary: BulkUploadSummary | null = null;

  // --- Bulk delete state ---
  selectedStudentIds = new Set<number>();
  isBulkDeleting = false;

  readonly studentForm: ReturnType<AdminDashboardComponent['buildStudentForm']>;
  readonly teacherForm: ReturnType<AdminDashboardComponent['buildTeacherForm']>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.studentForm = this.buildStudentForm();
    this.teacherForm = this.buildTeacherForm();
  }

  private buildStudentForm() {
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

  private buildTeacherForm() {
    return this.fb.nonNullable.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]],
      department: [''],
    });
  }

  get currentUserName(): string {
    return this.authService.currentUser?.name ?? 'Admin';
  }

  get verifiedStudentsCount(): number {
    return this.students.filter((s) => s.isVerified).length;
  }

  get pendingTeachersCount(): number {
    return this.teachers.filter((t) => !t.isVerified).length;
  }

  ngOnInit(): void {
    this.loadStudents();
    this.loadTeachers();
  }

  setTab(tab: AdminTab): void {
    this.activeTab = tab;
    this.clearMessages();
  }

  logout(): void {
    this.authService.logout().subscribe(() => this.router.navigate(['/login']));
  }

  // --- Students ---

  loadStudents(): void {
    this.isLoading = true;
    this.adminService.getStudents().subscribe({
      next: (students) => {
        this.students = students;
        this.isLoading = false;
        // Drop any selected ids that no longer exist (e.g. after a delete/reload).
        const validIds = new Set(students.map((s) => s.id));
        for (const id of this.selectedStudentIds) {
          if (!validIds.has(id)) this.selectedStudentIds.delete(id);
        }
      },
      error: () => {
        this.errorMessage = 'Could not load students.';
        this.isLoading = false;
      },
    });
  }

  openAddStudentForm(): void {
    this.editingStudentId = null;
    this.studentForm.reset({ name: '', registerNumber: '', email: '', course: '' });
    this.showStudentForm = true;
    this.clearMessages();
  }

  openEditStudentForm(student: Student): void {
    this.editingStudentId = student.id;
    this.studentForm.setValue({
      name: student.name,
      registerNumber: student.registerNumber,
      email: student.email,
      course: student.course,
    });
    this.showStudentForm = true;
    this.clearMessages();
  }

  cancelStudentForm(): void {
    this.showStudentForm = false;
    this.editingStudentId = null;
  }

  submitStudentForm(): void {
    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
      return;
    }
    const value = this.studentForm.getRawValue();
    this.clearMessages();

    if (this.editingStudentId) {
      this.adminService.updateStudent(this.editingStudentId, value).subscribe({
        next: () => {
          this.successMessage = 'Student updated.';
          this.showStudentForm = false;
          this.loadStudents();
        },
        error: (err) => (this.errorMessage = err?.error?.error || 'Update failed.'),
      });
    } else {
      this.adminService.createStudent(value).subscribe({
        next: () => {
          this.successMessage = 'Student created.';
          this.showStudentForm = false;
          this.loadStudents();
        },
        error: (err) => (this.errorMessage = err?.error?.error || 'Create failed.'),
      });
    }
  }

  deleteStudent(student: Student): void {
    if (!confirm(`Delete ${student.name}'s record? This cannot be undone.`)) return;
    this.adminService.deleteStudent(student.id).subscribe({
      next: () => this.loadStudents(),
      error: () => (this.errorMessage = 'Delete failed.'),
    });
  }

  toggleStudentVerified(student: Student): void {
    this.adminService.setStudentVerified(student.id, !student.isVerified).subscribe({
      next: () => this.loadStudents(),
      error: () => (this.errorMessage = 'Could not update verification status.'),
    });
  }

  fieldError(control: AbstractControl | null): string | null {
    if (!control || !control.touched || control.valid) return null;
    const errors = control.errors ?? {};
    if (errors['required']) return 'Required.';
    if (errors['maxlength']) return `Max ${errors['maxlength'].requiredLength} characters.`;
    if (errors['minlength']) return `At least ${errors['minlength'].requiredLength} characters.`;
    if (errors['email']) return 'Enter a valid email.';
    if (errors['invalidCharacters']) return errors['invalidCharacters'];
    return 'Invalid value.';
  }

  // --- Bulk upload students ---

  onStudentFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.studentUploadFile = input.files?.[0] ?? null;
    this.studentUploadSummary = null;
    this.clearMessages();
  }

  uploadStudentsFile(): void {
    if (!this.studentUploadFile) {
      this.errorMessage = 'Choose a CSV or Excel file first.';
      return;
    }
    this.clearMessages();
    this.isUploadingStudents = true;
    this.adminService.bulkUploadStudents(this.studentUploadFile).subscribe({
      next: (summary) => {
        this.studentUploadSummary = summary;
        this.isUploadingStudents = false;
        this.studentUploadFile = null;
        this.successMessage = `${summary.createdCount} student(s) added${
          summary.skippedCount ? `, ${summary.skippedCount} skipped (see details below).` : '.'
        }`;
        this.loadStudents();
      },
      error: (err) => {
        this.isUploadingStudents = false;
        this.errorMessage = err?.error?.error || 'Bulk upload failed.';
      },
    });
  }

  // --- Bulk delete students ---

  get isAllStudentsSelected(): boolean {
    return this.students.length > 0 && this.selectedStudentIds.size === this.students.length;
  }

  get isSomeStudentsSelected(): boolean {
    return this.selectedStudentIds.size > 0 && !this.isAllStudentsSelected;
  }

  toggleSelectAllStudents(): void {
    if (this.isAllStudentsSelected) {
      this.selectedStudentIds.clear();
    } else {
      this.selectedStudentIds = new Set(this.students.map((s) => s.id));
    }
  }

  toggleStudentSelection(id: number): void {
    if (this.selectedStudentIds.has(id)) {
      this.selectedStudentIds.delete(id);
    } else {
      this.selectedStudentIds.add(id);
    }
  }

  bulkDeleteSelectedStudents(): void {
    const ids = Array.from(this.selectedStudentIds);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected student record(s)? This cannot be undone.`)) return;

    this.clearMessages();
    this.isBulkDeleting = true;
    this.adminService.bulkDeleteStudents(ids).subscribe({
      next: (res) => {
        this.isBulkDeleting = false;
        this.successMessage = `${res.deletedCount} student(s) deleted.`;
        this.selectedStudentIds.clear();
        this.loadStudents();
      },
      error: (err) => {
        this.isBulkDeleting = false;
        this.errorMessage = err?.error?.error || 'Bulk delete failed.';
      },
    });
  }

  // --- Teachers ---

  loadTeachers(): void {
    this.adminService.getTeachers().subscribe({
      next: (teachers) => (this.teachers = teachers),
      error: () => (this.errorMessage = 'Could not load teachers.'),
    });
  }

  openAddTeacherForm(): void {
    this.editingTeacherId = null;
    this.teacherForm.reset({ name: '', email: '', password: '', department: '' });
    this.showTeacherForm = true;
    this.clearMessages();
  }

  openEditTeacherForm(teacher: Teacher): void {
    this.editingTeacherId = teacher.id;
    this.teacherForm.setValue({
      name: teacher.name,
      email: teacher.email,
      password: '',
      department: teacher.department ?? '',
    });
    this.showTeacherForm = true;
    this.clearMessages();
  }

  cancelTeacherForm(): void {
    this.showTeacherForm = false;
    this.editingTeacherId = null;
  }

  submitTeacherForm(): void {
    if (this.teacherForm.invalid) {
      this.teacherForm.markAllAsTouched();
      return;
    }

    const value = this.teacherForm.getRawValue();
    this.clearMessages();

    if (this.editingTeacherId) {
      const payload = { ...value, password: value.password?.trim() || undefined };
      this.adminService.updateTeacher(this.editingTeacherId, payload).subscribe({
        next: () => {
          this.successMessage = 'Teacher updated.';
          this.showTeacherForm = false;
          this.editingTeacherId = null;
          this.loadTeachers();
        },
        error: (err) => (this.errorMessage = err?.error?.error || 'Update failed.'),
      });
    } else {
      if (!value.password) {
        this.teacherForm.get('password')?.setErrors({ required: true });
        this.teacherForm.get('password')?.markAsTouched();
        return;
      }
      this.adminService.createTeacher({ ...value, password: value.password }).subscribe({
        next: () => {
          this.successMessage = 'Teacher account created. They are pending verification.';
          this.showTeacherForm = false;
          this.loadTeachers();
        },
        error: (err) => (this.errorMessage = err?.error?.error || 'Create failed.'),
      });
    }
  }

  toggleTeacherVerified(teacher: Teacher): void {
    this.adminService.setTeacherVerified(teacher.id, !teacher.isVerified).subscribe({
      next: () => this.loadTeachers(),
      error: () => (this.errorMessage = 'Could not update verification status.'),
    });
  }

  toggleTeacherBulkPermission(teacher: Teacher): void {
    this.adminService.setTeacherBulkPermission(teacher.id, !teacher.canBulkDownload).subscribe({
      next: () => this.loadTeachers(),
      error: () => (this.errorMessage = 'Could not update bulk download permission.'),
    });
  }

  deleteTeacher(teacher: Teacher): void {
    if (!confirm(`Delete ${teacher.name}'s account? This cannot be undone.`)) return;
    this.adminService.deleteTeacher(teacher.id).subscribe({
      next: () => this.loadTeachers(),
      error: () => (this.errorMessage = 'Delete failed.'),
    });
  }

  // --- Bulk upload teachers ---

  onTeacherFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.teacherUploadFile = input.files?.[0] ?? null;
    this.teacherUploadSummary = null;
    this.clearMessages();
  }

  uploadTeachersFile(): void {
    if (!this.teacherUploadFile) {
      this.errorMessage = 'Choose a CSV or Excel file first.';
      return;
    }
    this.clearMessages();
    this.isUploadingTeachers = true;
    this.adminService.bulkUploadTeachers(this.teacherUploadFile).subscribe({
      next: (summary) => {
        this.teacherUploadSummary = summary;
        this.isUploadingTeachers = false;
        this.teacherUploadFile = null;
        this.successMessage = `${summary.createdCount} teacher(s) added${
          summary.skippedCount ? `, ${summary.skippedCount} skipped (see details below).` : '.'
        }`;
        this.loadTeachers();
      },
      error: (err) => {
        this.isUploadingTeachers = false;
        this.errorMessage = err?.error?.error || 'Bulk upload failed.';
      },
    });
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
