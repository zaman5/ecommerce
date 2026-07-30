import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// A 401 from these means "those credentials were wrong", not "your session
// expired" — the page asking is already showing the error, so leave it alone.
// Logging out and redirecting here would also wipe the ?redirect= parameter
// and send the user somewhere unexpected after they retype their password.
const CREDENTIAL_ENDPOINTS = ['/auth/login', '/auth/register'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;

  const request = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((err) => {
      const isCredentialCheck = CREDENTIAL_ENDPOINTS.some((path) => req.url.includes(path));
      // Only an authenticated request coming back 401 means the session died.
      if (err.status === 401 && !isCredentialCheck && auth.isLoggedIn()) {
        auth.logout();
        router.navigate(['/login'], { queryParams: { redirect: router.url } });
      }
      return throwError(() => err);
    })
  );
};
