import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

function collectDistFiles(dir: string, rootDir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const urls: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      urls.push(...collectDistFiles(fullPath, rootDir));
    } else if (entry.name !== 'sw.js') {
      const rel = path.relative(rootDir, fullPath).split(path.sep).join('/');
      urls.push(`/${rel}`);
    }
  }

  return urls;
}

function pwaPrecachePlugin(): Plugin {
  let outDir = 'dist';

  return {
    name: 'gui-ve-pwa-precache',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const swPath = path.join(outDir, 'sw.js');
      if (!fs.existsSync(swPath)) {
        return;
      }

      const files = collectDistFiles(outDir, outDir).sort();
      const precacheUrls = Array.from(new Set(['/', ...files]));

      const hasher = createHash('sha256');
      for (const relUrl of files) {
        const filePath = path.join(outDir, relUrl.slice(1));
        hasher.update(relUrl);
        hasher.update(fs.readFileSync(filePath));
      }
      const cacheName = `gui-ve-${hasher.digest('hex').slice(0, 12)}`;

      const template = fs.readFileSync(swPath, 'utf-8');
      const output = template
        .replace('__GUI_VE_CACHE_NAME__', cacheName)
        .replace('__GUI_VE_PRECACHE_URLS__', JSON.stringify(precacheUrls));

      fs.writeFileSync(swPath, output, 'utf-8');
    },
  };
}

export default defineConfig({
  plugins: [react(), pwaPrecachePlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});
