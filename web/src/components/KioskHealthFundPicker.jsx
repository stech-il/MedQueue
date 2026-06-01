export default function KioskHealthFundPicker({ funds, value, onChange, disabled }) {
  const list = funds?.length ? funds : ['כללית', 'מכבי', 'מאוחדת', 'לאומית', 'אחר'];

  return (
    <div className="kiosk-fund">
      <div className="kiosk-fund__grid">
        {list.map((name) => (
          <button
            key={name}
            type="button"
            className={`kiosk-fund__btn${value === name ? ' kiosk-fund__btn--on' : ''}`}
            disabled={disabled}
            onClick={() => onChange(name)}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
