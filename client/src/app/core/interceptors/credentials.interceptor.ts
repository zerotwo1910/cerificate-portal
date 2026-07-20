import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Ensures every request carries the session cookie, which is required
 * because the Angular dev server (localhost:4200) and the Express API
 * (localhost:4000) are different origins.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({ withCredentials: true }));
};
