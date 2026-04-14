import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login implements OnInit, OnDestroy {
  loginForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });

  logoLight = '/imagenes/logos/FrioCheck.svg';
  logoDark = '/imagenes/logos/FrioCheckDark.svg';
  isLoading = false;
  loginError = '';
  loginSubmitted = false;
  showPassword = false;

  // Theme management
  isDarkTheme = false;

  // Modal de recuperación
  showForgotModal = false;
  forgotEmail = '';
  forgotIsLoading = false;
  forgotSuccessMessage = '';
  forgotErrorMessage = '';
  forgotRecoverySent = false;

  private subscriptions = new Subscription();

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.loadSavedTheme();
    this.redirectIfAuthenticated();
    this.subscriptions.add(
      this.loginForm.valueChanges.subscribe(() => {
        this.loginError = '';
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private redirectIfAuthenticated(): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    this.router.navigateByUrl(this.authService.getDashboardRoute());
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    this.applyTheme();
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
  }

  private loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    this.isDarkTheme = savedTheme === 'dark';
    this.applyTheme();
  }

  private applyTheme() {
    if (this.isDarkTheme) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  shouldShowFieldError(controlName: 'email' | 'password'): boolean {
    const control = this.loginForm.controls[controlName];
    return control.invalid && (control.touched || this.loginSubmitted);
  }

  getFieldError(controlName: 'email' | 'password'): string {
    const control = this.loginForm.controls[controlName];

    if (controlName === 'email') {
      if (control.hasError('required')) {
        return 'El correo es obligatorio.';
      }

      if (control.hasError('email')) {
        return 'Ingresa un correo válido (ejemplo@dominio.com).';
      }
    }

    if (controlName === 'password') {
      if (control.hasError('required')) {
        return 'La contraseña es obligatoria.';
      }

      if (control.hasError('minlength')) {
        const requiredLength = control.getError('minlength')?.requiredLength ?? 8;
        return `La contraseña debe tener al menos ${requiredLength} caracteres.`;
      }
    }

    return '';
  }

  onLogin(): void {
    this.loginSubmitted = true;
    this.loginForm.controls.email.setValue(this.loginForm.controls.email.value.trim());

    this.loginError = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.getRawValue();

    this.isLoading = true;

    this.authService
      .login({ email, password })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: (session) => {
          this.loginForm.markAsPristine();
          this.router.navigateByUrl(this.authService.getDashboardRoute(session.role));
        },
        error: (error: unknown) => {
          this.loginError = this.buildLoginError(error);
        },
      });
  }

  openForgotModal(event?: Event) {
    event?.preventDefault();
    this.showForgotModal = true;
    this.forgotEmail = '';
    this.forgotSuccessMessage = '';
    this.forgotErrorMessage = '';
    this.forgotRecoverySent = false;
  }

  closeForgotModal() {
    this.showForgotModal = false;
    this.forgotRecoverySent = false;
  }

  onSendRecovery() {
    this.forgotIsLoading = true;
    this.forgotSuccessMessage = '';
    this.forgotErrorMessage = '';

    // Simular envío de recuperación
    setTimeout(() => {
      // Simular éxito
      this.forgotSuccessMessage = 'Tu solicitud de recuperación fue enviada correctamente.';
      this.forgotRecoverySent = true;
      this.forgotIsLoading = false;

      // Cerrar automáticamente después de 2 segundos si fue exitoso
      setTimeout(() => {
        this.closeForgotModal();
      }, 2000);

      // Para simular error:
      // this.forgotErrorMessage = 'Usuario no encontrado. Verifica tu correo o usuario.';
      // this.forgotIsLoading = false;
    }, 1500);
  }

  private buildLoginError(error: unknown): string {
    const defaultMessage = 'No se pudo iniciar sesión. Verifica tus credenciales e inténtalo nuevamente.';

    if (!error || typeof error !== 'object') {
      return defaultMessage;
    }

    const httpError = error as Record<string, unknown>;
    const status = typeof httpError['status'] === 'number' ? httpError['status'] : null;

    if (status === 0) {
      return 'No fue posible conectar con el servidor de autenticación.';
    }

    const nestedError = this.asRecord(httpError['error']);
    const nestedMessage = this.getMessageValue(nestedError?.['message']);
    const topMessage = this.getMessageValue(httpError['message']);

    if (status === 401) {
      return nestedMessage ?? 'Credenciales inválidas. Revisa correo y contraseña.';
    }

    return nestedMessage ?? topMessage ?? defaultMessage;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object') {
      return value as Record<string, unknown>;
    }

    return null;
  }

  private getMessageValue(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (Array.isArray(value)) {
      const first = value.find((item) => typeof item === 'string' && item.trim());
      if (typeof first === 'string') {
        return first.trim();
      }
    }

    return null;
  }
}
