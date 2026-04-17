// Cambia esta línea del import
import { Component, OnDestroy, OnInit, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthService, type UserRole } from '../../core/services/auth.service';
import { FilterService } from '../../core/services/filter.service';

interface NavItem {
  label?: string;
  route?: string;
  icon?: string;
  separator?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css'],
})
export class Sidebar implements OnInit, OnDestroy {
  @Input() collapsed = false;
  @Output() collapseChange = new EventEmitter<boolean>();

  logoLight = '/imagenes/logos/FrioCheck.svg';
  logoDark = '/imagenes/logos/FrioChekModoOscuro.svg';
  userRole: UserRole | null = null;
  userName = 'Usuario';
  userRoleLabel = 'Invitado';
  userInitials = 'US';
  navItems: NavItem[] = [];
  animationKey = 0;
  private readonly subscriptions = new Subscription();

  private readonly roleLabels: Record<UserRole, string> = {
    admin: 'Administrador',
    support: 'Soporte',
    'super-admin': 'Super Administrador',
  };

  private readonly roleFallbackNames: Record<UserRole, string> = {
    admin: 'Administrador Principal',
    support: 'Soporte Tecnico',
    'super-admin': 'Administrador Global',
  };

  private supportItems: NavItem[] = [
    { label: 'Panel', route: '/dashboard', icon: 'home' },
    { label: 'Tickets', route: '/tickets', icon: 'alert-circle' },
    { label: 'Visitas', route: '/visitas', icon: 'map-pin' },
    { label: 'Activos NFC', route: '/activos', icon: 'layers' },
    { label: 'Reportes', route: '/reportes', icon: 'bar-chart' },
    { label: 'Usuarios', route: '/usuarios', icon: 'users' },
  ];

  private adminItems: NavItem[] = [
    { label: 'Panel', route: '/dashboard', icon: 'home' },
    { label: 'Activos NFC', route: '/activos', icon: 'layers' },
    { label: 'Visitas', route: '/visitas', icon: 'map-pin' },
    { label: 'Tickets', route: '/tickets', icon: 'alert-circle' },
    { label: 'Pedidos', route: '/pedidos', icon: 'package' },
    { label: 'Locales', route: '/locales', icon: 'store' },
    { label: 'Usuarios', route: '/usuarios', icon: 'users' },
    { label: 'Reportes', route: '/reportes', icon: 'bar-chart' },
  ];

  private superAdminItems: NavItem[] = [
  { label: 'Panel', route: '/dashboard', icon: 'home' },
  { label: 'Métricas Globales', route: '/metricas-globales', icon: 'trending-up' },
  { label: 'Tenants', route: '/tenants', icon: 'building' },
  { label: 'Usuarios', route: '/usuarios', icon: 'users' },
];

  private readonly BREAKPOINT = 768;

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    const width = (event.target as Window).innerWidth;
    const shouldCollapse = width < this.BREAKPOINT;
    if (this.collapsed !== shouldCollapse) {
      this.collapsed = shouldCollapse;
      this.collapseChange.emit(this.collapsed);
    }
  }
  constructor(
    private authService: AuthService,
    private router: Router,
    private filterService: FilterService
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole();
    if (this.userRole) {
      this.filterService.setUserRole(this.userRole);
    }

    this.refreshUserInfo(this.userRole);
    this.updateNavItems();

        // Al final de ngOnInit
    const initialWidth = window.innerWidth;
    if (initialWidth < this.BREAKPOINT) {
      this.collapsed = true;
      this.collapseChange.emit(this.collapsed);
    }

    this.subscriptions.add(
      this.authService.role$.subscribe((role) => {
        this.userRole = role;
        if (role) {
          this.filterService.setUserRole(role);
        }

        this.refreshUserInfo(role);
        this.updateNavItems();

        if (this.router.url) {
          const viewName = this.getViewNameFromUrl(this.router.url);
          if (viewName) {
            this.filterService.syncCarouselToView(viewName);
          }
        }
      }),
    );

    this.subscriptions.add(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        const viewName = this.getViewNameFromUrl(url);
        if (viewName) {
          this.filterService.addToHistory(viewName);
          this.filterService.syncCarouselToView(viewName);
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private getViewNameFromUrl(url: string): string | null {
    if (url.startsWith('/dashboard')) return 'dashboard';
    if (url.startsWith('/tickets')) return 'tickets';
    if (url.startsWith('/visitas')) return 'visitas';
    if (url.startsWith('/activos')) return 'activos';
    if (url.startsWith('/reportes')) return 'reportes';
    if (url.startsWith('/usuarios')) return 'usuarios';
    if (url.startsWith('/pedidos')) return 'pedidos';
    if (url.startsWith('/locales')) return 'locales';
    if (url.startsWith('/perfil')) return 'perfil';
    if (url.startsWith('/tenants')) return 'tenants';
    if (url.startsWith('/metricas-globales')) return 'metricas-globales';
    return null;
  }

  private updateNavItems(): void {
    if (this.userRole === 'support') {
      this.navItems = this.supportItems;
    } else if (this.userRole === 'admin') {
      this.navItems = this.adminItems;
    } else if (this.userRole === 'super-admin') {
      this.navItems = this.superAdminItems;
    } else {
      this.navItems = [];
    }
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed;
    this.animationKey++;
    this.collapseChange.emit(this.collapsed);
  }

  goToProfile(): void {
    this.filterService.setActiveView('perfil');
    this.filterService.addToHistory('perfil');
    this.filterService.syncCarouselToView('perfil');
    void this.router.navigateByUrl('/perfil');
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  onNavClick(event: MouseEvent, route?: string): void {
    if (!route) {
      return;
    }

    // Fuerza navegación al primer click, evitando estados intermedios del anchor.
    event.preventDefault();
    event.stopPropagation();

    const viewName = this.getViewNameFromUrl(route);
    if (viewName) {
      this.filterService.setActiveView(viewName);
      this.filterService.addToHistory(viewName);
      this.filterService.syncCarouselToView(viewName);
    }

    this.router.navigateByUrl(route);
  }

  getAnimationDelay(index: number): string {
    const baseDelay = 0;
    const interval = 0.15;
    return (baseDelay + index * interval) + 's';
  }

  private refreshUserInfo(role: UserRole | null): void {
    const displayRole = role ? this.roleLabels[role] : 'Invitado';
    const storedName = this.getStoredUserName();
    const fallbackName = role ? this.roleFallbackNames[role] : 'Usuario';

    this.userName = storedName || fallbackName;
    this.userRoleLabel = displayRole;
    this.userInitials = this.buildInitials(this.userName);
  }

  private getStoredUserName(): string {
    const keys = ['userName', 'username', 'displayName', 'fullName', 'nombre'];
    for (const key of keys) {
      const value = sessionStorage.getItem(key) ?? localStorage.getItem(key);
      if (value && value.trim()) {
        return value.trim();
      }
    }
    return '';
  }

  private buildInitials(name: string): string {
    const parts = name
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0) {
      return 'US';
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
}
