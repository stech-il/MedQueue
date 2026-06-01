/** מקלדת טלפון — סידור קבוע (לא מתהפך ב-RTL) */

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['מחק', '0', '⌫'],
];

export default function OnScreenKeyboard({ value, onChange, maxLength = 10, displayText }) {
  const press = (key) => {
    if (key === 'מחק') {
      onChange('');
      return;
    }
    if (key === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length >= maxLength) return;
    onChange(value + key);
  };

  return (
    <div className="kiosk-keyboard" dir="ltr">
      <div className="kiosk-keyboard__display" aria-live="polite">
        {displayText || '—'}
      </div>
      <div className="kiosk-keyboard__keys">
        {KEYPAD_ROWS.map((row) =>
          row.map((key) => (
            <button
              key={key}
              type="button"
              className={`kiosk-keyboard__key ${
                key === 'מחק' || key === '⌫' ? 'kiosk-keyboard__key--action' : ''
              }`}
              onClick={() => press(key)}
            >
              {key}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
