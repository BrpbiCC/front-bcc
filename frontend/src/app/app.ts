import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Sidebar } from './components/sidebar/sidebar';
import { Topbar } from './components/topbar/topbar';
import { filter } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Sidebar, Topbar, CommonModule],
  templateUrl: './app.html',
  styleUrl: '././styles/app.css',
})
export class App {
  showMenu = false;

  constructor(private router: Router) {
    this.showMenu = !this.isPublicRoute(this.router.url);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects;
        this.showMenu = !this.isPublicRoute(url);
      });
  }

  private isPublicRoute(url: string): boolean {
    return url === '/login' || url === '/';
  }
}
