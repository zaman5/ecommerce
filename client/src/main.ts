import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';

// Auto-recover if browser tries to load an old chunk that was replaced by a new deployment
window.addEventListener('error', (e: ErrorEvent) => {
  const msg = e?.message || '';
  if (/Loading chunk|Failed to load module script|MIME type of "text\/html"/i.test(msg)) {
    const key = 'chunk_reload_retry_' + Date.now();
    const lastReload = Number(sessionStorage.getItem('last_chunk_reload') || '0');
    if (Date.now() - lastReload > 10000) {
      sessionStorage.setItem('last_chunk_reload', String(Date.now()));
      window.location.reload();
    }
  }
});

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
}).catch((err) => console.error(err));
