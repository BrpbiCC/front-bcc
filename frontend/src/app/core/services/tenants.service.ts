import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BackendTenant {
  id: string;
  name?: string;
  nombre?: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  active?: boolean;
  isActive?: boolean;
  status?: string;
  usersCount?: number;
  userCount?: number;
  usuarios?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendTenantsResponse {
  tenants?: BackendTenant[];
  data?: BackendTenant[];
  items?: BackendTenant[];
  result?: BackendTenant | BackendTenant[];
  tenant?: BackendTenant;
}

type TenantsApiResponse = BackendTenant[] | BackendTenant | BackendTenantsResponse;

export interface CreateTenantRequest {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
}

export interface UpdateTenantRequest {
  name?: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TenantsService {
  private readonly apiUrl = `${environment.apiUrl}/tenants`;

  constructor(private http: HttpClient) {}

  getTenants(): Observable<BackendTenant[]> {
    return this.http.get<TenantsApiResponse>(this.apiUrl).pipe(
      map((response) => this.normalizeTenantsResponse(response)),
      catchError(() => of([])),
    );
  }

  getTenantById(id: string): Observable<BackendTenant> {
    return this.http.get<BackendTenant>(`${this.apiUrl}/${id}`);
  }

  createTenant(payload: CreateTenantRequest): Observable<BackendTenant> {
    return this.http.post<BackendTenant>(this.apiUrl, payload);
  }

  updateTenant(id: string, payload: UpdateTenantRequest): Observable<BackendTenant> {
    return this.http.put<BackendTenant>(`${this.apiUrl}/${id}`, payload);
  }

  deleteTenant(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private normalizeTenantsResponse(response: TenantsApiResponse): BackendTenant[] {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response;
    }

    if (this.isBackendTenant(response)) {
      return [response];
    }

    if (Array.isArray(response.tenants)) {
      return response.tenants;
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

    if (response.tenant && this.isBackendTenant(response.tenant)) {
      return [response.tenant];
    }

    if (response.result && this.isBackendTenant(response.result)) {
      return [response.result];
    }

    return [];
  }

  private isBackendTenant(value: unknown): value is BackendTenant {
    return typeof value === 'object' && value !== null && 'id' in value;
  }
}