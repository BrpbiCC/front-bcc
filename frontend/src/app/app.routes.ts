import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Dashboard } from './components/dashboard/dashboard';
import { Activos } from './components/activos/activos';
import { Visitas } from './components/visitas/visitas';
import { Tickets } from './components/tickets/tickets';
import { TicketDetail } from './components/ticket-detail/ticket-detail';
import { Pedidos } from './components/pedidos/pedidos';
import { Locales } from './components/locales/locales';
import { Reportes } from './components/reportes/reportes';
import { Usuarios } from './components/usuarios/usuarios';
import { Perfil } from './components/perfil/perfil';
import { Tenants } from './components/tenants/tenants';
import { TenantDetail } from './components/tenant-detail/tenant-detail';
import { MetricasGlobales } from './components/metricas-globales/metricas-globales';
import { Unauthorized } from './components/unauthorized/unauthorized';
import { roleGuard } from './core/guards/role.guard';
import { authGuard, dashboardRedirectGuard, publicOnlyGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [publicOnlyGuard] },
  { path: 'unauthorized', component: Unauthorized, canActivate: [authGuard] },

  { path: 'dashboard', component: Dashboard, canActivate: [dashboardRedirectGuard] },
  { path: 'dashboard/admin', component: Dashboard, canActivate: [authGuard, () => roleGuard(['admin'])] },
  { path: 'dashboard/support', component: Dashboard, canActivate: [authGuard, () => roleGuard(['support'])] },
  { path: 'dashboard/superadmin', component: Dashboard, canActivate: [authGuard, () => roleGuard(['super-admin'])] },

  { path: 'activos', component: Activos, canActivate: [authGuard] },
  { path: 'visitas', component: Visitas, canActivate: [authGuard] },
  { path: 'tickets', component: Tickets, canActivate: [authGuard] },
  { path: 'tickets/:id', component: TicketDetail, canActivate: [authGuard] },
  { path: 'pedidos', component: Pedidos, canActivate: [authGuard] },
  { path: 'locales', component: Locales, canActivate: [authGuard] },
  { path: 'reportes', component: Reportes, canActivate: [authGuard] },
  { path: 'usuarios', component: Usuarios, canActivate: [authGuard] },
  { path: 'perfil', component: Perfil, canActivate: [authGuard] },

  { path: 'tenants', component: Tenants, canActivate: [authGuard, () => roleGuard(['super-admin'])] },
  { path: 'tenants/:id', component: TenantDetail, canActivate: [authGuard, () => roleGuard(['super-admin'])] },
  { path: 'metricas-globales', component: MetricasGlobales, canActivate: [authGuard, () => roleGuard(['super-admin'])] },

  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },
];