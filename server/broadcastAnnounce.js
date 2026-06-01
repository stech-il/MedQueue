import * as localAnnounce from './localAnnounce.js';

export function shouldPlayBrowserAudio(settings) {
  const mode = settings?.tts_playback || 'both';
  return mode === 'browser' || mode === 'both';
}

export function shouldPlayServerAudio(settings) {
  const mode = settings?.tts_playback || 'both';
  return mode === 'server' || mode === 'both';
}

/** מסך תצוגה תמיד מנסה להשמיע (רמקולים בטלוויזיה/דפדפן) */
export function shouldPlayDisplayAudio() {
  return true;
}

export function ticketCalledPayload(ticket, room, settings) {
  return {
    ticket,
    room,
    announce: true,
    announce_audio: shouldPlayDisplayAudio(),
    settings,
  };
}

export function doctorSummonPayload(room, settings) {
  return {
    room,
    announce: true,
    announce_audio: shouldPlayDisplayAudio(),
    settings,
  };
}

export function playServerTicketCall(ticket, room, settings) {
  if (!shouldPlayServerAudio(settings)) return;
  if ((settings.tts_provider || 'edge') !== 'edge') return;
  localAnnounce.announceTicketCall(ticket, room, settings);
}

export function playServerDoctorSummon(room, settings) {
  if (!shouldPlayServerAudio(settings)) return;
  if ((settings.tts_provider || 'edge') !== 'edge') return;
  localAnnounce.announceDoctorSummon(room, settings);
}
