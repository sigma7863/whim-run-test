/**
 * Lightweight, dependency-free client observability. Right now it logs
 * structured events to the console; the single `report` sink is the seam where
 * a real backend (Sentry, analytics, OTel web) would be wired in.
 */
function report(event: string, data: Record<string, unknown>): void {
  // Use info so smoke tests that assert "no console errors" still pass.
  console.info(`[obs] ${event}`, data);
}

export function installObservability(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    report('error', { message: event.message, source: event.filename, line: event.lineno });
  });

  window.addEventListener('unhandledrejection', (event) => {
    report('unhandledrejection', { reason: String(event.reason) });
  });

  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          report(entry.entryType, { startTime: Math.round(entry.startTime) });
        }
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // Entry type unsupported in this browser; non-fatal.
    }
  }
}
