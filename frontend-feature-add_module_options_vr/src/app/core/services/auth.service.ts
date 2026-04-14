import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * User roles from backend:
 * - ADMIN: Full access, can manage all locales and users
 * - SUPPORT: Technical support access
 * - SUPER_ADMIN: System administrator (excluded from map access)
 */
export type UserRole = 'admin' | 'support' | 'super-admin';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginUserResponse {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  nombre?: string;
  displayName?: string;
  username?: string;
  role?: unknown;
  roles?: unknown;
  tenantId?: string;
  tenant?: { id?: string; name?: string } | string;
}

interface LoginResponse {
  token?: string;
  accessToken?: string;
  access_token?: string;
  jwt?: string;
  tenantId?: string;
  role?: unknown;
  roles?: unknown;
  user?: LoginUserResponse;
  data?: {
    token?: string;
    accessToken?: string;
    access_token?: string;
    jwt?: string;
    tenantId?: string;
    role?: unknown;
    roles?: unknown;
    user?: LoginUserResponse;
  };
}

export interface AuthSession {
  token: string;
  role: UserRole;
  tenantId: string | null;
  userName: string;
  userEmail: string;
  userId: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly storageKeys = {
    token: 'authToken',
    role: 'userRole',
    tenantId: 'tenantId',
    userName: 'userName',
    userEmail: 'userEmail',
    userId: 'userId',
  } as const;

  private roleSubject = new BehaviorSubject<UserRole | null>(this.getRoleFromStorage());
  public role$ = this.roleSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<AuthSession> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, {
        email: credentials.email,
        password: credentials.password,
      })
      .pipe(
        map((response) => this.persistSessionFromLogin(response)),
        tap((session) => {
          this.roleSubject.next(session.role);
        }),
      );
  }

  setRole(roleInput: string): void {
    const normalizedRole = this.normalizeRole(roleInput);
    if (!normalizedRole) {
      return;
    }

    sessionStorage.setItem(this.storageKeys.role, normalizedRole);
    this.roleSubject.next(normalizedRole);
  }

  getRole(): UserRole | null {
    return this.roleSubject.value;
  }

  getToken(): string | null {
    return this.getSessionValue(this.storageKeys.token);
  }

  getTenantId(): string | null {
    return this.getSessionValue(this.storageKeys.tenantId);
  }

  getDashboardRoute(role: UserRole | null = this.getRole()): string {
    if (role === 'support') {
      return '/dashboard/support';
    }

    if (role === 'super-admin') {
      return '/dashboard/superadmin';
    }

    if (role === 'admin') {
      return '/dashboard/admin';
    }

    return '/dashboard/admin';
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    sessionStorage.removeItem(this.storageKeys.token);
    sessionStorage.removeItem(this.storageKeys.role);
    sessionStorage.removeItem(this.storageKeys.tenantId);
    sessionStorage.removeItem(this.storageKeys.userName);
    sessionStorage.removeItem(this.storageKeys.userEmail);
    sessionStorage.removeItem(this.storageKeys.userId);
    this.roleSubject.next(null);
  }

  private persistSessionFromLogin(response: LoginResponse): AuthSession {
    const token = this.extractToken(response);
    const role = this.resolveRole(response, token);
    const tenantId = this.extractTenantId(response);
    const needsTenant = role !== 'super-admin';

    if (!role || !token || (needsTenant && !tenantId)) {
      throw new Error('La respuesta del login no contiene token, rol o tenant válidos para el tipo de usuario.');
    }

    const user = this.extractUser(response);
    const userName = this.extractUserName(user);
    const userEmail = (user.email ?? '').trim();
    const userId = (user.id ?? '').trim();

    sessionStorage.setItem(this.storageKeys.token, token);
    sessionStorage.setItem(this.storageKeys.role, role);

    if (tenantId) {
      sessionStorage.setItem(this.storageKeys.tenantId, tenantId);
    } else {
      sessionStorage.removeItem(this.storageKeys.tenantId);
    }

    if (userName) {
      sessionStorage.setItem(this.storageKeys.userName, userName);
    }

    if (userEmail) {
      sessionStorage.setItem(this.storageKeys.userEmail, userEmail);
    }

    if (userId) {
      sessionStorage.setItem(this.storageKeys.userId, userId);
    }

    return {
      token,
      role,
      tenantId: tenantId ?? null,
      userName,
      userEmail,
      userId,
    };
  }

  private extractToken(response: LoginResponse): string | null {
    const candidates = [
      response.token,
      response.accessToken,
      response.access_token,
      response.jwt,
      response.data?.token,
      response.data?.accessToken,
      response.data?.access_token,
      response.data?.jwt,
    ];

    return this.firstNonEmptyString(candidates);
  }

  private extractUser(response: LoginResponse): LoginUserResponse {
    return response.user ?? response.data?.user ?? {};
  }

  private extractTenantId(response: LoginResponse): string | null {
    const user = this.extractUser(response);
    const tenantFromObject = typeof user.tenant === 'object' ? user.tenant?.id : null;
    const tenantFromString = typeof user.tenant === 'string' ? user.tenant : null;

    return this.firstNonEmptyString([
      response.tenantId,
      response.data?.tenantId,
      user.tenantId,
      tenantFromObject,
      tenantFromString,
    ]);
  }

  private resolveRole(response: LoginResponse, token: string | null): UserRole | null {
    const user = this.extractUser(response);

    const rawCandidates: unknown[] = [
      response.role,
      response.roles,
      response.data?.role,
      response.data?.roles,
      user.role,
      user.roles,
      ...this.extractRolesFromToken(token),
    ];

    const normalizedCandidates = rawCandidates
      .flatMap((candidate) => this.flattenRoleValues(candidate))
      .map((roleValue) => this.normalizeRole(roleValue))
      .filter((role): role is UserRole => role !== null);

    if (normalizedCandidates.includes('super-admin')) {
      return 'super-admin';
    }

    if (normalizedCandidates.includes('admin')) {
      return 'admin';
    }

    if (normalizedCandidates.includes('support')) {
      return 'support';
    }

    return null;
  }

  private extractRolesFromToken(token: string | null): string[] {
    if (!token) {
      return [];
    }

    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) {
        return [];
      }

      const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
      const payloadJson = atob(normalized + padding);
      const payload = JSON.parse(payloadJson) as Record<string, unknown>;

      return [
        ...this.flattenRoleValues(payload['role']),
        ...this.flattenRoleValues(payload['roles']),
        ...this.flattenRoleValues(payload['authorities']),
        ...this.flattenRoleValues(payload['authority']),
        ...this.flattenRoleValues(payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']),
      ];
    } catch {
      return [];
    }
  }

  private flattenRoleValues(value: unknown): string[] {
    if (!value) {
      return [];
    }

    if (typeof value === 'string') {
      return value.trim() ? [value.trim()] : [];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => this.flattenRoleValues(item));
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return [
        ...this.flattenRoleValues(record['role']),
        ...this.flattenRoleValues(record['roles']),
        ...this.flattenRoleValues(record['name']),
        ...this.flattenRoleValues(record['code']),
        ...this.flattenRoleValues(record['value']),
      ];
    }

    return [];
  }

  private extractUserName(user: LoginUserResponse): string {
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();

    return (
      this.firstNonEmptyString([
        user.fullName,
        user.displayName,
        user.name,
        user.nombre,
        user.username,
        fullName,
        user.email,
      ]) ?? ''
    );
  }

  private normalizeRole(roleValue: string | null | undefined): UserRole | null {
    if (!roleValue) {
      return null;
    }

    const role = roleValue.trim().toUpperCase().replace(/[\s-]/g, '_');

    if (role === 'SUPER_ADMIN' || role === 'SUPERADMIN' || (role.includes('SUPER') && role.includes('ADMIN'))) {
      return 'super-admin';
    }

    if (role === 'SUPPORT' || role.endsWith('_SUPPORT') || role.includes('SUPPORT')) {
      return 'support';
    }

    if (role === 'ADMIN' || role.endsWith('_ADMIN') || role.includes('ADMIN')) {
      return 'admin';
    }

    return null;
  }

  private firstNonEmptyString(values: Array<string | null | undefined>): string | null {
    for (const value of values) {
      if (value && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  private getSessionValue(key: string): string | null {
    return sessionStorage.getItem(key);
  }

  private getRoleFromStorage(): UserRole | null {
    const role = this.getSessionValue(this.storageKeys.role);
    return this.normalizeRole(role);
  }
}
