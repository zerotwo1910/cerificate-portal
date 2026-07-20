import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { AdminDashboardComponent } from './features/admin-dashboard/admin-dashboard.component';
import { TeacherDashboardComponent } from './features/teacher-dashboard/teacher-dashboard.component';
import { StudentDashboardComponent } from './features/student-dashboard/student-dashboard.component';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [roleGuard('admin')] },
  { path: 'teacher', component: TeacherDashboardComponent, canActivate: [roleGuard('teacher')] },
  { path: 'student', component: StudentDashboardComponent, canActivate: [roleGuard('student')] },
  { path: '**', redirectTo: 'login' },
];
