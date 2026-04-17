import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ticket-detail.html',
  styleUrls: ['./ticket-detail.css'],
})
export class TicketDetail implements OnInit {
  ticketId = '';

  constructor(private readonly route: ActivatedRoute) {}

  ngOnInit(): void {
    this.ticketId = this.route.snapshot.paramMap.get('id') ?? '';
  }
}
