/** תוכן מרכזי במסך תצוגה — לוגו / שקופיות / תמונה / סרטון */

import { useEffect, useMemo, useState } from 'react';
import {
  getDisplayCenterMode,
  getSlideIntervalSeconds,
  isVideoUrl,
  parseDisplaySlides,
} from '../lib/displayCenter';

function DefaultCenter({ clinic, logo, tagline }) {
  return (
    <>
      {logo ? (
        <img src={logo} alt="" className="display-board__center-logo" />
      ) : (
        <div className="display-board__center-logo-ph">MQ</div>
      )}
      <h2 className="display-board__center-title">{clinic}</h2>
      {tagline && <p className="display-board__center-tagline">{tagline}</p>}
    </>
  );
}

function Slideshow({ slides, seconds, slidesKey }) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  useEffect(() => {
    setIndex(0);
  }, [slidesKey]);

  useEffect(() => {
    if (count <= 1) return undefined;
    const ms = Math.max(3000, seconds * 1000);
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, ms);
    return () => clearInterval(t);
  }, [slidesKey, count, seconds]);

  if (!slides.length) {
    return <p className="display-center-media__empty">לא הועלו שקופיות — הגדר בניהול</p>;
  }

  return (
    <div className="display-center-media__slideshow">
      {slides.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`display-center-media__slide${i === index ? ' display-center-media__slide--on' : ''}`}
        />
      ))}
      {slides.length > 1 && (
        <div className="display-center-media__dots" aria-hidden>
          {slides.map((_, i) => (
            <span
              key={i}
              className={`display-center-media__dot${i === index ? ' display-center-media__dot--on' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CenterImage({ src }) {
  if (!src) {
    return <p className="display-center-media__empty">לא הועלתה תמונה — הגדר בניהול</p>;
  }
  return <img src={src} alt="" className="display-center-media__single" />;
}

function CenterVideo({ src }) {
  if (!src) {
    return <p className="display-center-media__empty">לא הוגדר סרטון — הגדר בניהול</p>;
  }
  if (isVideoUrl(src)) {
    return (
      <video
        className="display-center-media__video"
        src={src}
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }
  return (
    <video className="display-center-media__video" src={src} autoPlay muted loop playsInline />
  );
}

export default function DisplayCenterMedia({ settings }) {
  const mode = getDisplayCenterMode(settings);
  const clinic = settings?.clinic_name || 'מוקד רפואי';
  const logo = settings?.clinic_logo?.trim();
  const tagline = settings?.display_tagline?.trim() || '';
  const slidesRaw = settings?.display_center_slides || '[]';
  const slides = useMemo(() => parseDisplaySlides(slidesRaw), [slidesRaw]);
  const slideSec = getSlideIntervalSeconds(settings);
  const image = settings?.display_center_image?.trim();
  const video = settings?.display_center_video?.trim();

  const showOverlay =
    mode !== 'default' &&
    (mode === 'slideshow' ? slides.length > 0 : mode === 'image' ? image : video);

  return (
    <div className={`display-center-media display-center-media--${mode}`}>
      {mode === 'default' && <DefaultCenter clinic={clinic} logo={logo} tagline={tagline} />}
      {mode === 'slideshow' && <Slideshow slides={slides} seconds={slideSec} slidesKey={slidesRaw} />}
      {mode === 'image' && <CenterImage src={image} />}
      {mode === 'video' && <CenterVideo src={video} />}
      {showOverlay && (
        <div className="display-center-media__brand">
          {logo && <img src={logo} alt="" className="display-center-media__brand-logo" />}
          <span className="display-center-media__brand-name">{clinic}</span>
        </div>
      )}
    </div>
  );
}
