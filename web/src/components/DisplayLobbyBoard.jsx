/** לוח תורים ראשי — עמודות צד + מרכז (בהשראת לוח קופת חולים) */

import DisplayHeader from './DisplayHeader';
import DisplayRoomPanel from './DisplayRoomPanel';
import DisplayCenterMedia from './DisplayCenterMedia';
import Ticker from './Ticker';
import WaitingNumbersGrid from './WaitingNumbersGrid';

function splitSides(serving) {
  const list = serving || [];
  const mid = Math.ceil(list.length / 2);
  return [list.slice(0, mid), list.slice(mid)];
}

export default function DisplayLobbyBoard({ serving, settings, clock, ticker }) {
  const [left, right] = splitSides(serving);
  return (
    <>
      <DisplayHeader settings={settings} clock={clock} variant="board" />
      <div className="display-board__body">
        <aside className="display-board__col display-board__col--side" aria-label="תורים שמאל">
          {left.map(({ room, current, waiting }) => (
            <DisplayRoomPanel
              key={room.id}
              room={room}
              current={current}
              waiting={waiting || []}
            />
          ))}
        </aside>

        <section className="display-board__center" aria-label="מידע מרפאה">
          <div className="display-board__center-frame">
            <DisplayCenterMedia settings={settings} />
          </div>
        </section>

        <aside className="display-board__col display-board__col--side" aria-label="תורים ימין">
          {right.map(({ room, current, waiting }) => (
            <DisplayRoomPanel
              key={room.id}
              room={room}
              current={current}
              waiting={waiting || []}
            />
          ))}
        </aside>
      </div>
      <Ticker messages={ticker} size={settings.ticker_size || 'md'} />
    </>
  );
}

export function DisplaySingleRoomBoard({ room, current, queue, settings, clock, ticker }) {
  const waitingOnly = (queue || []).filter((t) => t.status === 'waiting');

  return (
    <>
      <DisplayHeader settings={settings} clock={clock} variant="board" />
      <div className="display-board__body display-board__body--single">
        <div className="display-board__single-wrap">
          <DisplayRoomPanel room={room} current={current} waiting={[]} large />
          {waitingOnly.length > 0 && (
            <div className="display-board__wait-block">
              <p className="display-board__wait-title">ממתינים ({waitingOnly.length})</p>
              <WaitingNumbersGrid tickets={waitingOnly} size="lg" />
            </div>
          )}
        </div>
      </div>
      <Ticker messages={ticker} size={settings.ticker_size || 'md'} />
    </>
  );
}
