/** כותרת מסך תצוגה */

export default function DisplayHeader({ settings, clock, variant = 'default' }) {
  const clinic = settings?.clinic_name || 'מוקד רפואי';
  const logo = settings?.clinic_logo?.trim();
  const dateStr = clock.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = clock.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  if (variant === 'board') {
    return (
      <header className="display-header display-header--board">
        <div className="display-header--board__inner">
          {logo ? (
            <img src={logo} alt="" className="display-header--board__logo" />
          ) : (
            <div className="display-header--board__logo-ph">MQ</div>
          )}
          <h1 className="display-header--board__title">{clinic}</h1>
        </div>
        <div className="display-header--board__clock">
          <span className="display-header--board__date">{dateStr}</span>
          <span className="display-header--board__time">{timeStr}</span>
        </div>
      </header>
    );
  }

  return (
    <header className="display-header">
      <div className="display-header__brand">
        {logo ? (
          <img src={logo} alt="" className="display-header__logo" />
        ) : (
          <div className="display-header__logo-ph">MQ</div>
        )}
        <div>
          <p className="display-header__tag">MedQueue</p>
          <h1 className="display-header__title">{clinic}</h1>
        </div>
      </div>
      <div className="display-header__clock">
        <span className="display-header__date">{dateStr}</span>
        <span className="display-header__time">{timeStr}</span>
      </div>
    </header>
  );
}
