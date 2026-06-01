import { EdgeTTS } from 'node-edge-tts';
import { mkdtemp, readFile, unlink, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export const HEBREW_VOICES = [
  { id: 'he-IL-HilaNeural', label: 'הילה (נשי, מומלץ)' },
  { id: 'he-IL-AvriNeural', label: 'אברי (גברי)' },
];

export async function synthesizeEdge(text, settings = {}) {
  const trimmed = String(text).trim().slice(0, 500);
  if (!trimmed) throw new Error('אין טקסט להקראה');

  const tts = new EdgeTTS({
    voice: settings.tts_edge_voice || 'he-IL-HilaNeural',
    lang: 'he-IL',
    rate: settings.tts_edge_rate || '-5%',
    outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
    timeout: 20000,
  });

  const dir = await mkdtemp(join(tmpdir(), 'medqueue-tts-'));
  const file = join(dir, 'speech.mp3');
  try {
    await tts.ttsPromise(trimmed, file);
    return await readFile(file);
  } finally {
    await unlink(file).catch(() => {});
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function listHebrewEdgeVoices() {
  return HEBREW_VOICES.map((v) => ({ id: v.id, label: v.label }));
}
