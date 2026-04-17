import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  TenantsService,
  type BackendTenant,
  type UpdateTenantRequest,
} from '../../core/services/tenants.service';
import { UsersService } from '../../core/services/users.service';

interface TenantDetailViewModel {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  estado: string;
  createdAt: string;
  updatedAt: string;
  usersCount: number;
}

interface EditTenantForm {
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
}

@Component({
  selector: 'app-tenant-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tenant-detail.html',
  styleUrls: ['./tenant-detail.css'],
})
export class TenantDetail implements OnInit {
  tenantId = '';
  tenant: TenantDetailViewModel | null = null;
  loadError: string | null = null;
  actionError: string | null = null;
  isLoading = false;
  isEditing = false;

  editTenantForm: EditTenantForm = {
    name: '',
    slug: '',
    description: '',
    logoUrl: '',
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tenantsService: TenantsService,
    private usersService: UsersService,
  ) {}

  ngOnInit(): void {
    this.tenantId = this.route.snapshot.paramMap.get('id') ?? '';

    if (!this.tenantId) {
      this.loadError = 'No se encontro el id del tenant en la ruta.';
      return;
    }

    this.loadTenant();
  }

  loadTenant(): void {
    this.loadError = null;
    this.actionError = null;
    this.isLoading = true;

    this.tenantsService.getTenantById(this.tenantId).subscribe({
      next: (tenant) => {
        this.loadUsersCount(tenant);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        this.loadError = this.buildErrorMessage(error, 'tenants');
      },
    });
  }

  startEdit(): void {
    if (!this.tenant) {
      return;
    }

    this.actionError = null;
    this.isEditing = true;
    this.editTenantForm = {
      name: this.tenant.name,
      slug: this.tenant.slug,
      description: this.tenant.description,
      logoUrl: this.tenant.logoUrl,
    };
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.actionError = null;
  }

  saveChanges(): void {
    const name = this.editTenantForm.name.trim();
    const slug = this.editTenantForm.slug.trim();
    const description = this.editTenantForm.description.trim();
    const logoUrl = this.editTenantForm.logoUrl.trim();

    if (!name || !slug) {
      this.actionError = 'Name y slug son obligatorios.';
      return;
    }

    const payload: UpdateTenantRequest = {
      name,
      slug,
      description: description || undefined,
      logoUrl: logoUrl || undefined,
    };

    this.actionError = null;

    this.tenantsService.updateTenant(this.tenantId, payload).subscribe({
      next: (updated) => {
        this.tenant = this.mapTenant(updated, this.tenant?.usersCount ?? 0);
        this.isEditing = false;
      },
      error: (error: HttpErrorResponse) => {
        this.actionError = this.buildErrorMessage(error, 'tenants');
      },
    });
  }

  deleteTenant(): void {
    if (!this.tenant) {
      return;
    }

    const confirmed = confirm(
      `¿Seguro que deseas eliminar el tenant ${this.tenant.name}? Esta accion no se puede deshacer.`,
    );

    if (!confirmed) {
      return;
    }

    this.actionError = null;

    this.tenantsService.deleteTenant(this.tenantId).subscribe({
      next: () => {
        this.router.navigate(['/tenants']);
      },
      error: (error: HttpErrorResponse) => {
        this.actionError = this.buildErrorMessage(error, 'tenants');
      },
    });
  }

  private loadUsersCount(tenant: BackendTenant): void {
    this.usersService.getUsers().subscribe({
      next: (users) => {
        const usersCount = users.filter((user) => user.tenantId === tenant.id).length;
        this.tenant = this.mapTenant(tenant, usersCount);
        this.isLoading = false;
      },
      error: () => {
        // Si falla users, igual mostrar detalle del tenant.
        this.tenant = this.mapTenant(tenant, 0);
        this.isLoading = false;
      },
    });
  }

  private mapTenant(tenant: BackendTenant, usersCount: number): TenantDetailViewModel {
    return {
      id: tenant.id,
      name: tenant.name ?? tenant.nombre ?? '',
      slug: tenant.slug ?? '',
      description: tenant.description ?? '',
      logoUrl: tenant.logoUrl ?? '',
      estado: this.mapStatus(tenant.active ?? tenant.isActive, tenant.status),
      createdAt: this.toDateOnly(tenant.createdAt),
      updatedAt: this.toDateOnly(tenant.updatedAt),
      usersCount,
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

  private buildErrorMessage(error: HttpErrorResponse, resource: 'usuarios' | 'tenants'): string {
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
}
