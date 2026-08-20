import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly currentTheme = signal<Theme>('light');

  constructor() {
    this.initTheme();
  }

  private initTheme() {
    // Default to light mode unless explicitly saved as dark in localStorage
    const saved = localStorage.getItem('wondercart_theme') as Theme | null;
    const initialTheme: Theme = saved === 'dark' ? 'dark' : 'light';
    this.setTheme(initialTheme);
  }

  setTheme(theme: Theme) {
    this.currentTheme.set(theme);
    localStorage.setItem('wondercart_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-theme');
    }
  }

  toggleTheme() {
    const next: Theme = this.currentTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  isDark(): boolean {
    return this.currentTheme() === 'dark';
  }
}
