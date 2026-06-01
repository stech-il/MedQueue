import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '../api';

import OnScreenKeyboard from '../components/OnScreenKeyboard';

import KioskHealthFundPicker from '../components/KioskHealthFundPicker';

import { validatePhoneDigits, validateIdDigits } from '../lib/israeliValidators';



const STEPS = ['phone', 'id', 'fund', 'done'];

/** שניות להצגת מספר התור לפני חזרה אוטומטית למסך הראשי */

const DONE_SCREEN_SECONDS = 8;



function formatPhoneDisplay(digits) {

  const d = digits.slice(0, 10);

  if (d.length <= 3) return d;

  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;

  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;

}



function formatIdDisplay(digits) {

  const d = digits.slice(0, 9);

  if (d.length <= 3) return d;

  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;

  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;

}



export default function Kiosk() {

  const [settings, setSettings] = useState({});

  const [receptionRoom, setReceptionRoom] = useState(null);

  const [step, setStep] = useState('phone');

  const [phoneDigits, setPhoneDigits] = useState('');

  const [idDigits, setIdDigits] = useState('');

  const [healthFund, setHealthFund] = useState('');

  const [healthFunds, setHealthFunds] = useState([]);

  const [loading, setLoading] = useState(false);

  const [ticket, setTicket] = useState(null);

  const [error, setError] = useState('');

  const submittingRef = useRef(false);

  useEffect(() => {
    api.getKioskConfig().then((cfg) => {
      setSettings(cfg.settings || {});
      setReceptionRoom(cfg.reception_room);
      setHealthFunds(cfg.health_funds || []);
    });
  }, []);



  const phoneDisplay = formatPhoneDisplay(phoneDigits);

  const idDisplay = formatIdDisplay(idDigits);

  const goNext = () => {

    setError('');

    if (step === 'phone') {

      const phoneCheck = validatePhoneDigits(phoneDigits);

      if (!phoneCheck.ok) {

        setError(phoneCheck.error);

        return;

      }

      setStep('id');

      return;

    }

    if (step === 'id') {

      const idCheck = validateIdDigits(idDigits);

      if (!idCheck.ok) {

        setError(idCheck.error);

        return;

      }

      setStep('fund');

    }

  };



  const goBack = () => {

    setError('');

    if (step === 'fund') setStep('id');

    else if (step === 'id') setStep('phone');

  };



  const submitTicket = useCallback(

    async (fundName) => {

      if (submittingRef.current) return;

      const fund = (fundName ?? healthFund)?.trim();

      if (!fund) {

        setError('יש לבחור קופת חולים');

        return;

      }



      const phoneCheck = validatePhoneDigits(phoneDigits);

      const idCheck = validateIdDigits(idDigits);

      if (!phoneCheck.ok || !idCheck.ok) {

        setError(phoneCheck.error || idCheck.error);

        return;

      }



      submittingRef.current = true;

      setLoading(true);

      setError('');

      setHealthFund(fund);



      try {

        const created = await api.createKioskTicket({

          phone: phoneCheck.normalized,

          id_number: idCheck.normalized,

          health_fund: fund,

        });

        setTicket(created);

        setStep('done');
      } catch (e) {

        setError(e.message);

      } finally {

        setLoading(false);

        submittingRef.current = false;

      }

    },

    [healthFund, phoneDigits, idDigits]

  );



  const handleFundSelect = (name) => {

    if (loading || submittingRef.current) return;

    submitTicket(name);

  };



  const reset = useCallback(() => {

    setStep('phone');

    setPhoneDigits('');

    setIdDigits('');

    setHealthFund('');

    setTicket(null);

    setError('');

  }, []);



  useEffect(() => {

    if (step !== 'done' || !ticket) return undefined;

    const back = setTimeout(reset, DONE_SCREEN_SECONDS * 1000);

    return () => clearTimeout(back);

  }, [step, ticket, reset]);



  const clinicName = settings.clinic_name || 'מוקד רפואי';



  return (

    <div className="kiosk-page kiosk-touch">

      <header className="kiosk-page__header">

        <h1 className="kiosk-page__welcome">ברוכים הבאים</h1>

        <p className="kiosk-page__clinic">{clinicName}</p>

      </header>

      <main className="kiosk-page__main">

        {step === 'phone' && (

          <section className="kiosk-page__form">

            <h2 className="kiosk-page__step-title">נא להכניס מספר טלפון נייד</h2>

            <OnScreenKeyboard

              value={phoneDigits}

              displayText={phoneDisplay}

              onChange={(v) => {

                setPhoneDigits(v.replace(/\D/g, '').slice(0, 10));

                setError('');

              }}

              maxLength={10}

            />

          </section>

        )}



        {step === 'id' && (

          <section className="kiosk-page__form">

            <h2 className="kiosk-page__step-title">נא להכניס ת.ז.</h2>

            <OnScreenKeyboard

              value={idDigits}

              displayText={idDisplay}

              onChange={(v) => {

                setIdDigits(v.replace(/\D/g, '').slice(0, 9));

                setError('');

              }}

              maxLength={9}

            />

          </section>

        )}



        {step === 'fund' && (

          <section className="kiosk-page__form">

            <h2 className="kiosk-page__step-title">אנא בחר קופה</h2>

            <p className="kiosk-page__fund-hint">לאחר הבחירה יוצג מספר התור על המסך</p>

            <KioskHealthFundPicker

              funds={healthFunds}

              value={healthFund}

              disabled={loading}

              onChange={handleFundSelect}

            />

            {loading && <p className="kiosk-page__loading">מנפיק תור…</p>}

          </section>

        )}



        {step === 'done' && ticket && (

          <section className="kiosk-page__done" aria-live="polite">
            <p className="kiosk-page__done-label">מספר התור שלך</p>
            <div className="kiosk-page__big-code">{ticket.display_code}</div>
            <p className="kiosk-page__done-hint">המתן להקריאת התור על המסך</p>
          </section>

        )}



        {step !== 'done' && step !== 'fund' && (

          <>

            {error && <p className="kiosk-page__error">{error}</p>}

            <div className="kiosk-page__actions">

              {step === 'id' && (

                <button type="button" className="btn-ghost kiosk-page__back" onClick={goBack} disabled={loading}>

                  חזרה

                </button>

              )}

              <button

                type="button"

                className="btn-primary kiosk-page__next"

                onClick={goNext}

                disabled={loading}

              >

                {loading ? 'ממתין…' : 'המשך'}

              </button>

            </div>

          </>

        )}



        {step === 'fund' && !loading && (

          <div className="kiosk-page__actions">

            <button type="button" className="btn-ghost kiosk-page__back" onClick={goBack}>

              חזרה

            </button>

          </div>

        )}



        {step === 'fund' && error && <p className="kiosk-page__error">{error}</p>}

      </main>



      <footer className="kiosk-page__footer">

        <span>MedQueue</span>

      </footer>

    </div>

  );

}

