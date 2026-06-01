/** הקראה: Edge דרך השרת (Web Audio) או דפדפן. שחרור השמעה נשמר בין מסכי ה-SPA. */

import { api } from '../api';
import { getRoomAnnounceText } from './roomDisplay.js';

let voicesReady = null;
let announcing = false;
let cachedSettings = null;
let sharedAudioCtx = null;
let playbackUnlocked = false;
let persistentAudio = null;
const speakQueue = [];

async function getAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
  if (sharedAudioCtx.state === 'suspended') {
    try {
      await sharedAudioCtx.resume();
    } catch {
      /* ignore */
    }
  }
  return sharedAudioCtx;
}

function getPersistentAudio() {
  if (!persistentAudio) {
    persistentAudio = new Audio();
    persistentAudio.setAttribute('playsinline', '');
    persistentAudio.preload = 'auto';
  }
  return persistentAudio;
}

function scheduleBellTone(ctx, { freq, start, duration, volume = 0.38 }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, start);

  const partial = ctx.createOscillator();
  const partialGain = ctx.createGain();
  partial.type = 'triangle';
  partial.frequency.setValueAtTime(freq * 2.02, start);
  partialGain.gain.setValueAtTime(volume * 0.22, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  partial.connect(partialGain);
  gain.connect(ctx.destination);
  partialGain.connect(ctx.destination);

  osc.start(start);
  partial.start(start);
  osc.stop(start + duration + 0.08);
  partial.stop(start + duration + 0.08);
}

export async function playDoctorSummonChime() {
  const ctx = await getAudioContext();
  if (!ctx || ctx.state !== 'running') return;

  const t = ctx.currentTime;
  const gap = 0.38;

  scheduleBellTone(ctx, { freq: 880, start: t, duration: 0.55, volume: 0.42 });
  scheduleBellTone(ctx, { freq: 659.25, start: t + gap, duration: 0.75, volume: 0.45 });
  scheduleBellTone(ctx, { freq: 988, start: t + gap * 2 + 0.55, duration: 0.5, volume: 0.4 });
  scheduleBellTone(ctx, { freq: 739.99, start: t + gap * 3 + 0.55, duration: 0.8, volume: 0.44 });

  await delay(2400);
}

export function setAnnounceSettings(settings) {
  cachedSettings = settings ? { ...settings } : null;
}

export async function loadAnnounceSettings() {
  try {
    cachedSettings = await api.getSettings();
  } catch {
    cachedSettings = cachedSettings || {};
  }
  return cachedSettings;
}

function getSettings() {
  return cachedSettings || {};
}

export function isPlaybackUnlocked() {
  return playbackUnlocked;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function playMp3Blob(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = await getAudioContext();

  if (ctx && ctx.state === 'running') {
    try {
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      await new Promise((resolve) => {
        const src = ctx.createBufferSource();
        src.buffer = audioBuffer;
        src.connect(ctx.destination);
        src.onended = resolve;
        src.onerror = resolve;
        src.start(0);
      });
      return true;
    } catch (e) {
      console.warn('Web Audio playback:', e);
    }
  }

  const url = URL.createObjectURL(blob);
  const a = getPersistentAudio();
  a.src = url;
  try {
    await a.play();
    await new Promise((resolve) => {
      a.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      a.onerror = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
    });
    return true;
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/** שחרור חסימת השמע — קוראים פעם אחת אחרי לחיצה או בטעינת מסך תצוגה */
export async function unlockAudioPlayback() {
  if (playbackUnlocked) return true;

  try {
    const ctx = await getAudioContext();
    if (ctx) {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      await delay(20);
      if (ctx.state === 'running') playbackUnlocked = true;
    }
  } catch {
    /* continue */
  }

  if (!playbackUnlocked) {
    try {
      const a = getPersistentAudio();
      a.volume = 0.001;
      a.src =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      await a.play();
      a.pause();
      a.removeAttribute('src');
      playbackUnlocked = true;
    } catch {
      /* דפדפן חוסם — ניסיון בהקראה הבאה */
    }
  }

  if (playbackUnlocked && speakQueue.length) {
    const pending = speakQueue.splice(0);
    for (const fn of pending) {
      try {
        await fn();
      } catch {
        /* ignore */
      }
    }
  }

  return playbackUnlocked;
}

export function preloadVoices() {
  if (voicesReady) return voicesReady;
  if (typeof speechSynthesis === 'undefined') {
    voicesReady = Promise.resolve([]);
    return voicesReady;
  }
  voicesReady = new Promise((resolve) => {
    const pick = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
        return true;
      }
      return false;
    };
    if (pick()) return;
    speechSynthesis.addEventListener(
      'voiceschanged',
      () => pick() && resolve(speechSynthesis.getVoices()),
      { once: true }
    );
    setTimeout(() => resolve(speechSynthesis.getVoices()), 800);
  });
  return voicesReady;
}

export function listBrowserHebrewVoices() {
  if (typeof speechSynthesis === 'undefined') return [];
  return speechSynthesis
    .getVoices()
    .filter((v) => v.lang?.startsWith('he') || v.name?.match(/Hebrew|Carmit|Aviv|עברית/i))
    .map((v) => ({
      uri: v.voiceURI,
      name: v.name,
      lang: v.lang,
    }));
}

function pickHebrewVoice(voices, preferredUri) {
  if (preferredUri) {
    const found = voices.find((v) => v.voiceURI === preferredUri);
    if (found) return found;
  }
  return (
    voices.find((v) => v.lang === 'he-IL') ||
    voices.find((v) => v.lang?.startsWith('he')) ||
    voices.find((v) => v.name.includes('Hebrew')) ||
    voices.find((v) => v.name.includes('Carmit')) ||
    voices.find((v) => v.name.includes('Aviv')) ||
    voices[0]
  );
}

function speakBrowser(text, voice, rate) {
  return new Promise((resolve) => {
    if (!text?.trim() || typeof speechSynthesis === 'undefined') {
      resolve();
      return;
    }
    const u = new SpeechSynthesisUtterance(text.trim());
    u.lang = 'he-IL';
    u.rate = rate;
    u.pitch = 1;
    u.volume = 1;
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

async function speakEdge(text) {
  const blob = await api.speakTts(text);
  await playMp3Blob(blob);
}

export function buildAnnounceText(ticket, room) {
  const dest = getRoomAnnounceText(room);
  const code = ticket?.display_code || '';
  return `מספר ${code}, נא לגשת ל${dest}`;
}

export function buildDoctorSummonText(room) {
  const dest = getRoomAnnounceText(room);
  return `רופא, נא לגשת ל${dest}`;
}

export async function announceDoctorSummon(room, options = {}) {
  if (!room) return;
  try {
    await playDoctorSummonChime();
  } catch (e) {
    console.warn('doctor summon chime:', e);
  }
  await speakText(buildDoctorSummonText(room), options);
}

export async function announceTicketClear(ticket, room, options = {}) {
  if (!ticket) return;
  await speakText(buildAnnounceText(ticket, room), options);
}

async function runSpeak(text) {
  if (!text?.trim()) return;

  if (announcing) {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    await delay(150);
  }
  announcing = true;

  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.cancel();
    await delay(80);
  }

  const settings = getSettings();
  const provider = settings.tts_provider || 'edge';

  try {
    if (provider === 'edge') {
      try {
        await speakEdge(text);
        return;
      } catch (e) {
        console.warn('Edge TTS failed, fallback to browser:', e);
      }
    }

    const voices = await preloadVoices();
    const voice = pickHebrewVoice(voices, settings.tts_voice_uri || '');
    const rate = Number(settings.tts_rate) || 0.68;
    await speakBrowser(text, voice, rate);
  } finally {
    announcing = false;
  }
}

export async function speakText(text, options = {}) {
  if (!text?.trim()) return;

  const settings = getSettings();
  const playback = settings.tts_playback || 'both';
  if (playback === 'server' && !options.forDisplay) return;

  if (!playbackUnlocked) {
    await unlockAudioPlayback();
  }

  if (!playbackUnlocked) {
    return new Promise((resolve) => {
      speakQueue.push(async () => {
        await runSpeak(text);
        resolve();
      });
    });
  }

  return runSpeak(text);
}

export function hasHebrewVoice() {
  const settings = getSettings();
  if ((settings.tts_provider || 'edge') === 'edge') return true;
  if (typeof speechSynthesis === 'undefined') return false;
  return speechSynthesis.getVoices().some((v) => v.lang?.startsWith('he'));
}

export async function testAnnouncement() {
  await speakText('ההקראה מוכנה. מספר אחת, נא לגשת לחדר בדיקה');
}

export async function prepareDisplayAudio() {
  await loadAnnounceSettings();
  await unlockAudioPlayback();
  await preloadVoices();
  return hasHebrewVoice();
}

/** מאזין גלובלי — שחרור השמעה בלחיצה/מגע ראשון (למצב דפדפן) */
export function installAudioUnlockListeners() {
  if (typeof window === 'undefined') return () => {};

  const onGesture = () => {
    unlockAudioPlayback();
  };

  window.addEventListener('pointerdown', onGesture, { capture: true, passive: true });
  window.addEventListener('keydown', onGesture, { capture: true, passive: true });
  window.addEventListener('touchstart', onGesture, { capture: true, passive: true });

  return () => {
    window.removeEventListener('pointerdown', onGesture, { capture: true });
    window.removeEventListener('keydown', onGesture, { capture: true });
    window.removeEventListener('touchstart', onGesture, { capture: true });
  };
}
