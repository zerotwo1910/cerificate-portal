import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/session-user.model';

/**
 * Restores the session (via /api/auth/me) if needed, then allows the route
 * only if the logged-in user's role is in `allowedRoles`. Otherwise redirects
 * to /login.
 */
export function roleGuard(...allowedRoles: Role[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return auth.ensureSessionLoaded().pipe(
      map((user) => {
        if (user && allowedRoles.includes(user.role)) {
          return true;
        }
        return router.createUrlTree(['/login']);
      })
    );
  };
}
