import { useMemo, useState } from 'react';
import { api } from '../api';
import { parseDisplaySlides } from '../lib/displayCenter';

const MODES = [
  { value: 'default', title: 'ברירת מחדל', desc: 'לוגו + שם + טקסט' },
  { value: 'slideshow', title: 'שקופיות', desc: 'מספר תמונות מתחלפות' },
  { value: 'image', title: 'תמונה אחת', desc: 'תמונה קבועה במרכז' },
  { value: 'video', title: 'סרטון', desc: 'קובץ MP4/WebM או קישור' },
];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('קריאת קובץ נכשלה'));
    reader.readAsDataURL(file);
  });
}

export default function DisplayCenterSettings({ form, setForm, onSettingsPatch }) {
  const [busy, setBusy] = useState('');
  const [videoUrl, setVideoUrl] = useState(form.display_center_video || '');
  const slides = useMemo(() => parseDisplaySlides(form.display_center_slides), [form.display_center_slides]);
  const mode = form.display_center_mode || 'default';

  const patch = (settings) => {
    setForm((f) => ({ ...f, ...settings }));
    onSettingsPatch?.(settings);
  };

  const uploadSlide = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setBusy('slide');
    try {
      for (const file of files) {
        const dataUrl = await readFileAsDataUrl(file);
        const res = await api.uploadDisplaySlide(dataUrl);
        patch(res.settings);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy('');
    }
  };

  const removeSlide = async (url) => {
    setBusy('slide');
    try {
      const res = await api.removeDisplaySlide(url);
      patch(res.settings);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy('');
    }
  };

  const uploadImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy('image');
    try {
      const res = await api.uploadDisplayImage(await readFileAsDataUrl(file));
      patch(res.settings);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy('');
    }
  };

  const uploadVideo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy('video');
    try {
      const res = await api.uploadDisplayVideo({ image: await readFileAsDataUrl(file) });
      patch(res.settings);
      setVideoUrl(res.settings.display_center_video || '');
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy('');
    }
  };

  const saveVideoUrl = async () => {
    setBusy('video');
    try {
      const res = await api.uploadDisplayVideo({ external_url: videoUrl.trim() });
      patch(res.settings);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy('');
    }
  };

  const clearMedia = async (field) => {
    setBusy(field);
    try {
      const res = await api.clearDisplayMedia(field);
      patch(res.settings);
      if (field === 'video') setVideoUrl('');
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="display-center-settings">
      <div className="settings-choices settings-choices--wrap">
        {MODES.map((m) => (
          <label
            key={m.value}
            className={`settings-choice settings-choice--compact${mode === m.value ? ' settings-choice--on' : ''}`}
          >
            <input
              type="radio"
              name="display_center_mode"
              checked={mode === m.value}
              onChange={() => setForm({ ...form, display_center_mode: m.value })}
            />
            <span className="settings-choice__title">{m.title}</span>
            <span className="settings-choice__desc">{m.desc}</span>
          </label>
        ))}
      </div>

      {mode === 'slideshow' && (
        <div className="settings-subpanel">
          <div className="settings-field settings-field--narrow">
            <label htmlFor="slide_seconds">משך לשקופית (שניות)</label>
            <input
              id="slide_seconds"
              type="number"
              min={3}
              max={120}
              value={form.display_center_slide_seconds || '8'}
              onChange={(e) => setForm({ ...form, display_center_slide_seconds: e.target.value })}
            />
          </div>
          <div className="settings-field">
            <label className="btn-primary settings-file-btn">
              <input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={!!busy} onChange={uploadSlide} hidden />
              {busy === 'slide' ? 'מעלה…' : '+ הוסף תמונות'}
            </label>
            <p className="settings-hint">PNG, JPG, WebP — עד 5MB</p>
          </div>
          {slides.length > 0 && (
            <ul className="display-center-settings__slides">
              {slides.map((url) => (
                <li key={url}>
                  <img src={url} alt="" />
                  <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => removeSlide(url)}>
                    הסר
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mode === 'image' && (
        <div className="settings-subpanel">
          <label className="btn-primary settings-file-btn">
            <input type="file" accept="image/png,image/jpeg,image/webp" disabled={!!busy} onChange={uploadImage} hidden />
            {busy === 'image' ? 'מעלה…' : 'העלה תמונה'}
          </label>
          {form.display_center_image && (
            <div className="display-center-settings__preview">
              <img src={form.display_center_image} alt="" />
              <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => clearMedia('image')}>
                הסר
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'video' && (
        <div className="settings-subpanel">
          <label className="btn-primary settings-file-btn">
            <input type="file" accept="video/mp4,video/webm" disabled={!!busy} onChange={uploadVideo} hidden />
            {busy === 'video' ? 'מעלה…' : 'העלה סרטון'}
          </label>
          <p className="settings-hint">MP4 / WebM — עד 40MB, לולאה ללא קול</p>
          <div className="settings-field">
            <label htmlFor="video_url">או קישור ישיר</label>
            <div className="settings-inline-row">
              <input
                id="video_url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://.../video.mp4"
                dir="ltr"
              />
              <button type="button" className="btn-primary" disabled={!!busy} onClick={saveVideoUrl}>
                שמור
              </button>
            </div>
          </div>
          {form.display_center_video && (
            <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => clearMedia('video')}>
              הסר סרטון
            </button>
          )}
        </div>
      )}

      {mode === 'default' && (
        <p className="settings-hint">משתמש בשם המרפאה, לוגו ושדה «טקסט ברירת מחדל» למטה.</p>
      )}
    </div>
  );
}
