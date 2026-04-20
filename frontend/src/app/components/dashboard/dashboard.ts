import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Chart, registerables } from 'chart.js';
import { MapaLocalesComponent } from '../mapa-locales/mapa-locales.component';
import { Subscription } from 'rxjs';
import { AuthService, type UserRole } from '../../core/services/auth.service';
import { DashboardRealtimeService, type DashboardMetrics } from '../../core/services/dashboard-realtime.service';

Chart.register(...registerables);

export interface Activo {
  id: string;
  nombre: string;
  categoria: string;
  estado: 'Activo' | 'Inactivo' | 'Mantenimiento';
  ubicacion: string;
  fecha: string;
}

export interface MetricaCard {
  label: string;
  valor: string | number;
  subvalor: string;
  icono: string;
  color: string;
}

type DashboardWidget = 'visitas' | 'estado' | 'pedidos' | 'mapa' | 'registros';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatProgressBarModule,
    MapaLocalesComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(MapaLocalesComponent) mapaLocalesComponent?: MapaLocalesComponent;

  private barChart?: Chart;
  private donutChart?: Chart;
  private lineChart?: Chart;

  // ── Métricas resumen ──────────────────────────────────────────
  metricas: MetricaCard[] = [
    { label: 'Total Tenants', valor: '1,284', subvalor: '↑ 12 nuevos este mes',        icono: "domain",                 color: 'primary'  },
    { label: 'Visitas',           valor: '8,421', subvalor: '↑ 12.4% esta semana',   icono: 'visibility',          color: 'accent'   },
    { label: 'Tickets abiertos',  valor: '47',    subvalor: '↓ 5 resueltos hoy',     icono: 'confirmation_number', color: 'warn'     },
    { label: 'Pedidos activos',   valor: '312',   subvalor: '↑ 8.1% vs ayer',        icono: 'shopping_cart',       color: 'success'  },
    { label: 'Locales',           valor: '63',    subvalor: '4 sin tenants',      icono: 'store',               color: 'info'     },
    { label: 'Usuarios',          valor: '5,902', subvalor: '↑ 4.7% este mes',       icono: 'group',               color: 'purple'   },
  ];
  metricasVisibles: MetricaCard[] = [];

  private readonly subscriptions = new Subscription();

  private readonly widgetRoutes: Record<DashboardWidget, { detail: string; module: string }> = {
    visitas: { detail: '/visitas', module: '/visitas' },
    estado: { detail: '/tenants', module: '/tenants' },
    pedidos: { detail: '/reportes', module: '/pedidos' },
    mapa: { detail: '/reportes', module: '/locales' },
    registros: { detail: '/activos', module: '/tickets' },
  };

  // ── Activos por estado ────────────────────────────────────────
  tenantsPorEstado = { activos: 874, inactivos: 287, mantenimiento: 123 };

  get totalActivos(): number {
    return this.tenantsPorEstado.activos + this.tenantsPorEstado.inactivos + this.tenantsPorEstado.mantenimiento;
  }

  pctActivos():       number { return Math.round((this.tenantsPorEstado.activos       / this.totalActivos) * 100); }
  pctInactivos():     number { return Math.round((this.tenantsPorEstado.inactivos     / this.totalActivos) * 100); }
  pctMantenimiento(): number { return Math.round((this.tenantsPorEstado.mantenimiento / this.totalActivos) * 100); }

  // ── Tabla activos recientes ───────────────────────────────────
  columnasTabla: string[] = ['id', 'nombre', 'categoria', 'estado', 'ubicacion', 'fecha'];

  registrosRecientes: Activo[] = [
    { id: 'TNT-0842', nombre: 'Empresa Soluciones SpA',  categoria: 'Tenant',  estado: 'Activo',        ubicacion: 'Local Centro',   fecha: '01 abr 2026' },
    { id: 'TNT-0841', nombre: 'Comercial Norte Ltda.',   categoria: 'Tenant',  estado: 'Activo',        ubicacion: 'Local Norte',    fecha: '01 abr 2026' },
    { id: 'TKT-1203', nombre: 'Ticket soporte red',      categoria: 'Ticket',  estado: 'Mantenimiento', ubicacion: 'Local Sur',      fecha: '31 mar 2026' },
    { id: 'PED-5541', nombre: 'Pedido mayorista',        categoria: 'Pedido',  estado: 'Activo',        ubicacion: 'Bodega Central', fecha: '31 mar 2026' },
    { id: 'TNT-0839', nombre: 'Distribuidora Oriente',   categoria: 'Tenant',  estado: 'Inactivo',      ubicacion: 'Local Oriente',  fecha: '30 mar 2026' },
    { id: 'USR-0210', nombre: 'Juan Pérez',              categoria: 'Usuario', estado: 'Activo',        ubicacion: 'Admin',          fecha: '30 mar 2026' },
    { id: 'LOC-0018', nombre: 'Local Las Condes',        categoria: 'Local',   estado: 'Activo',        ubicacion: 'Santiago',       fecha: '29 mar 2026' },
    { id: 'TKT-1198', nombre: 'Falla acceso tenant',     categoria: 'Ticket',  estado: 'Inactivo',      ubicacion: 'Local Centro',   fecha: '29 mar 2026' },
  ];

  // ── Categorías con barra de progreso ─────────────────────────
  categorias = [
    { nombre: 'Tenants', valor: '1,284', pct: 100, icono: "domain",                 color: '#185FA5', pbClass: 'pb-primary' },
    { nombre: 'Visitas',     valor: '8,421', pct: 66,  icono: 'visibility',          color: '#639922', pbClass: 'pb-green'   },
    { nombre: 'Tickets',     valor: '47',    pct: 4,   icono: 'confirmation_number', color: '#BA7517', pbClass: 'pb-amber'   },
    { nombre: 'Pedidos',     valor: '312',   pct: 24,  icono: 'shopping_cart',       color: '#3B6D11', pbClass: 'pb-green'   },
    { nombre: 'Locales',     valor: '63',    pct: 5,   icono: 'store',               color: '#534AB7', pbClass: 'pb-purple'  },
    { nombre: 'Usuarios',    valor: '5,902', pct: 46,  icono: 'group',               color: '#993556', pbClass: 'pb-pink'    },
  ];

  private meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  constructor(private authService: AuthService, private router: Router, private dashboardRealtimeService: DashboardRealtimeService) {}

  ngOnInit(): void {
    this.actualizarMetricasPorRol(this.authService.getRole());
    this.subscriptions.add(
      this.authService.role$.subscribe((role) => {
        this.actualizarMetricasPorRol(role);
      }),
    );

    // Suscribirse a las métricas en tiempo real
    this.subscriptions.add(
      this.dashboardRealtimeService.connect().subscribe((metrics: DashboardMetrics) => {
        this.metricas = [
          { label: 'Total Tenants', valor: metrics.totalTenants.toLocaleString(), subvalor: `↑ ${metrics.newTenantsThisMonth} nuevos este mes`, icono: "domain", color: 'primary' },
          { label: 'Visitas', valor: metrics.visits.toLocaleString(), subvalor: `↑ ${metrics.visitsWeeklyGrowth}% esta semana`, icono: 'visibility', color: 'accent' },
          { label: 'Tickets abiertos', valor: metrics.openTickets, subvalor: `↓ ${metrics.ticketsResolvedToday} resueltos hoy`, icono: 'confirmation_number', color: 'warn' },
          { label: 'Pedidos activos', valor: metrics.activeOrders, subvalor: `↑ ${metrics.ordersDailyGrowth}% vs ayer`, icono: 'shopping_cart', color: 'success' },
          { label: 'Locales', valor: metrics.locals, subvalor: `${metrics.localsWithoutTenants} sin tenants`, icono: 'store', color: 'info' },
          { label: 'Usuarios', valor: metrics.users.toLocaleString(), subvalor: `↑ ${metrics.usersMonthlyGrowth}% este mes`, icono: 'group', color: 'purple' },
        ];
        this.actualizarMetricasPorRol(this.authService.getRole());
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.barChart?.destroy();
    this.donutChart?.destroy();
    this.lineChart?.destroy();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initBarChart();
      this.initDonutChart();
      this.initLineChart();
    }, 0);
  }

  private initBarChart(): void {
    const ctx = document.getElementById('barChart') as HTMLCanvasElement;
    if (!ctx) return;
    this.barChart?.destroy();
    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.meses,
        datasets: [
          { label: '2025', data: [3200,2900,4100,3800,4700,4300,5100,4800,5600,5200,6000,6400], backgroundColor: '#b5d4f4', borderRadius: 5 },
          { label: '2026', data: [3900,3500,5200,8421,null,null,null,null,null,null,null,null],  backgroundColor: '#185FA5', borderRadius: 5 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#888' } },
          y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 }, color: '#888', callback: (v: string | number) => typeof v === 'number' ? `${v/1000}k` : v } }
        }
      }
    });
  }

  private initDonutChart(): void {
    const ctx = document.getElementById('donutChart') as HTMLCanvasElement;
    if (!ctx) return;
    this.donutChart?.destroy();
    this.donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Activos','Inactivos','Mantenimiento'],
        datasets: [{
          data: [this.tenantsPorEstado.activos, this.tenantsPorEstado.inactivos, this.tenantsPorEstado.mantenimiento],
          backgroundColor: ['#185FA5','#E24B4A','#EF9F27'],
          borderWidth: 0, hoverOffset: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '70%',
        plugins: { legend: { display: false } }
      }
    });
  }

  private initLineChart(): void {
    const ctx = document.getElementById('lineChart') as HTMLCanvasElement;
    if (!ctx) return;
    this.lineChart?.destroy();
    this.lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Ene','Feb','Mar','Abr'],
        datasets: [
          { label: 'Pedidos', data: [210,245,289,312], borderColor: '#185FA5', backgroundColor: 'rgba(24,95,165,0.08)',  tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#185FA5' },
          { label: 'Tickets', data: [65,58,71,47],     borderColor: '#E24B4A', backgroundColor: 'rgba(226,75,74,0.08)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#E24B4A' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#888' } },
          y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 }, color: '#888' } }
        }
      }
    });
  }

  getBadgeClass(estado: string): string {
    const map: Record<string, string> = {
      'Activo':        'badge-activo',
      'Inactivo':      'badge-inactivo',
      'Mantenimiento': 'badge-mant',
    };
    return map[estado] ?? '';
  }

  getCategoriaClass(cat: string): string {
    const map: Record<string, string> = {
      'Tenant':     'cat-tenant',
      'Ticket':  'cat-ticket',
      'Pedido':  'cat-pedido',
      'Usuario': 'cat-usuario',
      'Local':   'cat-local',
    };
    return map[cat] ?? '';
  }

  verDetalle(widget: DashboardWidget): void {
    const route = this.widgetRoutes[widget].detail;
    this.router.navigate([route], { queryParams: { from: 'dashboard', widget } });
  }

  irModulo(widget: DashboardWidget): void {
    const route = this.widgetRoutes[widget].module;
    this.router.navigate([route], { queryParams: { from: 'dashboard' } });
  }

  irVista(route: string, queryParams: Record<string, string> = {}): void {
    const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
    this.router.navigate([normalizedRoute], {
      queryParams: {
        from: 'dashboard',
        ...queryParams,
      },
    });
  }

  refrescarWidget(widget: DashboardWidget): void {
    switch (widget) {
      case 'visitas':
        this.initBarChart();
        break;
      case 'estado':
        this.initDonutChart();
        break;
      case 'pedidos':
        this.initLineChart();
        break;
      case 'mapa':
        this.mapaLocalesComponent?.refresh();
        break;
      case 'registros':
        this.registrosRecientes = [...this.registrosRecientes];
        break;
      default:
        break;
    }
  }

  private actualizarMetricasPorRol(role: UserRole | null): void {
    const esSuperAdmin = role === 'super-admin';
    this.metricasVisibles = this.metricas.filter((m) => esSuperAdmin || m.label !== 'Total Tenants');
  }
}