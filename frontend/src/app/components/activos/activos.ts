import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { FilterService } from '../../core/services/filter.service';
import { NfcTagsService, type BackendNfcTag } from '../../core/services/nfc-tags.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ViewSearchFiltersComponent } from '../view-search-filters/view-search-filters.component';

export interface ActivoNFC {
  id: string;
  codigo: string;
  equipo: string;
  estado: string;
  ultimaRevision: string;
}

const DATOS_ACTIVOS: ActivoNFC[] = [
  {
    id: 'mock-8472',
    codigo: 'NFC-8472',
    equipo: 'Conservadora Vertical A1',
    estado: 'Operativo',
    ultimaRevision: '25 Mar 2026, 14:30',
  },
  {
    id: 'mock-1933',
    codigo: 'NFC-1933',
    equipo: 'Vitrina Exhibidora',
    estado: 'Mantenimiento',
    ultimaRevision: '24 Mar 2026, 09:15',
  },
  {
    id: 'mock-2044',
    codigo: 'NFC-2044',
    equipo: 'Cámara Frigorífica 02',
    estado: 'Alerta',
    ultimaRevision: '25 Mar 2026, 16:00',
  },
  {
    id: 'mock-3311',
    codigo: 'NFC-3311',
    equipo: 'Conservadora Horizontal B',
    estado: 'Operativo',
    ultimaRevision: '25 Mar 2026, 11:40',
  },
  {
    id: 'mock-0099',
    codigo: 'NFC-0099',
    equipo: 'Vitrina Pastelería',
    estado: 'Operativo',
    ultimaRevision: '24 Mar 2026, 17:00',
  },
];

@Component({
  selector: 'app-activos',
  standalone: true,
  imports: [CommonModule, FormsModule, ViewSearchFiltersComponent],
  templateUrl: './activos.html',
  styleUrls: ['./activos.css'],
})
export class Activos implements OnInit, OnDestroy {
  activeTab: 'list' | 'create' = 'list';
  isEditing = false;
  editingActivoId: string | null = null;
  private readonly subscriptions = new Subscription();
  private currentSearchQuery = '';

  activos: ActivoNFC[] = [...DATOS_ACTIVOS];
  private todosLosActivos: ActivoNFC[] = [...DATOS_ACTIVOS];

  estados = ['Operativo', 'Mantenimiento', 'Alerta'];
  equipos = [
    'Conservadora Vertical A1',
    'Vitrina Exhibidora',
    'Cámara Frigorífica 02',
    'Conservadora Horizontal B',
    'Vitrina Pastelería',
    'Otro (especificar)'
  ];

  newActivo: ActivoNFC = {
    id: '',
    codigo: '',
    equipo: '',
    estado: 'Operativo',
    ultimaRevision: new Date().toLocaleString('es-ES')
  };

  constructor(
    private filterService: FilterService,
    private nfcTagsService: NfcTagsService,
    private confirmDialog: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.filterService.setActiveView('activos');

    this.subscriptions.add(
      this.filterService.filters$
        .pipe(
          map((filters) => this.normalizeSearchQuery(filters['search'])),
          debounceTime(200),
          distinctUntilChanged(),
        )
        .subscribe((searchQuery) => {
          this.applySearchFilter(searchQuery);
        }),
    );

    this.loadActivosFromBackend();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  setActiveTab(tab: 'list' | 'create'): void {
    this.activeTab = tab;
    if (tab === 'list') {
      this.cancelEdit();
    } else if (tab === 'create' && !this.isEditing) {
      this.resetForm();
    }
  }

  generateCodigo(): string {
    const numAleatorio = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `NFC-${numAleatorio}`;
  }

  createActivo(): void {
    if (this.newActivo.codigo && this.newActivo.equipo) {
      if (this.isEditing && this.editingActivoId) {
        const index = this.todosLosActivos.findIndex((activo) => activo.id === this.editingActivoId);

        if (index >= 0) {
          this.todosLosActivos[index] = {
            ...this.newActivo,
            id: this.editingActivoId,
            ultimaRevision: new Date().toLocaleString('es-ES'),
          };
        }

        this.applySearchFilter(this.currentSearchQuery);
        this.cancelEdit();
      } else {
        const activoNuevo: ActivoNFC = {
          ...this.newActivo,
          id: this.generateActivoId(),
          codigo: this.newActivo.codigo || this.generateCodigo(),
          ultimaRevision: new Date().toLocaleString('es-ES')
        };

        this.todosLosActivos.push(activoNuevo);
        this.applySearchFilter(this.currentSearchQuery);
        this.resetForm();
      }

      this.activeTab = 'list';
    }
  }

  editActivo(index: number): void {
    const activo = this.activos[index];
    if (!activo) {
      return;
    }

    this.newActivo = { ...activo };
    this.isEditing = true;
    this.editingActivoId = activo.id;
    this.activeTab = 'create';
  }

  async deleteActivo(index: number): Promise<void> {
    const activo = this.activos[index];
    if (!activo) {
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar activo NFC',
      message: 'Esta accion no se puede deshacer. Se eliminara definitivamente el activo seleccionado.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (confirmed) {
      this.todosLosActivos = this.todosLosActivos.filter((item) => item.id !== activo.id);
      this.applySearchFilter(this.currentSearchQuery);
    }
  }

  cancelEdit(): void {
    this.resetForm();
    this.isEditing = false;
    this.editingActivoId = null;
  }

  resetForm(): void {
    this.newActivo = {
      id: '',
      codigo: '',
      equipo: '',
      estado: 'Operativo',
      ultimaRevision: new Date().toLocaleString('es-ES')
    };
  }

  generateCodigoAuto(): void {
    this.newActivo.codigo = this.generateCodigo();
  }

  private loadActivosFromBackend(): void {
    this.subscriptions.add(
      this.nfcTagsService.getNfcTags().subscribe((tags) => {
        if (!tags.length) {
          this.todosLosActivos = [...DATOS_ACTIVOS];
          this.applySearchFilter(this.currentSearchQuery);
          return;
        }

        this.todosLosActivos = tags.map((tag) => this.mapTagToActivo(tag));
        this.applySearchFilter(this.currentSearchQuery);
      }),
    );
  }

  private mapTagToActivo(tag: BackendNfcTag): ActivoNFC {
    return {
      id: tag.id,
      codigo: tag.uid?.trim() || `NFC-${tag.id.slice(0, 6).toUpperCase()}`,
      equipo: this.resolveEquipo(tag),
      estado: this.mapEstado(tag),
      ultimaRevision: this.formatDateTime(tag.updatedAt ?? tag.createdAt),
    };
  }

  private resolveEquipo(tag: BackendNfcTag): string {
    if (tag.machineSerialId?.trim()) {
      return tag.machineSerialId.trim();
    }

    if (tag.hardwareModel?.trim()) {
      return tag.hardwareModel.trim();
    }

    if (tag.tagModel?.trim()) {
      return tag.tagModel.trim();
    }

    if (tag.machineId?.trim()) {
      return `Maquina ${tag.machineId.slice(0, 8)}`;
    }

    return 'Sin equipo asociado';
  }

  private mapEstado(tag: BackendNfcTag): string {
    if (tag.isActive === false) {
      return 'Alerta';
    }

    if (tag.isLocked) {
      return 'Mantenimiento';
    }

    return 'Operativo';
  }

  private formatDateTime(value?: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  private applySearchFilter(searchQuery: string): void {
    this.currentSearchQuery = searchQuery;

    if (!searchQuery) {
      this.activos = [...this.todosLosActivos];
      return;
    }

    const normalizedQuery = this.normalizeText(searchQuery);

    this.activos = this.todosLosActivos.filter((activo) => {
      const values = [activo.codigo, activo.equipo, activo.estado, activo.ultimaRevision];
      return values.some((value) => this.normalizeText(value).includes(normalizedQuery));
    });
  }

  private normalizeSearchQuery(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private generateActivoId(): string {
    const random = Math.floor(Math.random() * 100000).toString(16);
    return `activo-${Date.now()}-${random}`;
  }
}
