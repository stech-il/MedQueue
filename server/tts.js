import { EdgeTTS } from 'node-edge-tts';
import { mkdtemp, readFile, unlink, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export const HEBREW_VOICES = [
  { id: 'he-IL-HilaNeural', label: 'הילה (נשי, מומלץ)' },
  { id: 'he-IL-AvriNeural', label: 'אברי (גברי)' },
];

/** קולות Gemini — מתאימים להקראות (עברית מזוהה אוטומטית) */
export const GEMINI_VOICES = [
  { id: 'Kore', label: 'Kore — ברור ויציב (מומלץ)' },
  { id: 'Charon', label: 'Charon — אינפורמטיבי' },
  { id: 'Achird', label: 'Achird — ידידותי' },
  { id: 'Sulafat', label: 'Sulafat — חם' },
  { id: 'Vindemiatrix', label: 'Vindemiatrix — עדין' },
  { id: 'Puck', label: 'Puck — עליז' },
  { id: 'Zephyr', label: 'Zephyr — בהיר' },
  { id: 'Aoede', label: 'Aoede — קליל' },
];

export const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash-preview-tts', label: 'Flash 2.5 (חינמי, מומלץ)' },
  { id: 'gemini-3.1-flash-tts-preview', label: 'Flash 3.1 (חדש יותר)' },
];

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models';

function trimText(text) {
  return String(text).trim().slice(0, 500);
}

function getGeminiApiKey(settings = {}) {
  return settings.tts_gemini_api_key?.trim() || process.env.GEMINI_API_KEY?.trim() || '';
}

function pcmToWav(pcm, sampleRate = 24000) {
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]);
}

function parseSampleRate(mimeType = '') {
  const m = String(mimeType).match(/rate=(\d+)/i);
  return m ? Number(m[1]) : 24000;
}

export async function synthesizeEdge(text, settings = {}) {
  const trimmed = trimText(text);
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
    const buffer = await readFile(file);
    return { buffer, contentType: 'audio/mpeg', ext: 'mp3' };
  } finally {
    await unlink(file).catch(() => {});
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function synthesizeGemini(text, settings = {}) {
  const trimmed = trimText(text);
  if (!trimmed) throw new Error('אין טקסט להקראה');

  const apiKey = getGeminiApiKey(settings);
  if (!apiKey) {
    throw new Error('חסר מפתח Gemini — הגדר בהגדרות → הקראה או GEMINI_API_KEY בשרת');
  }

  const model = settings.tts_gemini_model?.trim() || 'gemini-2.5-flash-preview-tts';
  const voice =
    settings.tts_gemini_voice?.trim() ||
    GEMINI_VOICES[0]?.id ||
    'Kore';

  const style = settings.tts_gemini_style?.trim();
  const prompt = style ? `${style}\n\n${trimmed}` : trimmed;

  const url = `${GEMINI_API}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    }),
    signal: AbortSignal.timeout(30000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Gemini TTS ${res.status}`;
    throw new Error(msg);
  }

  const inline = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  const b64 = inline?.inlineData?.data;
  if (!b64) throw new Error('Gemini לא החזיר אודיו');

  const pcm = Buffer.from(b64, 'base64');
  const sampleRate = parseSampleRate(inline.inlineData.mimeType);
  const buffer = pcmToWav(pcm, sampleRate);
  return { buffer, contentType: 'audio/wav', ext: 'wav' };
}

export async function synthesizeSpeech(text, settings = {}) {
  const provider = settings.tts_provider || 'edge';
  if (provider === 'gemini') return synthesizeGemini(text, settings);
  return synthesizeEdge(text, settings);
}

export async function listHebrewEdgeVoices() {
  return HEBREW_VOICES.map((v) => ({ id: v.id, label: v.label }));
}

export function listGeminiVoices() {
  return GEMINI_VOICES.map((v) => ({ id: v.id, label: v.label }));
}

export function listGeminiModels() {
  return GEMINI_MODELS.map((m) => ({ id: m.id, label: m.label }));
}
