import fs from 'fs';
import path from 'path';

/** מציאת Chrome / Edge להדפסת HTML מעוצב */
export function findChromiumExecutable() {
  const roots = [
    process.env['ProgramFiles'],
    process.env['ProgramFiles(x86)'],
    process.env.LOCALAPPDATA,
  ].filter(Boolean);

  const relPaths = [
    'Google\\Chrome\\Application\\chrome.exe',
    'Microsoft\\Edge\\Application\\msedge.exe',
    path.join('Google', 'Chrome', 'Application', 'chrome.exe'),
  ];

  for (const root of roots) {
    for (const rel of relPaths) {
      const p = path.join(root, rel);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}
