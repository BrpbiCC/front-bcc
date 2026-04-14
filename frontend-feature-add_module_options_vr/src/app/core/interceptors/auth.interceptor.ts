import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const tenantId = authService.getTenantId();

  const isBackendRequest = req.url.startsWith(environment.apiUrl) || req.url.startsWith('/api/');

  if (!isBackendRequest || (!token && !tenantId)) {
    return next(req);
  }

  let headers = req.headers;

  if (token && !headers.has('Authorization')) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  if (tenantId && !headers.has('X-Tenant-Id')) {
    headers = headers.set('X-Tenant-Id', tenantId);
  }

  return next(
    req.clone({
      headers,
    }),
  );
};