/**
 * משחרר פורטים 3001 (שרת) ו-5173 (Vite) לפני npm run dev
 */
import { execSync } from 'child_process';

const PORTS = [3001, 5173];

function freePortWindows(port) {
  try {
    const out = execSync(`netstat -ano | findstr ":${port}"`, { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split('\n')) {
      if (!line.includes('LISTENING')) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`[free-ports] שוחרר פורט ${port} (PID ${pid})`);
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* nothing listening */
  }
}

function freePortUnix(port) {
  try {
    const pid = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim();
    if (pid) {
      execSync(`kill -9 ${pid}`);
      console.log(`[free-ports] שוחרר פורט ${port} (PID ${pid})`);
    }
  } catch {
    /* nothing listening */
  }
}

const free = process.platform === 'win32' ? freePortWindows : freePortUnix;
for (const port of PORTS) free(port);
