import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterService } from '../../core/services/filter.service';
import { BackendTicket, TicketsService } from '../../core/services/tickets.service';
import { ViewSearchFiltersComponent } from '../view-search-filters/view-search-filters.component';
import { Subscription } from 'rxjs';

interface Ticket {
  id: string;
  asunto: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  equipo: string;
  creacion: string;
  estado: string;
  descripcion: string;
}

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [CommonModule, ViewSearchFiltersComponent],
  templateUrl: './tickets.html',
  styleUrls: ['./tickets.css'],
})
export class Tickets implements OnInit {
  tickets: Ticket[] = [];
  private allTickets: Ticket[] = [];
  private readonly subscriptions = new Subscription();

  selectedTicket?: Ticket;

  constructor(
    private filterService: FilterService,
    private ticketsService: TicketsService,
  ) {}

  ngOnInit(): void {
    this.filterService.setActiveView('tickets');

    this.subscriptions.add(
      this.filterService.filters$.subscribe((filters) => {
        this.applyActiveFilters(filters);
      }),
    );

    this.loadTickets();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  selectTicket(ticket: Ticket): void {
    if (this.selectedTicket?.id === ticket.id) {
      this.selectedTicket = undefined;
      return;
    }

    this.ticketsService.getTicketById(ticket.id).subscribe((backendTicket) => {
      this.selectedTicket = backendTicket ? this.mapBackendTicket(backendTicket) : ticket;
    });
  }

  private loadTickets(): void {
    this.ticketsService.getTickets().subscribe((backendTickets) => {
      this.allTickets = backendTickets.map((ticket) => this.mapBackendTicket(ticket));
      this.applyActiveFilters(this.filterService.getFilters());

      if (this.selectedTicket) {
        this.selectedTicket = this.tickets.find((t) => t.id === this.selectedTicket?.id);
      }
    });
  }

  private applyActiveFilters(filters: { [key: string]: string }): void {
    const normalizedSearch = (filters['search'] ?? '').toLowerCase().trim();
    const normalizedStatus = (filters['status'] ?? '').toLowerCase().trim();
    const normalizedPriority = (filters['priority'] ?? '').toLowerCase().trim();

    this.tickets = this.allTickets.filter((ticket) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          ticket.id,
          ticket.asunto,
          ticket.descripcion,
          ticket.equipo,
          ticket.estado,
          ticket.prioridad,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        !normalizedStatus ||
        this.matchesStatusFilter(ticket.estado, normalizedStatus);

      const matchesPriority =
        !normalizedPriority ||
        this.matchesPriorityFilter(ticket.prioridad, normalizedPriority);

      return matchesSearch && matchesStatus && matchesPriority;
    });

    if (this.selectedTicket && !this.tickets.some((ticket) => ticket.id === this.selectedTicket?.id)) {
      this.selectedTicket = undefined;
    }
  }

  private matchesStatusFilter(currentStatus: string, filterValue: string): boolean {
    const normalizedCurrent = currentStatus.toLowerCase();

    if (filterValue === 'sin-resolver') {
      return normalizedCurrent === 'abierto' || normalizedCurrent === 'pendiente';
    }

    if (filterValue === 'en-proceso') {
      return normalizedCurrent === 'en progreso';
    }

    if (filterValue === 'resuelto') {
      return normalizedCurrent === 'cerrado';
    }

    return normalizedCurrent === filterValue;
  }

  private matchesPriorityFilter(currentPriority: Ticket['prioridad'], filterValue: string): boolean {
    const normalizedCurrent = currentPriority.toLowerCase();

    if (filterValue === 'alta') {
      return normalizedCurrent === 'alta';
    }

    if (filterValue === 'media') {
      return normalizedCurrent === 'media';
    }

    if (filterValue === 'baja') {
      return normalizedCurrent === 'baja';
    }

    return normalizedCurrent === filterValue;
  }

  private mapBackendTicket(ticket: BackendTicket): Ticket {
    return {
      id: ticket.id,
      asunto: ticket.title,
      prioridad: this.mapPriority(ticket.priority),
      equipo: ticket.machineId,
      creacion: this.toRelativeDate(ticket.createdAt),
      estado: this.mapStatus(ticket.status),
      descripcion: ticket.description,
    };
  }

  private mapPriority(priority: string): Ticket['prioridad'] {
    switch ((priority ?? '').toLowerCase()) {
      case 'high':
        return 'Alta';
      case 'low':
        return 'Baja';
      default:
        return 'Media';
    }
  }

  private mapStatus(status: string): string {
    switch ((status ?? '').toLowerCase()) {
      case 'open':
        return 'Abierto';
      case 'in_progress':
      case 'in-progress':
        return 'En Progreso';
      case 'pending':
        return 'Pendiente';
      case 'closed':
        return 'Cerrado';
      default:
        return status || 'Sin estado';
    }
  }

  private toRelativeDate(dateIso: string): string {
    const date = new Date(dateIso);
    if (Number.isNaN(date.getTime())) {
      return 'Fecha desconocida';
    }

    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSeconds = Math.round(diffMs / 1000);
    const absSeconds = Math.abs(diffSeconds);

    const rtf = new Intl.RelativeTimeFormat('es-CL', { numeric: 'auto' });

    if (absSeconds < 60) {
      return rtf.format(diffSeconds, 'second');
    }

    const diffMinutes = Math.round(diffSeconds / 60);
    if (Math.abs(diffMinutes) < 60) {
      return rtf.format(diffMinutes, 'minute');
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, 'hour');
    }

    const diffDays = Math.round(diffHours / 24);
    if (Math.abs(diffDays) < 30) {
      return rtf.format(diffDays, 'day');
    }

    const diffMonths = Math.round(diffDays / 30);
    if (Math.abs(diffMonths) < 12) {
      return rtf.format(diffMonths, 'month');
    }

    const diffYears = Math.round(diffMonths / 12);
    return rtf.format(diffYears, 'year');
  }
}
