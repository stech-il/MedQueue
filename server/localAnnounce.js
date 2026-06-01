import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawn } from 'child_process';
import * as tts from './tts.js';
import { buildTicketAnnounceText, buildDoctorSummonText } from './announceText.js';

let busy = false;
const queue = [];

function enqueue(job) {
  queue.push(job);
  drain().catch((e) => console.warn('localAnnounce drain:', e));
}

async function drain() {
  if (busy || !queue.length) return;
  busy = true;
  const { text, settings, chime } = queue.shift();
  try {
    if (chime) await playSummonChime();
    const audio = await tts.synthesizeEdge(text, settings);
    await playMp3Buffer(audio);
  } catch (e) {
    console.warn('localAnnounce:', e.message || e);
  } finally {
    busy = false;
    if (queue.length) drain().catch(() => {});
  }
}

export function announceTicketCall(ticket, room, settings) {
  if (!ticket || !room) return;
  enqueue({
    text: buildTicketAnnounceText(ticket, room),
    settings,
    chime: false,
  });
}

export function announceDoctorSummon(room, settings) {
  if (!room) return;
  enqueue({
    text: buildDoctorSummonText(room),
    settings,
    chime: true,
  });
}

async function playSummonChime() {
  /* צליל דינג-דונג נשאר במסך תצוגה (Web Audio); בשרת רק ההקראה */
}

function playMp3Buffer(buffer) {
  const path = join(tmpdir(), `medqueue-${Date.now()}.mp3`);
  return writeFile(path, buffer)
    .then(() => playFile(path))
    .finally(() => {
      setTimeout(() => unlink(path).catch(() => {}), 15000);
    });
}

function playFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  if (process.platform === 'win32') {
    return playWindows(normalized);
  }
  if (process.platform === 'darwin') {
    return playProcess('afplay', [filePath]);
  }
  return playProcess('ffplay', ['-nodisp', '-autoexit', '-loglevel', 'quiet', filePath]).catch(() =>
    playProcess('mpg123', ['-q', filePath])
  );
}

function playWindows(filePath) {
  const uri = 'file:///' + filePath.replace(/\\/g, '/').replace(/'/g, "''");
  const script = `
$wmp = New-Object -ComObject WMPlayer.OCX
$wmp.settings.volume = 100
$wmp.URL = '${uri}'
$wmp.controls.play()
Start-Sleep -Milliseconds 400
$wait = 0
while ($wmp.playState -eq 3 -and $wait -lt 120) {
  Start-Sleep -Milliseconds 250
  $wait++
}
$wmp.close()
`;
  return playProcess('powershell', ['-NoProfile', '-NoLogo', '-Command', script], 90000);
}

function playProcess(cmd, args, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true, stdio: 'ignore' });
    let done = false;
    const finish = (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolve();
    };
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      finish();
    }, timeoutMs);
    child.on('error', (e) => finish(e));
    child.on('close', (code) => {
      if (code !== 0 && cmd !== 'powershell') finish(new Error(`${cmd} exit ${code}`));
      else finish();
    });
  });
}
