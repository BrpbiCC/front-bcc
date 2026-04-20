import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BackendSale {
  id: string;
  tenantId: string;
  vendorId: string;
  sectorId: string;
  machineId: string;
  amount: number;
  description: string;
  saleDate: string;
  tenantName?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface BackendSalesResponse {
  sales?: BackendSale[];
  data?: BackendSale[];
  items?: BackendSale[];
  result?: BackendSale | BackendSale[];
  sale?: BackendSale;
}

type SalesApiResponse = BackendSale[] | BackendSale | BackendSalesResponse;

@Injectable({
  providedIn: 'root',
})
export class SalesService {
  private readonly apiUrl = `${environment.apiUrl}/sales`;

  constructor(private http: HttpClient) {}

  getSales(): Observable<BackendSale[]> {
    return this.http.get<SalesApiResponse>(this.apiUrl).pipe(
      map((response) => this.normalizeSalesResponse(response)),
      catchError(() => of([])),
    );
  }

  private normalizeSalesResponse(response: SalesApiResponse): BackendSale[] {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response;
    }

    if (this.isBackendSale(response)) {
      return [response];
    }

    if (Array.isArray(response.sales)) {
      return response.sales;
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

    if (response.result && this.isBackendSale(response.result)) {
      return [response.result];
    }

    if (response.sale && this.isBackendSale(response.sale)) {
      return [response.sale];
    }

    return [];
  }

  private isBackendSale(value: unknown): value is BackendSale {
    return typeof value === 'object' && value !== null && 'id' in value;
  }
}
