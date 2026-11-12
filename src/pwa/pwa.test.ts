import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from './registerSw';

describe('PWA configuration & service worker registration', () => {
  it('provides a valid Vietnamese web app manifest with PNG and SVG icons', () => {
    const manifestPath = path.resolve(process.cwd(), 'public/manifest.webmanifest');
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw) as {
      name: string;
      short_name: string;
      start_url: string;
      display: string;
      lang: string;
      background_color: string;
      theme_color: string;
      icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
    };

    expect(manifest.short_name).toBe('Gửi Về');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.lang).toBe('vi');
    expect(manifest.background_color).toBe('#F5F7F9');
    expect(manifest.theme_color).toBe('#155EEF');

    const icon192 = manifest.icons.find((i) => i.sizes === '192x192' && i.type === 'image/png');
    const icon512 = manifest.icons.find((i) => i.sizes === '512x512' && i.type === 'image/png');
    expect(icon192).toBeDefined();
    expect(icon512).toBeDefined();

    for (const icon of manifest.icons) {
      const fileOnDisk = path.resolve(process.cwd(), 'public', icon.src.replace(/^\//, ''));
      expect(fs.existsSync(fileOnDisk)).toBe(true);
    }
  });

  it('keeps cross-origin FX API requests out of the service worker cache', () => {
    const swTemplate = fs.readFileSync(
      path.resolve(process.cwd(), 'public/sw.js'),
      'utf-8',
    );
    expect(swTemplate).toContain('url.origin !== self.location.origin');
  });

  it('registers /sw.js only in production mode when serviceWorker is supported', () => {
    const register = vi.fn().mockResolvedValue({});
    const addEventListener = vi.fn((_ev: string, cb: () => void) => cb());

    registerServiceWorker({
      isProd: false,
      navigatorObj: { serviceWorker: { register } as unknown as ServiceWorkerContainer },
      windowObj: { addEventListener } as unknown as Window,
      documentObj: { readyState: 'loading' },
    });
    expect(register).not.toHaveBeenCalled();

    registerServiceWorker({
      isProd: true,
      navigatorObj: { serviceWorker: { register } as unknown as ServiceWorkerContainer },
      windowObj: { addEventListener } as unknown as Window,
      documentObj: { readyState: 'complete' },
    });
    expect(register).toHaveBeenCalledWith('/sw.js');
  });
});
