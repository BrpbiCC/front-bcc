import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, timer, map, startWith } from 'rxjs';

export interface DashboardMetrics {
  totalTenants: number;
  newTenantsThisMonth: number;
  visits: number;
  visitsWeeklyGrowth: number;
  openTickets: number;
  ticketsResolvedToday: number;
  activeOrders: number;
  ordersDailyGrowth: number;
  locals: number;
  localsWithoutTenants: number;
  users: number;
  usersMonthlyGrowth: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardRealtimeService {
  private socket$?: WebSocketSubject<any>;

  constructor() {}

  connect(): Observable<DashboardMetrics> {
    // Simular WebSocket con datos que cambian periódicamente
    // En producción, reemplazar con URL real del backend: 'ws://tu-servidor:puerto/dashboard'
    return timer(0, 5000).pipe( // Actualiza cada 5 segundos
      map(() => this.generateMockData()),
      startWith(this.generateMockData())
    );
  }

  private generateMockData(): DashboardMetrics {
    // Simular variaciones en los datos
    const baseData: DashboardMetrics = {
      totalTenants: 1284,
      newTenantsThisMonth: 12,
      visits: 8421,
      visitsWeeklyGrowth: 12.4,
      openTickets: 47,
      ticketsResolvedToday: 5,
      activeOrders: 312,
      ordersDailyGrowth: 8.1,
      locals: 63,
      localsWithoutTenants: 4,
      users: 5902,
      usersMonthlyGrowth: 4.7
    };

    // Agregar variación aleatoria pequeña
    return {
      totalTenants: baseData.totalTenants + Math.floor(Math.random() * 10) - 5,
      newTenantsThisMonth: Math.max(0, baseData.newTenantsThisMonth + Math.floor(Math.random() * 4) - 2),
      visits: baseData.visits + Math.floor(Math.random() * 50) - 25,
      visitsWeeklyGrowth: Math.max(0, baseData.visitsWeeklyGrowth + (Math.random() * 2 - 1)),
      openTickets: Math.max(0, baseData.openTickets + Math.floor(Math.random() * 6) - 3),
      ticketsResolvedToday: Math.max(0, baseData.ticketsResolvedToday + Math.floor(Math.random() * 4) - 2),
      activeOrders: baseData.activeOrders + Math.floor(Math.random() * 20) - 10,
      ordersDailyGrowth: Math.max(0, baseData.ordersDailyGrowth + (Math.random() * 2 - 1)),
      locals: baseData.locals,
      localsWithoutTenants: Math.max(0, baseData.localsWithoutTenants + Math.floor(Math.random() * 3) - 1),
      users: baseData.users + Math.floor(Math.random() * 30) - 15,
      usersMonthlyGrowth: Math.max(0, baseData.usersMonthlyGrowth + (Math.random() * 1 - 0.5))
    };
  }

  disconnect(): void {
    this.socket$?.complete();
  }
}