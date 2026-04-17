import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, forkJoin, of } from 'rxjs';
import { RouterLink } from '@angular/router';
import { FilterService } from '../../core/services/filter.service';
import {
  TenantsService,
  type BackendTenant,
  type CreateTenantRequest,
} from '../../core/services/tenants.service';
import { UsersService, type BackendUser } from '../../core/services/users.service';

interface Tenant {
  id: string;
  nombre: string;
  plan: string;
  usuarios: number;
  estado: string;
  fecha: string;
}

interface CreateTenantForm {
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
}

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tenants.html',
  styleUrls: ['./tenants.css']
})
export class Tenants implements OnInit {
  activeTab: 'list' | 'create' = 'list';

  tenants: Tenant[] = [];
  loadError: string | null = null;
  createError: string | null = null;

  columnas = ['id', 'nombre', 'usuarios', 'estado', 'fecha'];

  newTenant: CreateTenantForm = {
    name: '',
    slug: '',
    description: '',
    logoUrl: '',
  };

  constructor(
    private filterService: FilterService,
    private tenantsService: TenantsService,
    private usersService: UsersService,
  ) {}

  ngOnInit(): void {
    this.filterService.setActiveView('tenants');
    this.loadTenants();
  }

  private loadTenants(): void {
    this.loadError = null;

    forkJoin({
      tenants: this.tenantsService.getTenants(),
      users: this.usersService.getUsers().pipe(catchError(() => of<BackendUser[]>([]))),
    }).subscribe({
      next: ({ tenants, users }) => {
        const usersCountByTenantId = this.countUsersByTenantId(users);
        this.tenants = tenants.map((tenant) => this.mapBackendTenantToTableTenant(tenant, usersCountByTenantId));
      },
      error: (error: HttpErrorResponse) => {
        this.tenants = [];
        this.loadError = this.buildLoadErrorMessage(error, 'tenants');
      },
    });
  }

  private countUsersByTenantId(users: BackendUser[]): Map<string, number> {
    const counts = new Map<string, number>();

    for (const user of users) {
      if (!user.tenantId) {
        continue;
      }

      counts.set(user.tenantId, (counts.get(user.tenantId) ?? 0) + 1);
    }

    return counts;
  }

  private buildLoadErrorMessage(error: HttpErrorResponse, resource: 'usuarios' | 'tenants'): string {
    const backendMessage =
      (typeof error.error?.message === 'string' && error.error.message.trim()) ||
      (typeof error.error === 'string' && error.error.trim()) ||
      '';

    if (error.status === 403) {
      const detail = backendMessage ? ` Detalle backend: ${backendMessage}.` : '';
      return `No tienes permisos para cargar ${resource} con el rol o tenant actual.${detail}`;
    }

    if (backendMessage) {
      return `No fue posible cargar ${resource}. Detalle backend: ${backendMessage}.`;
    }

    return `No fue posible cargar ${resource}. Intenta nuevamente.`;
  }

  private mapBackendTenantToTableTenant(tenant: BackendTenant, usersCountByTenantId: Map<string, number>): Tenant {
    const status = this.mapStatus(tenant.active ?? tenant.isActive, tenant.status);
    const usersFromTenantList = usersCountByTenantId.get(tenant.id);
    const users = usersFromTenantList ?? tenant.usersCount ?? tenant.userCount ?? tenant.usuarios ?? 0;

    return {
      id: tenant.id,
      nombre: tenant.name ?? tenant.nombre ?? tenant.id,
      plan: '',
      usuarios: users,
      estado: status,
      fecha: this.toDateOnly(tenant.createdAt),
    };
  }

  private mapStatus(active?: boolean, status?: string): string {
    if (status) {
      const normalized = status.trim().toLowerCase();
      const statusMap: Record<string, string> = {
        activo: 'Activo',
        active: 'Activo',
        inactivo: 'Inactivo',
        inactive: 'Inactivo',
        mantenimiento: 'Mantenimiento',
        maintenance: 'Mantenimiento',
      };

      if (statusMap[normalized]) {
        return statusMap[normalized];
      }
    }

    return active === false ? 'Inactivo' : 'Activo';
  }

  private toDateOnly(dateValue?: string): string {
    if (!dateValue) {
      return '';
    }

    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    return parsed.toISOString().split('T')[0];
  }

  setActiveTab(tab: 'list' | 'create'): void {
    this.activeTab = tab;
    if (tab === 'create') {
      this.createError = null;
    }
  }

  createTenant(): void {
    const name = this.newTenant.name.trim();
    const slug = this.newTenant.slug.trim();
    const description = this.newTenant.description.trim();
    const logoUrl = this.newTenant.logoUrl.trim();

    if (!name || !slug) {
      this.createError = 'Debes ingresar al menos name y slug.';
      return;
    }

    this.createError = null;

    const payload: CreateTenantRequest = {
      name,
      slug,
      description: description || undefined,
      logoUrl: logoUrl || undefined,
    };

    this.tenantsService.createTenant(payload).subscribe({
      next: () => {
        this.newTenant = {
          name: '',
          slug: '',
          description: '',
          logoUrl: '',
        };

        this.activeTab = 'list';
        this.loadTenants();
      },
      error: (error: HttpErrorResponse) => {
        this.createError = this.buildLoadErrorMessage(error, 'tenants');
      },
    });
  }

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      'Activo': 'badge-activo',
      'Inactivo': 'badge-inactivo',
      'Mantenimiento': 'badge-mant',
    };
    return map[estado] ?? '';
  }
}