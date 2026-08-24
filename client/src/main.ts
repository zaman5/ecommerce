import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';

// Auto-recover if browser tries to load an old chunk that was replaced by a new deployment
function handleChunkError(errStr: string) {
  if (/Loading chunk|Failed to fetch dynamically imported module|Failed to load resource|error loading dynamically imported module|MIME type of "text\/html"/i.test(errStr)) {
    const lastReload = Number(sessionStorage.getItem('last_chunk_reload') || '0');
    if (Date.now() - lastReload > 8000) {
      sessionStorage.setItem('last_chunk_reload', String(Date.now()));
      window.location.reload();
    }
  }
}

window.addEventListener('error', (e: ErrorEvent) => {
  handleChunkError(e?.message || '');
});

window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
  const reason = e?.reason?.message || String(e?.reason || '');
  handleChunkError(reason);
});

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
}).catch((err) => console.error(err));
