import { useEffect, useState } from 'react';
import { api } from '../../api';
import {
  listBrowserHebrewVoices,
  playDoctorSummonChime,
  preloadVoices,
  setAnnounceSettings,
  speakText,
} from '../../lib/announce';
import { getTickerBarStyle, TICKER_SIZE_OPTIONS } from '../../lib/tickerSize';
import DisplayCenterSettings from '../../components/DisplayCenterSettings';
import { DISPLAY_TEMPLATES } from '../../lib/displayTemplate';

function formatDt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('he-IL');
  } catch {
    return iso;
  }
}

const TABS = [
  { id: 'general', label: 'כללי', icon: '🏥' },
  { id: 'whatsapp', label: 'וואטסאפ', icon: '💬' },
  { id: 'display', label: 'מסך תצוגה', icon: '📺' },
  { id: 'kiosk', label: 'קיוסק', icon: '🎫' },
  { id: 'tts', label: 'הקראה', icon: '🔊' },
  { id: 'backup', label: 'גיבוי', icon: '💾' },
];

const WA_STATUS_LABELS = {
  ready: 'מחובר',
  qr: 'ממתין לסריקת QR',
  authenticated: 'מאומת — טוען וואטסאפ…',
  loading: 'טוען…',
  initializing: 'מתחיל…',
  disconnected: 'מנותק',
  error: 'שגיאה',
  disabled: 'כבוי',
  idle: 'לא מחובר',
};

const EDGE_RATES = [
  { value: '-15%', label: 'איטי (ברור)' },
  { value: '-5%', label: 'מעט איטי' },
  { value: '+0%', label: 'רגיל' },
  { value: '+10%', label: 'מהיר' },
];

const KIOSK_PRINT_FORMAT = [
  { value: 'html', title: 'כרטיס מעוצב (מומלץ)', desc: 'כמו במסך — מסגרות, מספר גדול, עברית נכונה' },
  { value: 'text', title: 'טקסט פשוט', desc: 'קבלה בסיסית כמו סופרמרקט' },
  { value: 'pdf', title: 'PDF', desc: 'גיבוי' },
];

const KIOSK_PRINT = [
  {
    value: 'none',
    title: 'ללא הדפסה (מסך בלבד)',
    desc: 'מספר תור גדול על המסך — מומלץ לקיוסק',
  },
  {
    value: 'auto',
    title: 'הדפסה אוטומטית',
    desc: 'שרת / סוכן מקומי / דפדפן',
  },
  { value: 'server', title: 'מהשרת בלבד', desc: 'Windows מקומי' },
  { value: 'browser', title: 'מהדפדפן בלבד', desc: 'Chrome עם --kiosk-printing' },
];

const TTS_PLAYBACK = [
  { value: 'server', title: 'מחשב השרת', desc: 'רמקולים על מחשב השרת' },
  { value: 'browser', title: 'מסך תצוגה', desc: 'רמקולי הטלוויזיה / דפדפן' },
  { value: 'both', title: 'שניהם', desc: 'מומלץ — תצוגה + שרת' },
];

const TTS_PROVIDER = [
  { value: 'edge', title: 'Microsoft Neural', desc: 'קול עברי מקצועי (מומלץ)' },
  { value: 'browser', title: 'קול הדפדפן', desc: 'קול מותקן במחשב' },
];

const EMPTY_FORM = {
  clinic_name: '',
  clinic_logo: '',
  ticker_messages: '',
  ticker_size: 'md',
  kiosk_print_via: 'none',
  kiosk_print_format: 'html',
  kiosk_printer_name: '',
  tts_provider: 'edge',
  tts_edge_voice: 'he-IL-HilaNeural',
  tts_edge_rate: '-5%',
  tts_voice_uri: '',
  tts_rate: '0.68',
  display_flash_seconds: '12',
  display_summon_seconds: '10',
    display_tagline: '',
    display_template: 'board',
    display_center_mode: 'default',
  display_center_slides: '[]',
  display_center_image: '',
  display_center_video: '',
  display_center_slide_seconds: '8',
  tts_playback: 'both',
  backup_auto_daily: '1',

  // אינטגרציה: API לעדכון מטופלים בעת יצירת תור בקיוסק
  external_patient_update_enabled: '0',
  external_patient_update_url: '',
  external_patient_update_api_key: '',
  external_patient_update_last_test_ok: '0',
  external_patient_update_last_test_at: '',
  external_patient_update_last_test_error: '',
  external_patient_update_last_update_ok: '0',
  external_patient_update_last_update_at: '',
  external_patient_update_last_update_error: '',

  whatsapp_enabled: '0',
  whatsapp_send_kiosk: '1',
  whatsapp_send_call: '1',
  whatsapp_kiosk_template: '',
  whatsapp_call_template: '',
  whatsapp_status: 'idle',
  whatsapp_last_connected_at: '',
  whatsapp_last_error: '',
  whatsapp_last_send_ok: '0',
  whatsapp_last_send_at: '',
  whatsapp_last_send_error: '',
  whatsapp_alert_email_enabled: '1',
  whatsapp_last_alert_at: '',
  gmail_smtp_user: '',
  gmail_smtp_app_password: '',
  gmail_alert_to: '',
};

function ChoiceCards({ name, value, options, onChange }) {
  return (
    <div className="settings-choices">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`settings-choice${value === opt.value ? ' settings-choice--on' : ''}`}
        >
          <input type="radio" name={name} value={opt.value} checked={value === opt.value} onChange={() => onChange(opt.value)} />
          <span className="settings-choice__title">{opt.title}</span>
          {opt.desc && <span className="settings-choice__desc">{opt.desc}</span>}
        </label>
      ))}
    </div>
  );
}

export default function ClinicSettings() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [tab, setTab] = useState('general');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('ok');
  const [edgeVoices, setEdgeVoices] = useState([]);
  const [browserVoices, setBrowserVoices] = useState([]);
  const [testing, setTesting] = useState(false);
  const [testingExternal, setTestingExternal] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [waStatus, setWaStatus] = useState(null);
  const [waBusy, setWaBusy] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testWaPhone, setTestWaPhone] = useState('');
  const [testingWaSend, setTestingWaSend] = useState(false);

  const notify = (text, type = 'ok') => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 2800);
  };

  useEffect(() => {
    api.getSettings().then((s) => {
      setForm({
        ...EMPTY_FORM,
        clinic_name: s.clinic_name || '',
        clinic_logo: s.clinic_logo || '/logo.svg',
        ticker_messages: s.ticker_messages || '',
        ticker_size: s.ticker_size || 'md',
        kiosk_print_via: s.kiosk_print_via || 'none',
        kiosk_print_format: s.kiosk_print_format || 'html',
        kiosk_printer_name: s.kiosk_printer_name || '',
        tts_provider: s.tts_provider || 'edge',
        tts_edge_voice: s.tts_edge_voice || 'he-IL-HilaNeural',
        tts_edge_rate: s.tts_edge_rate || '-5%',
        tts_voice_uri: s.tts_voice_uri || '',
        tts_rate: s.tts_rate || '0.68',
        display_flash_seconds: s.display_flash_seconds || '12',
        display_summon_seconds: s.display_summon_seconds || '10',
        display_tagline: s.display_tagline || '',
        display_template: s.display_template || 'board',
        display_center_mode: s.display_center_mode || 'default',
        display_center_slides: s.display_center_slides || '[]',
        display_center_image: s.display_center_image || '',
        display_center_video: s.display_center_video || '',
        display_center_slide_seconds: s.display_center_slide_seconds || '8',
        tts_playback: s.tts_playback || 'both',
        backup_auto_daily: s.backup_auto_daily ?? '1',

        external_patient_update_enabled: s.external_patient_update_enabled ?? '0',
        external_patient_update_url: s.external_patient_update_url || '',
        external_patient_update_api_key: s.external_patient_update_api_key || '',
        external_patient_update_last_test_ok: s.external_patient_update_last_test_ok ?? '0',
        external_patient_update_last_test_at: s.external_patient_update_last_test_at || '',
        external_patient_update_last_test_error: s.external_patient_update_last_test_error || '',
        external_patient_update_last_update_ok: s.external_patient_update_last_update_ok ?? '0',
        external_patient_update_last_update_at: s.external_patient_update_last_update_at || '',
        external_patient_update_last_update_error: s.external_patient_update_last_update_error || '',

        whatsapp_enabled: s.whatsapp_enabled ?? '0',
        whatsapp_send_kiosk: s.whatsapp_send_kiosk ?? '1',
        whatsapp_send_call: s.whatsapp_send_call ?? '1',
        whatsapp_kiosk_template: s.whatsapp_kiosk_template || '',
        whatsapp_call_template: s.whatsapp_call_template || '',
        whatsapp_status: s.whatsapp_status || 'idle',
        whatsapp_last_connected_at: s.whatsapp_last_connected_at || '',
        whatsapp_last_error: s.whatsapp_last_error || '',
        whatsapp_last_send_ok: s.whatsapp_last_send_ok ?? '0',
        whatsapp_last_send_at: s.whatsapp_last_send_at || '',
        whatsapp_last_send_error: s.whatsapp_last_send_error || '',
        whatsapp_alert_email_enabled: s.whatsapp_alert_email_enabled ?? '1',
        whatsapp_last_alert_at: s.whatsapp_last_alert_at || '',
        gmail_smtp_user: s.gmail_smtp_user || '',
        gmail_smtp_app_password: s.gmail_smtp_app_password || '',
        gmail_alert_to: s.gmail_alert_to || '',
      });
      setAnnounceSettings(s);
    });
    api.getTtsVoices().then((v) => setEdgeVoices(v.edge || [])).catch(() => {});
    preloadVoices().then(() => setBrowserVoices(listBrowserHebrewVoices()));
  }, []);

  const refreshWaStatus = async () => {
    try {
      const st = await api.getWhatsAppStatus();
      setWaStatus(st);
      if (st?.status) {
        setForm((f) => ({
          ...f,
          whatsapp_status: st.status,
          whatsapp_last_error: st.lastError || '',
          ...(st.readyAt ? { whatsapp_last_connected_at: st.readyAt } : {}),
        }));
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (tab !== 'whatsapp') return undefined;
    refreshWaStatus();
    const t = setInterval(refreshWaStatus, 2500);
    return () => clearInterval(t);
  }, [tab, form.whatsapp_enabled]);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateSettings(form);
      setAnnounceSettings(form);
      notify('הגדרות נשמרו בהצלחה');
    } catch (e) {
      notify(e.message, 'err');
    } finally {
      setSaving(false);
    }
  };

  const testTts = async () => {
    setTesting(true);
    setAnnounceSettings(form);
    try {
      await speakText('בדיקת הקראה. רופא, נא לגשת לחדר מספר אחת');
      notify('הושמעה בדיקת הקראה');
    } catch (e) {
      notify(e.message, 'err');
    } finally {
      setTesting(false);
    }
  };

  const onLogoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      notify('הקובץ גדול מדי (מקסימום 2MB)', 'err');
      return;
    }
    setUploadingLogo(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ'));
        reader.readAsDataURL(file);
      });
      const res = await api.uploadLogo(dataUrl);
      setForm((f) => ({ ...f, clinic_logo: res.clinic_logo }));
      notify('הלוגו הועלה');
    } catch (err) {
      notify(err.message, 'err');
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <div>
          <h1 className="settings-page__title">הגדרות מרפאה</h1>
          <p className="settings-page__sub">ניהול שם, תצוגה, קיוסק, הקראה וגיבוי</p>
        </div>
        <button type="button" className="btn-primary settings-page__save-top" onClick={save} disabled={saving}>
          {saving ? 'שומר…' : 'שמור הגדרות'}
        </button>
      </header>

      {msg && (
        <div className={`settings-toast settings-toast--${msgType}`} role="status">
          {msg}
        </div>
      )}

      <nav className="settings-tabs" aria-label="קטגוריות הגדרות">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`settings-tabs__btn${tab === t.id ? ' settings-tabs__btn--on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="settings-tabs__icon" aria-hidden>
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="settings-panel">
        {tab === 'general' && (
          <div className="settings-sections">
            <section className="settings-block">
              <h2 className="settings-block__title">פרטי המוקד</h2>
              <div className="settings-field">
                <label htmlFor="clinic_name">שם המוקד</label>
                <input
                  id="clinic_name"
                  value={form.clinic_name}
                  onChange={(e) => setForm({ ...form, clinic_name: e.target.value })}
                  placeholder="בית הרופאים"
                />
                <p className="settings-hint">מוצג במסך תצוגה, קיוסק וכרטיסי תור</p>
              </div>

              <div className="settings-field">
                <span className="settings-field__label">לוגו</span>
                <div className="settings-logo">
                  {form.clinic_logo ? (
                    <img src={form.clinic_logo} alt="" className="settings-logo__img" />
                  ) : (
                    <div className="settings-logo__empty">אין לוגו</div>
                  )}
                  <div className="settings-logo__actions">
                    <label className="btn-primary settings-logo__upload">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={onLogoFile}
                        disabled={uploadingLogo}
                        hidden
                      />
                      {uploadingLogo ? 'מעלה…' : 'העלה קובץ'}
                    </label>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={async () => {
                        try {
                          const res = await api.removeLogo();
                          setForm((f) => ({ ...f, clinic_logo: res.clinic_logo }));
                          notify('לוגו אופס');
                        } catch (err) {
                          notify(err.message, 'err');
                        }
                      }}
                    >
                      ברירת מחדל
                    </button>
                  </div>
                </div>
                <p className="settings-hint">PNG, JPG, WebP, SVG — עד 2MB</p>
              </div>

              <div className="settings-field">
                <label htmlFor="clinic_logo_url">או כתובת URL</label>
                <input
                  id="clinic_logo_url"
                  value={form.clinic_logo}
                  onChange={(e) => setForm({ ...form, clinic_logo: e.target.value })}
                  dir="ltr"
                  placeholder="https://..."
                />
              </div>
            </section>

            <section className="settings-block">
              <h2 className="settings-block__title">הודעות רצות (פס תחתון)</h2>
              <div className="settings-field">
                <label htmlFor="ticker_messages">תוכן ההודעות</label>
                <textarea
                  id="ticker_messages"
                  rows={5}
                  value={form.ticker_messages}
                  onChange={(e) => setForm({ ...form, ticker_messages: e.target.value })}
                  placeholder="הודעה ראשונה|הודעה שנייה"
                />
                <p className="settings-hint">
                  הפרדה בין הודעות: <code>|</code> · שורות: Enter · מודגש: <code>**טקסט**</code>
                </p>
              </div>
              <div className="settings-field settings-field--narrow">
                <label htmlFor="ticker_size">גודל הפס</label>
                <select
                  id="ticker_size"
                  value={form.ticker_size}
                  onChange={(e) => setForm({ ...form, ticker_size: e.target.value })}
                >
                  {TICKER_SIZE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.fontPx}px)
                    </option>
                  ))}
                </select>
              </div>
              <div
                className="ticker-bar settings-ticker-preview"
                style={getTickerBarStyle(form.ticker_size)}
                aria-hidden
              >
                <div className="ticker-viewport">
                  <span className="ticker-msg" style={{ padding: '0 1rem' }}>
                    תצוגה מקדימה
                  </span>
                </div>
              </div>
            </section>

            <section className="settings-block">
              <h2 className="settings-block__title">עדכון מטופלים בקישור חיצוני (קיוסק)</h2>
              <p className="settings-hint settings-hint--top">
                בעת יצירת תור בקיוסק, המערכת תשלח עדכון דרך ה-URL החיצוני:
                <code>
                  {' '}
                  /api.php?api_key=...&action=update&id_number=...&phone=...&health_org=...
                </code>
              </p>

              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={form.external_patient_update_enabled === '1'}
                  onChange={(e) => setForm({ ...form, external_patient_update_enabled: e.target.checked ? '1' : '0' })}
                />
                <span>הפעלת עדכון מטופלים בקיוסק</span>
              </label>

              <p className="settings-hint" style={{ marginTop: '0.75rem' }}>
                ניתן לשנות את כתובת היעד/מפתח דרך משתני סביבה:
                <code> EXTERNAL_PATIENT_UPDATE_BASE </code>
                ו-
                <code> EXTERNAL_PATIENT_UPDATE_API_KEY </code>.
              </p>

              <div className="settings-actions-inline">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={async () => {
                    setTestingExternal(true);
                    try {
                      await api.testExternalPatientConnection();
                      const now = new Date().toISOString();
                      setForm((f) => ({
                        ...f,
                        external_patient_update_last_test_ok: '1',
                        external_patient_update_last_test_at: now,
                        external_patient_update_last_test_error: '',
                      }));
                      notify('חיבור API תקין');
                    } catch (e) {
                      const now = new Date().toISOString();
                      setForm((f) => ({
                        ...f,
                        external_patient_update_last_test_ok: '0',
                        external_patient_update_last_test_at: now,
                        external_patient_update_last_test_error: e?.message ? String(e.message).slice(0, 700) : String(e).slice(0, 700),
                      }));
                      notify(e.message, 'err');
                    } finally {
                      setTestingExternal(false);
                    }
                  }}
                  disabled={testingExternal}
                >
                  {testingExternal ? 'בודק…' : 'בדיקת חיבור עכשיו'}
                </button>
              </div>

              <div className="settings-hint" style={{ marginTop: '1rem' }}>
                <div>
                  בדיקה אחרונה: {form.external_patient_update_last_test_ok === '1' ? 'הצלחה' : '—'} · {formatDt(form.external_patient_update_last_test_at)}
                </div>
                {form.external_patient_update_last_test_error && (
                  <div style={{ color: '#f87171', marginTop: 6 }}>שגיאה: {form.external_patient_update_last_test_error}</div>
                )}
                <div style={{ marginTop: 8 }}>
                  עדכון אחרון בקיוסק: {form.external_patient_update_last_update_ok === '1' ? 'הצלחה' : '—'} · {formatDt(form.external_patient_update_last_update_at)}
                </div>
                {form.external_patient_update_last_update_error && (
                  <div style={{ color: '#f87171', marginTop: 6 }}>{form.external_patient_update_last_update_error}</div>
                )}
              </div>
            </section>
          </div>
        )}

        {tab === 'whatsapp' && (
          <div className="settings-sections">
            <section className="settings-block">
              <h2 className="settings-block__title">וואטסאפ למטופלים</h2>
              <p className="settings-hint settings-hint--top">
                חיבור דרך QR מהטלפון של המרפאה. הסשן נשמר בשרת (דיסק Render). הודעות נשלחות אוטומטית
                אחרי קיוסק ובקריאה לחדר.
              </p>

              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={form.whatsapp_enabled === '1'}
                  onChange={(e) =>
                    setForm({ ...form, whatsapp_enabled: e.target.checked ? '1' : '0' })
                  }
                />
                <span>הפעל שליחת וואטסאפ</span>
              </label>

              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={form.whatsapp_send_kiosk === '1'}
                  onChange={(e) =>
                    setForm({ ...form, whatsapp_send_kiosk: e.target.checked ? '1' : '0' })
                  }
                />
                <span>שלח הודעה אחרי רישום בקיוסק</span>
              </label>

              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={form.whatsapp_send_call === '1'}
                  onChange={(e) =>
                    setForm({ ...form, whatsapp_send_call: e.target.checked ? '1' : '0' })
                  }
                />
                <span>שלח הודעה בקריאה לחדר (כולל «קרא שוב»)</span>
              </label>

              <div
                className={`settings-wa-status settings-wa-status--${waStatus?.status || form.whatsapp_status || 'idle'}`}
              >
                <strong>
                  סטטוס:{' '}
                  {WA_STATUS_LABELS[waStatus?.status || form.whatsapp_status] || 'לא ידוע'}
                </strong>
                {form.whatsapp_last_connected_at && (
                  <span> · מחובר לאחרונה: {formatDt(form.whatsapp_last_connected_at)}</span>
                )}
              </div>

              {(() => {
                const waStat = waStatus?.status || form.whatsapp_status;
                const err =
                  waStatus?.lastError ||
                  (['error', 'disconnected'].includes(waStat) ? form.whatsapp_last_error : '');
                return err ? (
                  <p className="settings-hint" style={{ color: '#f87171' }}>
                    {err}
                  </p>
                ) : null;
              })()}

              {(waStatus?.status || form.whatsapp_status) === 'authenticated' && (
                <p className="settings-hint">
                  הסריקה הצליחה. ממתין לטעינה (עד דקה) — אם נשאר כך, רענן את הדף או לחץ שוב «התחבר».
                </p>
              )}

              {waStatus?.qrDataUrl && (
                <div className="settings-wa-qr">
                  <p className="settings-hint">סרוק בוואטסאפ → מכשירים מקושרים → קשר מכשיר</p>
                  <img src={waStatus.qrDataUrl} alt="QR לחיבור וואטסאפ" width={280} height={280} />
                </div>
              )}

              <div className="settings-actions-inline">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={waBusy}
                  onClick={async () => {
                    setWaBusy(true);
                    try {
                      await save();
                      const st = await api.connectWhatsApp();
                      setWaStatus(st);
                      setForm((f) => ({ ...f, whatsapp_enabled: '1', whatsapp_status: st.status }));
                      notify('מתחבר לוואטסאפ — סרוק QR אם מופיע');
                    } catch (e) {
                      notify(e.message, 'err');
                    } finally {
                      setWaBusy(false);
                    }
                  }}
                >
                  {waBusy ? 'מתחבר…' : 'התחבר / הצג QR'}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={waBusy}
                  onClick={async () => {
                    if (!confirm('להתנתק מוואטסאפ? יידרש QR מחדש.')) return;
                    setWaBusy(true);
                    try {
                      const st = await api.disconnectWhatsApp();
                      setWaStatus(st);
                      notify('התנתק מוואטסאפ');
                    } catch (e) {
                      notify(e.message, 'err');
                    } finally {
                      setWaBusy(false);
                    }
                  }}
                >
                  התנתק
                </button>
              </div>

              <div className="settings-field" style={{ marginTop: '1rem' }}>
                <label htmlFor="whatsapp_kiosk_template">תבנית הודעה — קיוסק</label>
                <textarea
                  id="whatsapp_kiosk_template"
                  rows={5}
                  value={form.whatsapp_kiosk_template}
                  onChange={(e) => setForm({ ...form, whatsapp_kiosk_template: e.target.value })}
                  placeholder="ריק = ברירת מחדל. משתנים: {{clinic}} {{code}} {{fund}}"
                />
              </div>
              <div className="settings-field">
                <label htmlFor="whatsapp_call_template">תבנית הודעה — קריאה לחדר</label>
                <textarea
                  id="whatsapp_call_template"
                  rows={3}
                  value={form.whatsapp_call_template}
                  onChange={(e) => setForm({ ...form, whatsapp_call_template: e.target.value })}
                  placeholder="ריק = ברירת מחדל. משתנים: {{clinic}} {{code}} {{dest}} {{room}} {{announce}}"
                />
              </div>

              <div className="settings-field" style={{ marginTop: '1rem' }}>
                <label htmlFor="wa_test_phone">בדיקת שליחה למספר</label>
                <input
                  id="wa_test_phone"
                  type="tel"
                  dir="ltr"
                  value={testWaPhone}
                  onChange={(e) => setTestWaPhone(e.target.value)}
                  placeholder="0501234567"
                />
              </div>
              <div className="settings-actions-inline">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={testingWaSend || !testWaPhone.trim()}
                  onClick={async () => {
                    setTestingWaSend(true);
                    try {
                      await api.testWhatsAppSend(testWaPhone.trim());
                      notify('הודעת בדיקה נשלחה');
                      const s = await api.getSettings();
                      setForm((f) => ({
                        ...f,
                        whatsapp_last_send_ok: s.whatsapp_last_send_ok,
                        whatsapp_last_send_at: s.whatsapp_last_send_at,
                        whatsapp_last_send_error: s.whatsapp_last_send_error || '',
                      }));
                    } catch (e) {
                      notify(e.message, 'err');
                      try {
                        const s = await api.getSettings();
                        setForm((f) => ({
                          ...f,
                          whatsapp_last_send_ok: s.whatsapp_last_send_ok,
                          whatsapp_last_send_at: s.whatsapp_last_send_at,
                          whatsapp_last_send_error: s.whatsapp_last_send_error || '',
                        }));
                      } catch {
                        /* ignore */
                      }
                    } finally {
                      setTestingWaSend(false);
                    }
                  }}
                >
                  {testingWaSend ? 'שולח…' : 'שלח הודעת בדיקה'}
                </button>
              </div>

              <div className="settings-hint" style={{ marginTop: '0.75rem' }}>
                שליחה אחרונה: {form.whatsapp_last_send_ok === '1' ? 'הצלחה' : '—'} ·{' '}
                {formatDt(form.whatsapp_last_send_at)}
                {form.whatsapp_last_send_error && (
                  <div style={{ color: '#f87171', marginTop: 6 }}>{form.whatsapp_last_send_error}</div>
                )}
              </div>
            </section>

            <section className="settings-block">
              <h2 className="settings-block__title">התראת מייל (Gmail)</h2>
              <p className="settings-hint settings-hint--top">
                כשהוואטסאפ מנותק — נשלח מייל התראה (עד פעם בשעה). ב-Gmail: אימות דו-שלבי → סיסמת
                אפליקציה.
              </p>

              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={form.whatsapp_alert_email_enabled === '1'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      whatsapp_alert_email_enabled: e.target.checked ? '1' : '0',
                    })
                  }
                />
                <span>שלח מייל כשהוואטסאפ מנותק</span>
              </label>

              <div className="settings-field">
                <label htmlFor="gmail_smtp_user">Gmail שולח</label>
                <input
                  id="gmail_smtp_user"
                  type="email"
                  dir="ltr"
                  value={form.gmail_smtp_user}
                  onChange={(e) => setForm({ ...form, gmail_smtp_user: e.target.value })}
                  placeholder="clinic@gmail.com"
                />
              </div>
              <div className="settings-field">
                <label htmlFor="gmail_smtp_app_password">סיסמת אפליקציה Gmail</label>
                <input
                  id="gmail_smtp_app_password"
                  type="password"
                  dir="ltr"
                  autoComplete="new-password"
                  value={
                    form.gmail_smtp_app_password === '********' ? '' : form.gmail_smtp_app_password
                  }
                  onChange={(e) =>
                    setForm({ ...form, gmail_smtp_app_password: e.target.value })
                  }
                  placeholder={
                    form.gmail_smtp_app_password === '********'
                      ? 'שמורה — השאר ריק לשמירה'
                      : 'xxxx xxxx xxxx xxxx'
                  }
                />
              </div>
              <div className="settings-field">
                <label htmlFor="gmail_alert_to">שלח התראה ל</label>
                <input
                  id="gmail_alert_to"
                  type="email"
                  dir="ltr"
                  value={form.gmail_alert_to}
                  onChange={(e) => setForm({ ...form, gmail_alert_to: e.target.value })}
                  placeholder="אותו Gmail או מייל אחר"
                />
              </div>

              <div className="settings-actions-inline">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={testingEmail}
                  onClick={async () => {
                    setTestingEmail(true);
                    try {
                      await save();
                      await api.testAlertEmail();
                      notify('מייל בדיקה נשלח');
                    } catch (e) {
                      notify(e.message, 'err');
                    } finally {
                      setTestingEmail(false);
                    }
                  }}
                >
                  {testingEmail ? 'שולח…' : 'בדיקת מייל'}
                </button>
              </div>
              {form.whatsapp_last_alert_at && (
                <p className="settings-hint" style={{ marginTop: '0.5rem' }}>
                  התראה אחרונה: {formatDt(form.whatsapp_last_alert_at)}
                </p>
              )}
            </section>
          </div>
        )}

        {tab === 'display' && (
          <div className="settings-sections">
            <section className="settings-block">
              <h2 className="settings-block__title">תבנית מסך תצוגה</h2>
              <p className="settings-hint settings-hint--top">בחר מראה ל־/display (לובי). נשמר לאחר «שמור הגדרות».</p>
              <div className="settings-choices">
                {DISPLAY_TEMPLATES.map((opt) => (
                  <label
                    key={opt.value}
                    className={`settings-choice${form.display_template === opt.value ? ' settings-choice--on' : ''}`}
                  >
                    <input
                      type="radio"
                      name="display_template"
                      checked={(form.display_template || 'board') === opt.value}
                      onChange={() => setForm({ ...form, display_template: opt.value })}
                    />
                    <span className="settings-choice__title">{opt.title}</span>
                    <span className="settings-choice__desc">{opt.desc}</span>
                  </label>
                ))}
              </div>
            </section>

            {form.display_template !== 'classic' && (
            <section className="settings-block">
              <h2 className="settings-block__title">מרכז המסך</h2>
              <p className="settings-hint settings-hint--top">תוכן במסגרת האמצעית — תבנית «לוח מלא» בלבד</p>
              <DisplayCenterSettings form={form} setForm={setForm} />
            </section>
            )}

            <section className="settings-block">
              <h2 className="settings-block__title">טקסט וזמני הבזק</h2>
              <div className="settings-field">
                <label htmlFor="display_tagline">טקסט במרכז (מצב ברירת מחדל)</label>
                <input
                  id="display_tagline"
                  value={form.display_tagline}
                  onChange={(e) => setForm({ ...form, display_tagline: e.target.value })}
                  placeholder="ברוכים הבאים למוקד הרפואי"
                  disabled={form.display_template === 'classic'}
                />
                {form.display_template === 'classic' && (
                  <p className="settings-hint">בתבנית «רשת כרטיסים» אין אזור מרכזי — השדה לא מוצג</p>
                )}
              </div>
              <div className="settings-grid-2">
                <div className="settings-field">
                  <label htmlFor="display_flash_seconds">קריאת תור — שניות</label>
                  <input
                    id="display_flash_seconds"
                    type="number"
                    min={3}
                    max={120}
                    value={form.display_flash_seconds}
                    onChange={(e) => setForm({ ...form, display_flash_seconds: e.target.value })}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="display_summon_seconds">קריאה לרופא — שניות</label>
                  <input
                    id="display_summon_seconds"
                    type="number"
                    min={3}
                    max={120}
                    value={form.display_summon_seconds}
                    onChange={(e) => setForm({ ...form, display_summon_seconds: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="button"
                className="settings-btn-secondary"
                disabled={testing}
                onClick={async () => {
                  setTesting(true);
                  setAnnounceSettings(form);
                  try {
                    await playDoctorSummonChime();
                    await speakText('רופא, נא לגשת לחדר מספר אחת');
                    notify('הושמע צליל + הקראה לדוגמה');
                  } catch (e) {
                    notify(e.message, 'err');
                  } finally {
                    setTesting(false);
                  }
                }}
              >
                {testing ? 'משמיע…' : 'בדיקת צליל לרופא'}
              </button>
            </section>
          </div>
        )}

        {tab === 'kiosk' && (
          <section className="settings-block">
            <h2 className="settings-block__title">הדפסת תור בקיוסק</h2>
            <p className="settings-hint settings-hint--top">
              ברירת מחדל: מספר תור גדול על מסך הקיוסק, בלי הדפסה. להפעלת מדפסת — בחרו מצב הדפסה
              למטה.
            </p>
            <h3 className="settings-block__subtitle">הדפסה</h3>
            <ChoiceCards
              name="kiosk_print_via"
              value={form.kiosk_print_via}
              options={KIOSK_PRINT}
              onChange={(v) => setForm({ ...form, kiosk_print_via: v })}
            />
            {form.kiosk_print_via !== 'none' && (
              <>
                <h3 className="settings-block__subtitle">פורמט הדפסה</h3>
                <ChoiceCards
                  name="kiosk_print_format"
                  value={form.kiosk_print_format}
                  options={KIOSK_PRINT_FORMAT}
                  onChange={(v) => setForm({ ...form, kiosk_print_format: v })}
                />
              </>
            )}
            {form.kiosk_print_via !== 'none' &&
              (form.kiosk_print_via === 'server' || form.kiosk_print_via === 'auto') && (
                <div className="settings-field">
                  <label htmlFor="kiosk_printer_name">שם מדפסת (ריק = ברירת מחדל)</label>
                  <input
                    id="kiosk_printer_name"
                    value={form.kiosk_printer_name}
                    onChange={(e) => setForm({ ...form, kiosk_printer_name: e.target.value })}
                    placeholder="HP Smart Tank 610 series"
                    dir="ltr"
                  />
                </div>
              )}
          </section>
        )}

        {tab === 'tts' && (
          <section className="settings-block">
            <h2 className="settings-block__title">הקראה קולית</h2>
            <p className="settings-hint settings-hint--top">קריאות תור ורופא במסך התצוגה</p>

            <h3 className="settings-block__subtitle">מאיפה משמיעים?</h3>
            <ChoiceCards
              name="tts_playback"
              value={form.tts_playback}
              options={TTS_PLAYBACK}
              onChange={(v) => setForm({ ...form, tts_playback: v })}
            />

            <h3 className="settings-block__subtitle">סוג הקול</h3>
            <ChoiceCards
              name="tts_provider"
              value={form.tts_provider}
              options={TTS_PROVIDER}
              onChange={(v) => setForm({ ...form, tts_provider: v })}
            />

            {form.tts_provider === 'edge' && (
              <div className="settings-grid-2">
                <div className="settings-field">
                  <label htmlFor="tts_edge_voice">קול</label>
                  <select
                    id="tts_edge_voice"
                    value={form.tts_edge_voice}
                    onChange={(e) => setForm({ ...form, tts_edge_voice: e.target.value })}
                  >
                    {(edgeVoices.length
                      ? edgeVoices
                      : [
                          { id: 'he-IL-HilaNeural', label: 'הילה (נשי)' },
                          { id: 'he-IL-AvriNeural', label: 'אברי (גברי)' },
                        ]
                    ).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label || v.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts_edge_rate">מהירות</label>
                  <select
                    id="tts_edge_rate"
                    value={form.tts_edge_rate}
                    onChange={(e) => setForm({ ...form, tts_edge_rate: e.target.value })}
                  >
                    {EDGE_RATES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {form.tts_provider === 'browser' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts_voice_uri">
                    קול בדפדפן
                    <button
                      type="button"
                      className="settings-link"
                      onClick={async () => {
                        await preloadVoices();
                        setBrowserVoices(listBrowserHebrewVoices());
                      }}
                    >
                      רענן
                    </button>
                  </label>
                  {browserVoices.length === 0 ? (
                    <p className="settings-warn">לא נמצא קול עברית — התקן ב-Windows: שפה → עברית → דיבור</p>
                  ) : (
                    <select
                      id="tts_voice_uri"
                      value={form.tts_voice_uri}
                      onChange={(e) => setForm({ ...form, tts_voice_uri: e.target.value })}
                    >
                      <option value="">אוטומטי</option>
                      {browserVoices.map((v) => (
                        <option key={v.uri} value={v.uri}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="settings-field">
                  <label htmlFor="tts_rate">מהירות ({form.tts_rate})</label>
                  <input
                    id="tts_rate"
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.02"
                    value={form.tts_rate}
                    onChange={(e) => setForm({ ...form, tts_rate: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="settings-actions-inline">
              <button type="button" className="btn-primary" onClick={testTts} disabled={testing}>
                {testing ? 'משמיע…' : 'בדיקת הקראה'}
              </button>
            </div>
          </section>
        )}

        {tab === 'backup' && (
          <section className="settings-block">
            <h2 className="settings-block__title">גיבוי נתונים</h2>
            <p className="settings-hint settings-hint--top">
              גיבוי יומי אוטומטי (14 יום). גיבוי ידני ב«סטטוס מערכת».
            </p>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={form.backup_auto_daily === '1'}
                onChange={(e) =>
                  setForm({ ...form, backup_auto_daily: e.target.checked ? '1' : '0' })
                }
              />
              <span>גיבוי אוטומטי פעם ביום (בהפעלת השרת)</span>
            </label>
          </section>
        )}
      </div>

      <footer className="settings-page__footer">
        <button type="button" className="btn-primary" onClick={save} disabled={saving}>
          {saving ? 'שומר…' : 'שמור הגדרות'}
        </button>
        {tab === 'tts' && (
          <button type="button" className="btn-ghost" onClick={testTts} disabled={testing}>
            בדיקת הקראה
          </button>
        )}
      </footer>
    </div>
  );
}
