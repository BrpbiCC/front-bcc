import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BackendUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: unknown;
  roles?: unknown;
  tenantId: string | null;
  phone: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BackendUsersResponse {
  users?: BackendUser[];
  data?: BackendUser[];
  items?: BackendUser[];
  result?: BackendUser | BackendUser[];
  user?: BackendUser;
}

type UsersApiResponse = BackendUser[] | BackendUser | BackendUsersResponse;

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId?: string;
  phone?: string;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  phone?: string;
  active?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getUsers(): Observable<BackendUser[]> {
    return this.http.get<UsersApiResponse>(this.apiUrl).pipe(
      map((response) => this.normalizeUsersResponse(response)),
      catchError(() => of([])),
    );
  }

  createUser(payload: CreateUserRequest): Observable<BackendUser> {
    return this.http.post<BackendUser>(this.apiUrl, payload);
  }

  updateUser(id: string, payload: UpdateUserRequest): Observable<BackendUser> {
    return this.http.patch<BackendUser>(`${this.apiUrl}/${id}`, payload);
  }

  deactivateUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Backward-compatible alias while the component names are migrated.
  deleteUser(id: string): Observable<void> {
    return this.deactivateUser(id);
  }

  private normalizeUsersResponse(response: UsersApiResponse): BackendUser[] {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response;
    }

    if (this.isBackendUser(response)) {
      return [response];
    }

    if (Array.isArray(response.users)) {
      return response.users;
    }

    if (Array.isArray(response.data)) {
      return response.data;
    }

    if (Array.isArray(response.items)) {
      return response.items;
    }

    if (Array.isArray(response.result)) {
      return response.result;
    }

    if (response.result && this.isBackendUser(response.result)) {
      return [response.result];
    }

    if (response.user && this.isBackendUser(response.user)) {
      return [response.user];
    }

    return [];
  }

  private isBackendUser(value: unknown): value is BackendUser {
    return typeof value === 'object' && value !== null && 'id' in value;
  }
}