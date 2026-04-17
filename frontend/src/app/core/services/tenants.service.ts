import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    return this.http.get<BackendTenant[]>(this.apiUrl);
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
}