import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

/**
 * When an HttpClient request uses responseType: 'blob', error responses also
 * arrive as a Blob (even if the server sent JSON). This unwraps that Blob so
 * error.error.error works the same way it does for normal JSON requests.
 */
export function rethrowBlobError(err: HttpErrorResponse): Observable<never> {
  if (err.error instanceof Blob && err.error.type === 'application/json') {
    return new Observable<never>((subscriber) => {
      err.error.text().then((text: string) => {
        let parsed: any = {};
        try {
          parsed = JSON.parse(text);
        } catch {
          // leave parsed as {}
        }
        subscriber.error({ ...err, error: parsed });
      });
    });
  }
  return throwError(() => err);
}
