import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { FilterService } from '../../core/services/filter.service';
import { LocalesService, type BackendStore } from '../../core/services/locales.service';
import { ViewSearchFiltersComponent } from '../view-search-filters/view-search-filters.component';

interface Local {
  id: string;
  nombre: string;
  direccion: string;
  encargado: string;
  equiposNFC: number;
  status: 'online' | 'offline';
}

@Component({
  selector: 'app-locales',
  standalone: true,
  imports: [CommonModule, FormsModule, ViewSearchFiltersComponent],
  templateUrl: './locales.html',
  styleUrls: ['./locales.css']
})
export class Locales implements OnInit, OnDestroy {
  activeTab = 'list';
  private readonly subscriptions = new Subscription();

  locales: Local[] = [];

  newLocal: Partial<Local> = {
    nombre: '',
    direccion: '',
    encargado: '',
    equiposNFC: 0
  };

  constructor(
    private filterService: FilterService,
    private localesService: LocalesService,
  ) {}

  ngOnInit(): void {
    this.filterService.setActiveView('locales');

    this.subscriptions.add(
      this.filterService.filters$
        .pipe(
          map((filters) => this.normalizeSearchQuery(filters['search'])),
          debounceTime(250),
          distinctUntilChanged(),
        )
        .subscribe((searchQuery) => {
          this.loadStores(searchQuery);
        }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  createLocal(): void {
    if (!this.newLocal.nombre || !this.newLocal.direccion || !this.newLocal.encargado) {
      return;
    }

    const id = this.generateLocalId();
    const local: Local = {
      id,
      nombre: this.newLocal.nombre,
      direccion: this.newLocal.direccion,
      encargado: this.newLocal.encargado,
      equiposNFC: this.newLocal.equiposNFC || 0,
      status: 'offline'
    };

    this.locales.unshift(local);
    this.resetForm();
    this.setActiveTab('list');
  }

  private generateLocalId(): string {
    const maxId = this.locales
      .map((local) => {
        const match = /^LOC-(\d+)$/i.exec(local.id);
        if (!match) {
          return 0;
        }

        return Number.parseInt(match[1], 10);
      })
      .reduce((max, num) => Math.max(max, num), 0);
    return `LOC-${String(maxId + 1).padStart(3, '0')}`;
  }

  private loadStores(searchQuery: string = ''): void {
    const request$ = searchQuery
      ? this.localesService.searchStoresIgnoringAccents(searchQuery)
      : this.localesService.getStores();

    this.subscriptions.add(request$.subscribe((stores) => {
      if (!stores.length) {
        this.locales = [];
        return;
      }

      this.locales = stores.map((store) => this.mapStoreToLocal(store));
    }));
  }

  private normalizeSearchQuery(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private mapStoreToLocal(store: BackendStore): Local {
    return {
      id: store.id,
      nombre: store.name?.trim() || 'Local sin nombre',
      direccion: store.address?.trim() || 'Direccion sin registrar',
      encargado: store.retailerName?.trim() || 'Sin encargado',
      equiposNFC: this.resolveEquiposNFC(store),
      status: store.isActive === false ? 'offline' : 'online',
    };
  }

  private resolveEquiposNFC(store: BackendStore): number {
    const values = [store.equiposNFC, store.nfcCount];

    for (const value of values) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(0, Math.floor(value));
      }
    }

    return 0;
  }

  private resetForm(): void {
    this.newLocal = {
      nombre: '',
      direccion: '',
      encargado: '',
      equiposNFC: 0
    };
  }
}
