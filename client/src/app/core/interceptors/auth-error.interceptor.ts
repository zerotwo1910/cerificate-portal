import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * If the backend says "you're not authenticated" (401) or "wrong role for
 * this action" (403, with the exact message the role-guard middleware
 * sends), the local session is stale — most likely because a different
 * role logged in via the same browser cookie in another tab. Rather than
 * letting every dashboard action fail with a confusing permission error,
 * clear the local session and bounce back to the login page.
 */
const STALE_ROLE_MESSAGE = 'You do not have permission to do that.';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && req.url.includes('/api/')) {
        const isUnauthenticated = err.status === 401;
        const isStaleRole = err.status === 403 && err.error?.error === STALE_ROLE_MESSAGE;

        if (isUnauthenticated || isStaleRole) {
          authService.clearLocalSession();
          router.navigate(['/login'], { queryParams: { reason: 'session' } });
        }
      }
      return throwError(() => err);
    })
  );
};
