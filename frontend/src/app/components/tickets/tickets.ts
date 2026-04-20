import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterService } from '../../core/services/filter.service';
import { ViewSearchFiltersComponent } from '../view-search-filters/view-search-filters.component';

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
  tickets: Ticket[] = [
    {
      id: 'TK-1042',
      asunto: 'Pérdida de frío en vitrina',
      prioridad: 'Alta',
      equipo: 'NFC-1933',
      creacion: 'Hace 2 horas',
      estado: 'Abierto',
      descripcion: 'Se reporta una caída de temperatura en la vitrina principal. Requiere revisión urgente del compresor y del sistema de refrigeración.',
    },
    {
      id: 'TK-1041',
      asunto: 'Luz LED parpadeando',
      prioridad: 'Baja',
      equipo: 'NFC-8472',
      creacion: 'Ayer',
      estado: 'En Progreso',
      descripcion: 'La luz led del contenedor parpadea de forma intermitente. Se solicita verificar el circuito y reemplazar el driver si es necesario.',
    },
    {
      id: 'TK-1040',
      asunto: 'Compresor hace ruido inusual',
      prioridad: 'Media',
      equipo: 'NFC-3311',
      creacion: 'Hace 3 días',
      estado: 'Pendiente',
      descripcion: 'El compresor emite un ruido extraño al encenderse. Se recomienda inspeccionar vibraciones y montaje mecánico.',
    },
  ];

  selectedTicket?: Ticket;

  constructor(private filterService: FilterService) {}

  ngOnInit(): void {
    this.filterService.setActiveView('tickets');
  }

  selectTicket(ticket: Ticket): void {
    this.selectedTicket = this.selectedTicket?.id === ticket.id ? undefined : ticket;
  }
}
