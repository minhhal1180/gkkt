export interface RegisterSwOptions {
  isProd?: boolean;
  navigatorObj?: Partial<Pick<Navigator, 'serviceWorker'>>;
  windowObj?: Pick<Window, 'addEventListener'>;
  documentObj?: Pick<Document, 'readyState'>;
}

/**
 * Registers the static app-shell Service Worker in production builds.
 */
export function registerServiceWorker(options: RegisterSwOptions = {}): void {
  const isProd = options.isProd ?? import.meta.env.PROD;
  const nav =
    options.navigatorObj ??
    (typeof navigator !== 'undefined' ? navigator : undefined);
  const win =
    options.windowObj ?? (typeof window !== 'undefined' ? window : undefined);
  const doc =
    options.documentObj ??
    (typeof document !== 'undefined' ? document : undefined);

  if (!isProd || !nav?.serviceWorker || !win) {
    return;
  }

  const doRegister = () => {
    nav.serviceWorker?.register('/sw.js').catch(() => {
      // Service Worker failure must never block or break app rendering.
    });
  };

  if (doc?.readyState === 'complete') {
    doRegister();
  } else {
    win.addEventListener('load', doRegister, { once: true });
  }
}
