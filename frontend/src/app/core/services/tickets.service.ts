import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BackendTicket {
  id: string;
  tenantId: string;
  machineId: string;
  reportedById: string;
  assignedToId: string | null;
  priority: 'low' | 'medium' | 'high' | string;
  status: string;
  title: string;
  description: string;
  tenantName?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface BackendTicketsResponse {
  tickets?: BackendTicket[];
  data?: BackendTicket[];
  items?: BackendTicket[];
  result?: BackendTicket | BackendTicket[];
  ticket?: BackendTicket;
}

type TicketsApiResponse = BackendTicket[] | BackendTicket | BackendTicketsResponse;

@Injectable({
  providedIn: 'root',
})
export class TicketsService {
  private readonly apiUrl = `${environment.apiUrl}/tickets`;

  constructor(private http: HttpClient) {}

  getTickets(): Observable<BackendTicket[]> {
    return this.http.get<TicketsApiResponse>(this.apiUrl).pipe(
      map((response) => this.normalizeTicketsResponse(response)),
      catchError(() => of([])),
    );
  }

  getTicketById(id: string): Observable<BackendTicket | null> {
    return this.http.get<TicketsApiResponse>(`${this.apiUrl}/${id}`).pipe(
      map((response) => this.normalizeSingleTicketResponse(response)),
      catchError(() => of(null)),
    );
  }

  private normalizeTicketsResponse(response: TicketsApiResponse): BackendTicket[] {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response;
    }

    if (this.isBackendTicket(response)) {
      return [response];
    }

    if (Array.isArray(response.tickets)) {
      return response.tickets;
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

    if (response.result && this.isBackendTicket(response.result)) {
      return [response.result];
    }

    if (response.ticket && this.isBackendTicket(response.ticket)) {
      return [response.ticket];
    }

    return [];
  }

  private normalizeSingleTicketResponse(response: TicketsApiResponse): BackendTicket | null {
    if (!response) {
      return null;
    }

    if (Array.isArray(response)) {
      return response.length > 0 ? response[0] : null;
    }

    if (this.isBackendTicket(response)) {
      return response;
    }

    if (Array.isArray(response.tickets) && response.tickets.length > 0) {
      return response.tickets[0];
    }

    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data[0];
    }

    if (Array.isArray(response.items) && response.items.length > 0) {
      return response.items[0];
    }

    if (Array.isArray(response.result) && response.result.length > 0) {
      return response.result[0];
    }

    if (response.result && this.isBackendTicket(response.result)) {
      return response.result;
    }

    if (response.ticket && this.isBackendTicket(response.ticket)) {
      return response.ticket;
    }

    return null;
  }

  private isBackendTicket(value: unknown): value is BackendTicket {
    return typeof value === 'object' && value !== null && 'id' in value;
  }
}
