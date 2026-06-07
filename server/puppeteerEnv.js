/** חייב לרוץ לפני import של puppeteer — קובע איפה Chrome מותקן */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const serverDir = dirname(fileURLToPath(import.meta.url));
const cacheDir = process.env.PUPPETEER_CACHE_DIR || join(serverDir, '.puppeteer-cache');

if (!process.env.PUPPETEER_CACHE_DIR) {
  process.env.PUPPETEER_CACHE_DIR = cacheDir;
}
mkdirSync(cacheDir, { recursive: true });
