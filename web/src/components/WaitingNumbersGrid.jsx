/** רשת מספרי תור ממתינים — למסך תצוגה */

export default function WaitingNumbersGrid({ tickets, size = 'md', className = '' }) {
  if (!tickets?.length) return null;
  const rootClass = ['wait-numbers-grid', `wait-numbers-grid--${size}`, className]
    .filter(Boolean)
    .join(' ');
  return (
    <ul className={rootClass} aria-label={`${tickets.length} ממתינים`}>
      {tickets.map((t) => (
        <li key={t.id} className="wait-numbers-grid__cell">
          <span className="wait-numbers-grid__code">{t.display_code}</span>
        </li>
      ))}
    </ul>
  );
}
