import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BackendNfcTag {
  id: string;
  tenantId?: string;
  machineId?: string | null;
  uid?: string;
  tagModel?: string;
  hardwareModel?: string;
  machineSerialId?: string;
  tenantIdObfuscated?: string;
  integrityChecksum?: string;
  isLocked?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

interface BackendNfcTagsResponse {
  nfcTags?: BackendNfcTag[];
  data?: BackendNfcTag[];
  items?: BackendNfcTag[];
  result?: BackendNfcTag | BackendNfcTag[];
  tag?: BackendNfcTag;
}

type NfcTagsApiResponse = BackendNfcTag[] | BackendNfcTag | BackendNfcTagsResponse;

@Injectable({
  providedIn: 'root',
})
export class NfcTagsService {
  private readonly apiUrl = `${environment.apiUrl}/nfc-tags`;

  constructor(private http: HttpClient) {}

  getNfcTags(): Observable<BackendNfcTag[]> {
    return this.http.get<NfcTagsApiResponse>(this.apiUrl).pipe(
      map((response) => this.normalizeResponse(response)),
      catchError(() => of([])),
    );
  }

  private normalizeResponse(response: NfcTagsApiResponse): BackendNfcTag[] {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response;
    }

    if (this.isBackendNfcTag(response)) {
      return [response];
    }

    if (Array.isArray(response.nfcTags)) {
      return response.nfcTags;
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

    if (response.result && this.isBackendNfcTag(response.result)) {
      return [response.result];
    }

    if (response.tag && this.isBackendNfcTag(response.tag)) {
      return [response.tag];
    }

    return [];
  }

  private isBackendNfcTag(value: unknown): value is BackendNfcTag {
    return typeof value === 'object' && value !== null && 'id' in value;
  }
}