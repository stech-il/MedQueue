import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { useSocket } from '../hooks/useSocket';
import {
  announceDoctorSummon,
  announceTicketClear,
  prepareDisplayAudio,
  setAnnounceSettings,
} from '../lib/announce';
import { parseDisplaySeconds } from '../lib/displaySettings';
import DisplayLobbyLayout, { DisplaySingleRoomLayout } from '../components/DisplayLobbyLayout';
import { getDisplayTemplate } from '../lib/displayTemplate';
import { formatRoomNumberBadge, getRoomAnnounceText } from '../lib/roomDisplay';
import { splitTickerMessages } from '../lib/tickerFormat';

function scheduleOverlay(timerRef, setter, seconds) {
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(() => {
    setter(null);
    timerRef.current = null;
  }, seconds * 1000);
}

export default function Display({ mode }) {
  const { roomId } = useParams();
  const [state, setState] = useState(null);
  const [flash, setFlash] = useState(null);
  const [summonFlash, setSummonFlash] = useState(null);
  const [audioReady, setAudioReady] = useState(false);
  const [voiceWarning, setVoiceWarning] = useState(false);
  const audioEnabledRef = useRef(true);
  const settingsRef = useRef({});
  const flashTimerRef = useRef(null);
  const summonTimerRef = useRef(null);
  const audioInitRef = useRef(false);
  const [clock, setClock] = useState(new Date());

  const applySettings = useCallback((settings) => {
    if (!settings) return;
    settingsRef.current = settings;
    setAnnounceSettings(settings);
  }, []);

  const load = useCallback(async () => {
    if (mode === 'lobby') {
      const data = await api.getLobby();
      applySettings(data.settings);
      setState(data);
    } else if (roomId) {
      const data = await api.getDisplay(Number(roomId));
      applySettings(data.settings);
      setState(data);
    }
  }, [mode, roomId, applySettings]);

  useEffect(() => {
    load();
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => {
      clearInterval(t);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (summonTimerRef.current) clearTimeout(summonTimerRef.current);
    };
  }, [load]);

  useEffect(() => {
    if (!state || audioInitRef.current) return;
    audioInitRef.current = true;
    let cancelled = false;
    (async () => {
      audioEnabledRef.current = true;
      const ok = await prepareDisplayAudio();
      if (!cancelled) {
        setVoiceWarning(!ok);
        setAudioReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state]);

  useSocket({
    'state:refresh': load,
    'settings:updated': (settings) => {
      applySettings(settings);
      setState((prev) => (prev ? { ...prev, settings } : prev));
    },
    'ticket:called': async (data) => {
      const settings = data.settings || settingsRef.current;
      applySettings(settings);

      if (data?.announce) {
        const inRoom = mode === 'room' ? Number(roomId) === data.room?.id : true;
        if (inRoom) {
          setFlash({ ...data.ticket, _room: data.room });
          const sec = parseDisplaySeconds(settings.display_flash_seconds, 12);
          scheduleOverlay(flashTimerRef, setFlash, sec);
          if (audioEnabledRef.current) {
            try {
              await announceTicketClear(data.ticket, data.room, { forDisplay: true });
            } catch (e) {
              console.warn('announce ticket:', e);
            }
          }
        }
      }
      load();
    },
    'doctor:summon': async (data) => {
      if (!data?.announce || !data.room) return;
      const settings = data.settings || settingsRef.current;
      applySettings(settings);

      setSummonFlash(data.room);
      const sec = parseDisplaySeconds(
        settings.display_summon_seconds,
        parseDisplaySeconds(settings.display_flash_seconds, 10)
      );
      scheduleOverlay(summonTimerRef, setSummonFlash, sec);

      if (audioEnabledRef.current) {
        try {
          await announceDoctorSummon(data.room, { forDisplay: true });
        } catch (e) {
          console.warn('announce doctor summon:', e);
        }
      }
    },
  });

  if (!state) {
    return (
      <div className="display-loading">
        <p>טוען...</p>
      </div>
    );
  }

  const settings = state.settings || {};
  const ticker = state.ticker || splitTickerMessages(settings.ticker_messages);
  const playbackMode = settings.tts_playback || 'both';
  const displayTemplate = getDisplayTemplate(settings);

  const voiceBanner =
    audioReady &&
    voiceWarning &&
    (settings.tts_provider || 'edge') === 'browser' && (
      <div className="display-voice-warn">התקן קול עברית בדפדפן, או עברו להקראה מקצועית בהגדרות</div>
    );
  const serverAudioNote =
    playbackMode === 'server' && (
      <div className="display-audio-server" aria-hidden>
        הקראה מהמחשב שמריץ את השרת
      </div>
    );

  if (mode === 'lobby') {
    const { serving } = state;
    return (
      <div className={`display-lobby display-lobby--${displayTemplate}`}>
        {voiceBanner}
        {serverAudioNote}
        {flash && <FlashOverlay ticket={flash} room={flash._room} />}
        {summonFlash && <SummonFlashOverlay room={summonFlash} />}
        <DisplayLobbyLayout
          serving={serving}
          settings={settings}
          clock={clock}
          ticker={ticker}
        />
      </div>
    );
  }

  const { room, current, queue } = state;

  return (
    <div className={`display-lobby display-lobby--${displayTemplate}`}>
      {voiceBanner}
      {serverAudioNote}
      {flash && <FlashOverlay ticket={flash} room={flash._room || room} />}
      {summonFlash && <SummonFlashOverlay room={summonFlash} />}
      <DisplaySingleRoomLayout
        room={room}
        current={current}
        queue={queue}
        settings={settings}
        clock={clock}
        ticker={ticker}
      />
    </div>
  );
}

function SummonFlashOverlay({ room }) {
  const dest = getRoomAnnounceText(room);
  return (
    <div className="display-flash display-flash--summon">
      <p className="display-flash__label">קריאה דחופה לרופא</p>
      <p className="display-flash__summon-main">רופא</p>
      <p className="display-flash__room">נא לגשת ל{dest}</p>
    </div>
  );
}

function FlashOverlay({ ticket, room }) {
  const roomObj = typeof room === 'object' && room ? room : { name: room };
  const badge = formatRoomNumberBadge(roomObj);
  return (
    <div className="display-flash">
      <p className="display-flash__label">תור מספר</p>
      <div className="display-flash__code">{ticket.display_code}</div>
      <p className="display-flash__room">נא לגשת ל{roomObj.name || 'החדר'}</p>
      {badge && <p className="display-flash__room-num">{badge}</p>}
    </div>
  );
}
