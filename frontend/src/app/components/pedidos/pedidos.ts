import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterService } from '../../core/services/filter.service';
import { ViewSearchFiltersComponent } from '../view-search-filters/view-search-filters.component';
import { Subscription } from 'rxjs';
import { BackendSale, SalesService } from '../../core/services/sales.service';

interface Pedido {
  orden: string;
  material: string;
  cantidad: number;
  unidad: string;
  prioridad: string;
  fechaSolicitud: string;
  estado: string;
  observaciones?: string;
  tipo?: string;
  fechaISO?: string;
}

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, ViewSearchFiltersComponent],
  templateUrl: './pedidos.html',
  styleUrls: ['./pedidos.css']
})
export class Pedidos implements OnInit, OnDestroy {
  activeTab = 'list';
  pedidos: Pedido[] = [];
  private allPedidos: Pedido[] = [];
  private readonly subscriptions = new Subscription();

  newPedido: Partial<Pedido> = {
    material: '',
    cantidad: 0,
    unidad: 'uds',
    prioridad: 'Media',
    fechaSolicitud: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
    observaciones: ''
  };

  unidades = ['uds', 'kg', 'm', 'l', 'm²', 'm³'];
  prioridades = ['Baja', 'Media', 'Alta', 'Urgente'];
  selectedPedido?: Pedido;

  constructor(
    private filterService: FilterService,
    private salesService: SalesService,
  ) {}

  ngOnInit(): void {
    this.filterService.setActiveView('pedidos');

    this.subscriptions.add(
      this.filterService.filters$.subscribe((filters) => {
        this.applyActiveFilters(filters);
      }),
    );

    this.loadSales();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  selectPedido(pedido: Pedido): void {
    this.selectedPedido = this.selectedPedido?.orden === pedido.orden ? undefined : pedido;
  }

  createPedido(): void {
    if (!this.newPedido.material || !this.newPedido.cantidad) {
      return;
    }

    const orden = this.generateOrden();
    const pedido: Pedido = {
      orden,
      material: this.newPedido.material,
      cantidad: this.newPedido.cantidad,
      unidad: this.newPedido.unidad || 'uds',
      prioridad: this.newPedido.prioridad || 'Media',
      fechaSolicitud: this.newPedido.fechaSolicitud || new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
      estado: 'Pendiente',
      observaciones: this.newPedido.observaciones
    };

    this.pedidos.unshift(pedido);
    this.allPedidos.unshift(pedido);
    this.applyActiveFilters(this.filterService.getFilters());
    this.resetForm();
    this.setActiveTab('list');
  }

  private loadSales(): void {
    this.salesService.getSales().subscribe((sales) => {
      this.allPedidos = sales.map((sale) => this.mapSaleToPedido(sale));
      this.applyActiveFilters(this.filterService.getFilters());

      if (this.selectedPedido) {
        this.selectedPedido = this.pedidos.find((p) => p.orden === this.selectedPedido?.orden);
      }
    });
  }

  private mapSaleToPedido(sale: BackendSale): Pedido {
    const description = sale.description?.trim();
    const detailParts: string[] = [];

    if (sale.tenantName) {
      detailParts.push(`Tenant: ${sale.tenantName}`);
    }

    if (sale.machineId) {
      detailParts.push(`Maquina ID: ${sale.machineId}`);
    }

    if (sale.vendorId) {
      detailParts.push(`Vendedor ID: ${sale.vendorId}`);
    }

    return {
      orden: sale.id,
      material: description && description.length > 0 ? description : `Venta ${sale.id.slice(0, 8)}`,
      cantidad: sale.amount,
      unidad: 'CLP',
      prioridad: this.mapPriorityByAmount(sale.amount),
      fechaSolicitud: this.toDisplayDate(sale.saleDate),
      estado: 'Entregado',
      observaciones: detailParts.join(' | '),
      tipo: 'venta',
      fechaISO: sale.saleDate,
    };
  }

  private mapPriorityByAmount(amount: number): string {
    if (amount >= 100000) {
      return 'Alta';
    }

    if (amount >= 30000) {
      return 'Media';
    }

    return 'Baja';
  }

  private toDisplayDate(dateIso: string): string {
    const date = new Date(dateIso);
    if (Number.isNaN(date.getTime())) {
      return 'Fecha desconocida';
    }

    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private applyActiveFilters(filters: { [key: string]: string }): void {
    const normalizedSearch = (filters['search'] ?? '').toLowerCase().trim();
    const normalizedStatus = (filters['status'] ?? '').toLowerCase().trim();
    const normalizedType = (filters['type'] ?? '').toLowerCase().trim();
    const dateFilter = (filters['date'] ?? '').trim();

    this.pedidos = this.allPedidos.filter((pedido) => {
      const matchesSearch =
        !normalizedSearch ||
        [pedido.orden, pedido.material, pedido.observaciones ?? '', pedido.estado, pedido.prioridad]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        !normalizedStatus || this.matchesStatusFilter(pedido.estado, normalizedStatus);

      const matchesType = !normalizedType || this.matchesTypeFilter(pedido.tipo ?? '', normalizedType);

      const matchesDate = !dateFilter || this.matchesDateFilter(pedido.fechaISO, dateFilter);

      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });

    if (this.selectedPedido && !this.pedidos.some((pedido) => pedido.orden === this.selectedPedido?.orden)) {
      this.selectedPedido = undefined;
    }
  }

  private matchesStatusFilter(currentStatus: string, filterValue: string): boolean {
    const normalizedCurrent = currentStatus.toLowerCase();

    if (filterValue === 'en-proceso') {
      return normalizedCurrent === 'en proceso' || normalizedCurrent === 'en camino';
    }

    return normalizedCurrent === filterValue;
  }

  private matchesTypeFilter(currentType: string, filterValue: string): boolean {
    const normalizedCurrent = currentType.toLowerCase();

    if (filterValue === 'venta') {
      return normalizedCurrent === 'venta';
    }

    if (filterValue === 'compra') {
      return normalizedCurrent === 'compra';
    }

    if (filterValue === 'servicio') {
      return normalizedCurrent === 'servicio';
    }

    return normalizedCurrent === filterValue;
  }

  private matchesDateFilter(dateIso: string | undefined, dateFilter: string): boolean {
    if (!dateIso) {
      return false;
    }

    const date = new Date(dateIso);
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const normalizedDate = `${year}-${month}-${day}`;

    return normalizedDate === dateFilter;
  }

  private generateOrden(): string {
    const maxOrden = this.pedidos
      .map(p => parseInt(p.orden.split('-')[1]))
      .reduce((max, num) => Math.max(max, num), 0);
    return `ORD-${String(maxOrden + 1).padStart(4, '0')}`;
  }

  private resetForm(): void {
    this.newPedido = {
      material: '',
      cantidad: 0,
      unidad: 'uds',
      prioridad: 'Media',
      fechaSolicitud: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
      observaciones: ''
    };
  }
}
