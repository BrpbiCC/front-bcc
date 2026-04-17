import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { Local } from '../models/local.model';
import { environment } from '../../../environments/environment';

export interface BackendStore {
  id: string;
  tenantId?: string;
  sectorId?: string | null;
  retailerId?: string | null;
  name?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  retailerName?: string;
  retailerRut?: string;
  retailerPhone?: string;
  retailerEmail?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  nfcCount?: number;
  equiposNFC?: number;
}

interface BackendStoresResponse {
  stores?: BackendStore[];
  data?: BackendStore[];
  store?: BackendStore;
  result?: BackendStore | BackendStore[];
  items?: BackendStore[];
}

type StoresApiResponse = BackendStoresResponse | BackendStore[] | BackendStore;

const MOCK_LOCALES: Local[] = [
  {
    id: 'local-001',
    nombre: 'Sucursal Centro',
    direccion: 'Av. Principal 123, Santiago',
    latitud: -33.4489,
    longitud: -70.6693,
    nfc: {
      id: 'NFC-24A3',
      nombre: 'NFC Centro',
      estado: 'activo',
    },
  },
  {
    id: 'local-002',
    nombre: 'Sucursal Norte',
    direccion: 'Calle Norte 456, Santiago',
    latitud: -33.4049,
    longitud: -70.6450,
    nfc: {
      id: 'NFC-19B2',
      nombre: 'NFC Norte',
      estado: 'inactivo',
    },
  },
  {
    id: 'local-003',
    nombre: 'Sucursal Sur',
    direccion: 'Av. Sur 789, Santiago',
    latitud: -33.5050,
    longitud: -70.6910,
    nfc: {
      id: 'NFC-33C7',
      nombre: 'NFC Sur',
      estado: 'activo',
    },
  },
];

@Injectable({
  providedIn: 'root',
})
export class LocalesService {
  private readonly storesUrl = `${environment.apiUrl}/stores`;

  constructor(private http: HttpClient) {}

  getStores(): Observable<BackendStore[]> {
    return this.http.get<StoresApiResponse>(this.storesUrl).pipe(
      map((response) => this.normalizeStoresResponse(response)),
      catchError(() => of([])),
    );
  }

  getStoresByName(name: string): Observable<BackendStore[]> {
    const searchName = name.trim();
    if (!searchName) {
      return this.getStores();
    }

    const encodedName = encodeURIComponent(searchName);

    return this.http.get<StoresApiResponse>(`${this.storesUrl}/search/${encodedName}`).pipe(
      map((response) => this.normalizeStoresResponse(response)),
      catchError(() => of([])),
    );
  }

  searchStoresIgnoringAccents(name: string): Observable<BackendStore[]> {
    const searchName = name.trim();
    if (!searchName) {
      return this.getStores();
    }

    const normalizedQuery = this.normalizeText(searchName);

    return this.getStoresByName(searchName).pipe(
      switchMap((stores) => {
        const directMatches = this.filterStoresByQuery(stores, normalizedQuery);
        if (directMatches.length > 0) {
          return of(directMatches);
        }

        return this.getStores().pipe(
          map((allStores) => this.filterStoresByQuery(allStores, normalizedQuery)),
        );
      }),
    );
  }

  private normalizeStoresResponse(response: StoresApiResponse): BackendStore[] {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response;
    }

    if (this.isBackendStore(response)) {
      return [response];
    }

    if (Array.isArray(response.stores)) {
      return response.stores;
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

    if (response.store && this.isBackendStore(response.store)) {
      return [response.store];
    }

    if (response.result && this.isBackendStore(response.result)) {
      return [response.result];
    }

    return [];
  }

  private isBackendStore(value: unknown): value is BackendStore {
    return typeof value === 'object' && value !== null && 'id' in value;
  }

  private filterStoresByQuery(stores: BackendStore[], normalizedQuery: string): BackendStore[] {
    return stores.filter((store) => {
      const normalizedFields = [store.name, store.address, store.retailerName, store.id]
        .filter((field): field is string => typeof field === 'string' && field.trim().length > 0)
        .map((field) => this.normalizeText(field));

      return normalizedFields.some((field) => field.includes(normalizedQuery));
    });
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  getLocalesMapa(): Observable<Local[]> {
    return this.http.get<Local[]>('/api/locales/mapa').pipe(
      catchError(() => {
        return of(MOCK_LOCALES);
      })
    );
  }
}

/* Ejemplo mock JSON de respuesta API:
[
  {
    "id": "local-001",
    "nombre": "Sucursal Centro",
    "direccion": "Av. Principal 123, Santiago",
    "latitud": -33.4489,
    "longitud": -70.6693,
    "nfc": {
      "id": "NFC-24A3",
      "nombre": "NFC Centro",
      "estado": "activo"
    }
  },
  {
    "id": "local-002",
    "nombre": "Sucursal Norte",
    "direccion": "Calle Norte 456, Santiago",
    "latitud": -33.4049,
    "longitud": -70.6450,
    "nfc": {
      "id": "NFC-19B2",
      "nombre": "NFC Norte",
      "estado": "inactivo"
    }
  }
]
*/
