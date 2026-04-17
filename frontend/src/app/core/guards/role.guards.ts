import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, type UserRole } from '../services/auth.service';

export const roleGuard = (allowedRoles: UserRole[]) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const role = authService.getRole();

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  if (role && allowedRoles.includes(role)) {
    return true; // tiene permiso, entra
  }

  return router.createUrlTree(['/unauthorized']); // no tiene permiso
};