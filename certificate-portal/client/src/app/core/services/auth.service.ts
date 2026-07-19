import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { SessionUser } from '../models/session-user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserSubject = new BehaviorSubject<SessionUser | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  /** Cached "am I logged in" check so a page refresh restores the session once, not per-guard. */
  private sessionCheck$: Observable<SessionUser | null> | null = null;

  constructor(private readonly http: HttpClient) {}

  get currentUser(): SessionUser | null {
    return this.currentUserSubject.value;
  }

  /** Restores the session from the server (cookie-based) exactly once per page load. */
  ensureSessionLoaded(): Observable<SessionUser | null> {
    if (this.currentUserSubject.value) {
      return of(this.currentUserSubject.value);
    }
    if (!this.sessionCheck$) {
      this.sessionCheck$ = this.http.get<{ user: SessionUser }>(`${API_BASE_URL}/auth/me`).pipe(
        map((res) => res.user),
        tap((user) => this.currentUserSubject.next(user)),
        catchError(() => {
          this.currentUserSubject.next(null);
          return of(null);
        }),
        shareReplay(1)
      );
    }
    return this.sessionCheck$;
  }

  loginAdmin(username: string, password: string): Observable<SessionUser> {
    return this.http
      .post<{ user: SessionUser }>(`${API_BASE_URL}/auth/admin/login`, { username, password })
      .pipe(
        map((res) => res.user),
        tap((user) => this.setSession(user))
      );
  }

  loginTeacher(email: string, password: string): Observable<SessionUser> {
    return this.http
      .post<{ user: SessionUser }>(`${API_BASE_URL}/auth/teacher/login`, { email, password })
      .pipe(
        map((res) => res.user),
        tap((user) => this.setSession(user))
      );
  }

  loginStudent(registerNumber: string, email: string): Observable<SessionUser> {
    return this.http
      .post<{ user: SessionUser }>(`${API_BASE_URL}/auth/student/login`, {
        registerNumber,
        email,
      })
      .pipe(
        map((res) => res.user),
        tap((user) => this.setSession(user))
      );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/auth/logout`, {}).pipe(
      tap(() => {
        this.currentUserSubject.next(null);
        this.sessionCheck$ = null;
      })
    );
  }

  /**
   * Clears the locally cached session without calling the logout API —
   * used when the server has already told us the session is invalid/stale
   * (see authErrorInterceptor) so there's nothing left to log out of.
   */
  clearLocalSession(): void {
    this.currentUserSubject.next(null);
    this.sessionCheck$ = null;
  }

  private setSession(user: SessionUser): void {
    this.currentUserSubject.next(user);
    this.sessionCheck$ = of(user);
  }
}
