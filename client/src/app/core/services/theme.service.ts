import { Injectable, signal } from '@angular/core';

export type Theme = 'light';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly currentTheme = signal<Theme>('light');

  constructor() {
    this.initTheme();
  }

  private initTheme() {
    // Always enforce light mode
    localStorage.removeItem('wondercart_theme');
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark-theme');
  }

  setTheme(_theme: Theme) {
    this.currentTheme.set('light');
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark-theme');
  }

  toggleTheme() {
    // No-op - light mode only
    this.setTheme('light');
  }

  isDark(): boolean {
    return false;
  }
}
