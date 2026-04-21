import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FilterService } from '../../core/services/filter.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.html',
  styleUrls: ['./perfil.css'],
})
export class Perfil implements OnInit {
  nombre = 'Administrador Principal';
  email = 'admin@friocheck.com';
  passwordActual = '';
  passwordNueva = '';
  showCurrentPassword = false;
  showNewPassword = false;

  constructor(
    private filterService: FilterService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.filterService.setActiveView('perfil');
  }

  guardar() {
    // lógica de guardado
  }

  toggleCurrentPasswordVisibility(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  cambiarContrasena(): void {
    // Placeholder para futura integracion con backend.
    this.passwordActual = '';
    this.passwordNueva = '';
    this.showCurrentPassword = false;
    this.showNewPassword = false;
  }
}
