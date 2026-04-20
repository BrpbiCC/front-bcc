import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BackendVisit {
  id?: string;
  [key: string]: unknown;
}

interface BackendVisitsResponse {
  visits?: BackendVisit[];
  data?: BackendVisit[];
  items?: BackendVisit[];
  result?: BackendVisit | BackendVisit[];
  visit?: BackendVisit;
}

type VisitsApiResponse = BackendVisit[] | BackendVisit | BackendVisitsResponse;

@Injectable({
  providedIn: 'root',
})
export class VisitsService {
  private readonly apiUrl = `${environment.apiUrl}/visits`;

  constructor(private http: HttpClient) {}

  getVisits(): Observable<BackendVisit[]> {
    return this.http.get<VisitsApiResponse>(this.apiUrl).pipe(
      map((response) => this.normalizeVisitsResponse(response)),
      catchError(() => of([])),
    );
  }

  private normalizeVisitsResponse(response: VisitsApiResponse): BackendVisit[] {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response;
    }

    if (this.isBackendVisit(response)) {
      return [response];
    }

    if (Array.isArray(response.visits)) {
      return response.visits;
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

    if (response.result && this.isBackendVisit(response.result)) {
      return [response.result];
    }

    if (response.visit && this.isBackendVisit(response.visit)) {
      return [response.visit];
    }

    return [];
  }

  private isBackendVisit(value: unknown): value is BackendVisit {
    return typeof value === 'object' && value !== null;
  }
}
