import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Role } from '../../core/models/session-user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  selectedRole: Role = 'student';
  isSubmitting = false;
  errorMessage = '';
  infoMessage = '';

  readonly adminForm: ReturnType<LoginComponent['buildAdminForm']>;
  readonly teacherForm: ReturnType<LoginComponent['buildTeacherForm']>;
  readonly studentForm: ReturnType<LoginComponent['buildStudentForm']>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.adminForm = this.buildAdminForm();
    this.teacherForm = this.buildTeacherForm();
    this.studentForm = this.buildStudentForm();
  }

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('reason') === 'session') {
      this.infoMessage =
        "You've been signed out — this can happen if a different role logged in via the same browser. Please log in again.";
    }
  }

  private buildAdminForm() {
    return this.fb.nonNullable.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  private buildTeacherForm() {
    return this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  private buildStudentForm() {
    return this.fb.nonNullable.group({
      registerNumber: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  selectRole(role: Role): void {
    this.selectedRole = role;
    this.errorMessage = '';
  }

  submit(): void {
    this.errorMessage = '';

    if (this.selectedRole === 'admin') {
      if (this.adminForm.invalid) return this.adminForm.markAllAsTouched();
      const { username, password } = this.adminForm.getRawValue();
      this.isSubmitting = true;
      this.authService.loginAdmin(username, password).subscribe({
        next: () => this.router.navigate(['/admin']),
        error: (err) => this.handleError(err),
      });
    } else if (this.selectedRole === 'teacher') {
      if (this.teacherForm.invalid) return this.teacherForm.markAllAsTouched();
      const { email, password } = this.teacherForm.getRawValue();
      this.isSubmitting = true;
      this.authService.loginTeacher(email, password).subscribe({
        next: () => this.router.navigate(['/teacher']),
        error: (err) => this.handleError(err),
      });
    } else {
      if (this.studentForm.invalid) return this.studentForm.markAllAsTouched();
      const { registerNumber, email } = this.studentForm.getRawValue();
      this.isSubmitting = true;
      this.authService.loginStudent(registerNumber, email).subscribe({
        next: () => this.router.navigate(['/student']),
        error: (err) => this.handleError(err),
      });
    }
  }

  private handleError(err: any): void {
    this.isSubmitting = false;
    this.errorMessage = err?.error?.error || 'Something went wrong. Please try again.';
  }
}
