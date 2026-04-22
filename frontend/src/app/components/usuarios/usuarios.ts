import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';
import { FilterService } from '../../core/services/filter.service';
import { AuthService } from '../../core/services/auth.service';
import { TenantsService, type BackendTenant } from '../../core/services/tenants.service';
import {
  UsersService,
  type BackendUser,
  type CreateUserRequest,
  type UpdateUserRequest,
} from '../../core/services/users.service';
import { ViewSearchFiltersComponent } from '../view-search-filters/view-search-filters.component';

interface Usuario {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  roleLabel: string;
  status: 'Activo' | 'Inactivo';
  tenantId?: string;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, ViewSearchFiltersComponent],
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css']
})
export class Usuarios implements OnInit, OnDestroy {
  activeTab: 'list' | 'create' = 'list';
  isEditing = false;
  editingIndex: number | null = null;
  private readonly subscriptions = new Subscription();
  private allUsuarios: Usuario[] = [];
  private currentSearchQuery = '';
  
  usuarios: Usuario[] = [];
  loadError: string | null = null;
  createError: string | null = null;
  actionError: string | null = null;
  isCreating = false;
  deletingUserId: string | null = null;

  newUsuario: Usuario = {
    id: '',
    name: '',
    email: '',
    password: '',
    phone: '',
    role: '',
    roleLabel: '',
    status: 'Activo',
    tenantId: '',
  };

  roles: string[] = ['TECHNICIAN', 'DRIVER', 'VENDOR', 'RETAILER', 'SUPPORT', 'ADMIN'];

  get availableRoles(): string[] {
    return this.isSuperAdmin ? ['ADMIN', 'SUPPORT'] : this.roles;
  }

  tenants: BackendTenant[] = [];

  private readonly roleLabels: Record<string, string> = {
    TECHNICIAN: 'Tecnico',
    DRIVER: 'Conductor',
    VENDOR: 'Vendedor',
    RETAILER: 'Retail',
    SUPPORT: 'Soporte',
    ADMIN: 'Administrador',
    TENANT_ADMIN: 'Administrador',
    SUPER_ADMIN: 'Super Administrador',
  };

  get isSuperAdmin(): boolean {
    return this.authService.getRole() === 'super-admin';
  }

  constructor(
    private filterService: FilterService,
    private usersService: UsersService,
    private tenantsService: TenantsService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.filterService.setActiveView('usuarios');
    this.subscriptions.add(
      this.filterService.filters$
        .pipe(
          map((filters) => this.normalizeSearchQuery(filters['search'])),
          debounceTime(200),
          distinctUntilChanged(),
        )
        .subscribe((query) => {
          this.applySearchFilter(query);
        }),
    );

    this.loadUsers();
    this.loadTenants();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadUsers(): void {
    this.loadError = null;
    this.actionError = null;

    this.subscriptions.add(this.usersService.getUsers().subscribe({
      next: (users) => {
        this.allUsuarios = users.map((user) => this.mapBackendUserToTableUser(user));
        this.applySearchFilter(this.currentSearchQuery);
      },
      error: (error: HttpErrorResponse) => {
        this.allUsuarios = [];
        this.usuarios = [];
        this.loadError = this.buildLoadErrorMessage(error, 'usuarios');
      },
    }));
  }

  private loadTenants(): void {
    this.subscriptions.add(
      this.tenantsService.getTenants().subscribe({
        next: (tenants) => {
          this.tenants = tenants;
          if (!this.isSuperAdmin && !this.newUsuario.tenantId) {
            this.newUsuario.tenantId = this.authService.getTenantId() ?? undefined;
          }
        },
        error: () => {
          this.tenants = [];
        },
      }),
    );
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

  private mapBackendUserToTableUser(user: BackendUser): Usuario {
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    const roleCodes = this.extractRoleCodes(user);

    return {
      id: user.id,
      name: fullName || user.email,
      email: user.email,
      password: '',
      phone: user.phone ?? '',
      role: roleCodes[0] ?? '',
      roleLabel: roleCodes.length ? roleCodes.map((role) => this.getRoleLabel(role)).join(', ') : 'Sin rol',
      status: user.active ? 'Activo' : 'Inactivo',
      tenantId: user.tenantId ?? undefined,
    };
  }

  getRoleLabel(roleCode: string): string {
    const normalizedRole = this.normalizeRoleCode(roleCode);
    if (!normalizedRole) {
      return 'Sin rol';
    }

    const directLabel = this.roleLabels[normalizedRole];
    if (directLabel) {
      return directLabel;
    }

    if (normalizedRole.includes('SUPER') && normalizedRole.includes('ADMIN')) {
      return 'Super Administrador';
    }

    if (normalizedRole.includes('ADMIN')) {
      return 'Administrador';
    }

    if (normalizedRole.includes('SUPPORT') 
    ) {
      return 'Soporte';
    }

    if (normalizedRole.includes('TECH') 
    ) {
      return 'Tecnico';
    }

    if (
      normalizedRole.includes('DRIVER')
    ) {
      return 'Conductor';
    }

    if (
      normalizedRole.includes('VENDOR')
    ) {
      return 'Vendedor';
    }

    if (normalizedRole.includes('RETAIL') 
    ) {
      return 'Retail';
    }

    return this.humanizeRole(normalizedRole);
  }

  private extractRoleCodes(user: BackendUser): string[] {
    const roleValues = [
      ...this.flattenRoleValues(user.role),
      ...this.flattenRoleValues(user.roles),
    ];

    const normalizedRoles = roleValues
      .map((role) => this.normalizeRoleCode(role))
      .filter((role): role is string => !!role);

    return Array.from(new Set(normalizedRoles));
  }

  private flattenRoleValues(value: unknown): string[] {
    if (!value) {
      return [];
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? [trimmed] : [];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => this.flattenRoleValues(item));
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return [
        ...this.flattenRoleValues(record['role']),
        ...this.flattenRoleValues(record['roles']),
        ...this.flattenRoleValues(record['name']),
        ...this.flattenRoleValues(record['code']),
        ...this.flattenRoleValues(record['value']),
      ];
    }

    return [];
  }

  private normalizeRoleCode(roleValue: string | null | undefined): string {
    if (!roleValue) {
      return '';
    }

    return roleValue
      .trim()
      .toUpperCase()
      .replace(/^ROLE_/, '')
      .replace(/[\s-]+/g, '_');
  }

  private humanizeRole(roleCode: string): string {
    return roleCode
      .split('_')
      .filter(Boolean)
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  setActiveTab(tab: 'list' | 'create'): void {
    this.activeTab = tab;
    this.createError = null;
  }

  private applySearchFilter(searchQuery: string): void {
    this.currentSearchQuery = searchQuery;

    if (!searchQuery) {
      this.usuarios = [...this.allUsuarios];
      return;
    }

    const normalizedQuery = this.normalizeText(searchQuery);
    this.usuarios = this.allUsuarios.filter((user) => {
      const values = [user.name, user.email, user.phone, user.roleLabel, user.status, user.id];
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

  createUsuario(): void {
    if (this.isEditing && this.editingIndex !== null) {
      const editingUser = this.usuarios[this.editingIndex];

      if (!editingUser?.id) {
        this.createError = 'No se pudo identificar el usuario a editar.';
        return;
      }

      const name = this.newUsuario.name.trim();
      const email = this.newUsuario.email.trim();
      const phone = this.newUsuario.phone.trim();
      const normalizedRole = this.normalizeRoleCode(this.newUsuario.role);

      if (!name || !email || !phone || !normalizedRole) {
        this.createError = 'Debes completar Nombre, Email, Teléfono y Rol.';
        return;
      }

      if (this.isSuperAdmin && !this.newUsuario.tenantId) {
        this.createError = 'Debes seleccionar una empresa para el usuario.';
        return;
      }

      const [firstName, ...lastNameParts] = name.split(/\s+/);
      const lastName = lastNameParts.join(' ').trim();

      const payload = {
        email,
        firstName: firstName ?? '',
        lastName,
        phone,
        role: normalizedRole,
        active: this.newUsuario.status === 'Activo',
        tenantId: this.isSuperAdmin ? this.newUsuario.tenantId : undefined,
      } as UpdateUserRequest;

      this.createError = null;
      this.isCreating = true;

      this.usersService
        .updateUser(editingUser.id, payload)
        .pipe(finalize(() => (this.isCreating = false)))
        .subscribe({
          next: () => {
            this.cancelEdit();
            this.activeTab = 'list';
            this.loadUsers();
          },
          error: (error: HttpErrorResponse) => {
            this.createError = this.buildLoadErrorMessage(error, 'usuarios');
          },
        });

      return;
    }

    const name = this.newUsuario.name.trim();
    const email = this.newUsuario.email.trim();
    const password = this.newUsuario.password;
    const phone = this.newUsuario.phone.trim();
    const role = this.normalizeRoleCode(this.newUsuario.role);

    if (!name || !email || !password || !role || !phone) {
      this.createError = 'Debes completar Nombre, Email, Password, Teléfono y Rol.';
      return;
    }

    if (this.isSuperAdmin && !this.newUsuario.tenantId) {
      this.createError = 'Debes seleccionar una empresa para el usuario.';
      return;
    }

    const [firstName, ...lastNameParts] = name.split(/\s+/);
    const lastName = lastNameParts.join(' ').trim();

    const payload: CreateUserRequest = {
      email,
      password,
      firstName: firstName ?? '',
      lastName,
      role,
      tenantId: this.newUsuario.tenantId ?? this.authService.getTenantId() ?? undefined,
      phone,
    };

    this.createError = null;
    this.isCreating = true;

    this.usersService
      .createUser(payload)
      .pipe(finalize(() => (this.isCreating = false)))
      .subscribe({
        next: () => {
          this.resetForm();
          this.activeTab = 'list';
          this.loadUsers();
        },
        error: (error: HttpErrorResponse) => {
          this.createError = this.buildLoadErrorMessage(error, 'usuarios');
        },
      });
  }

  editUsuario(index: number): void {
    this.actionError = null;

    const usuario = this.usuarios[index];
    this.newUsuario = {
      ...usuario,
      password: '',
      roleLabel: this.getRoleLabel(usuario.role),
    };

    this.isEditing = true;
    this.editingIndex = index;
    this.activeTab = 'create';
    this.createError = null;
  }

  deleteUsuario(index: number): void {
    const usuario = this.usuarios[index];

    if (!usuario?.id) {
      this.actionError = 'No se pudo identificar el usuario a desactivar.';
      return;
    }

    const confirmed = confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no puede deshacerse.');

    if (!confirmed) {
      return;
    }

    this.actionError = null;
    this.deletingUserId = usuario.id;

    this.usersService
      .deactivateUser(usuario.id)
      .pipe(finalize(() => (this.deletingUserId = null)))
      .subscribe({
        next: () => {
          this.loadUsers();
        },
        error: (error: HttpErrorResponse) => {
          this.actionError = this.buildLoadErrorMessage(error, 'usuarios');
        },
      });
  }

  cancelEdit(): void {
    this.resetForm();
    this.isEditing = false;
    this.editingIndex = null;
    this.activeTab = 'list';
  }

  resetForm(): void {
    this.newUsuario = {
      id: '',
      name: '',
      email: '',
      password: '',
      phone: '',
      role: '',
      roleLabel: '',
      status: 'Activo',
      tenantId: this.isSuperAdmin ? undefined : this.authService.getTenantId() ?? undefined,
    };
    this.createError = null;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  }
}
