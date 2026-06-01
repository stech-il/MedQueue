/** תבנית מסך תצוגה קלאסית — רשת כרטיסי חדרים */

import DisplayHeader from './DisplayHeader';
import RoomQueueCard from './RoomQueueCard';
import Ticker from './Ticker';

export default function DisplayLobbyClassic({ serving, settings, clock, ticker }) {
  return (
    <>
      <DisplayHeader settings={settings} clock={clock} variant="default" />
      <div className="display-rooms-grid">
        {serving?.map(({ room, current, waiting }) => (
          <RoomQueueCard
            key={room.id}
            room={room}
            current={current}
            waiting={waiting || []}
          />
        ))}
      </div>
      <Ticker messages={ticker} size={settings.ticker_size || 'md'} />
    </>
  );
}

export function DisplaySingleRoomClassic({ room, current, queue, settings, clock, ticker }) {
  const waitingOnly = (queue || []).filter((t) => t.status === 'waiting');

  return (
    <>
      <DisplayHeader settings={settings} clock={clock} variant="default" />
      <div className="display-single-room">
        <RoomQueueCard room={room} current={current} waiting={waitingOnly} />
      </div>
      <Ticker messages={ticker} size={settings.ticker_size || 'md'} />
    </>
  );
}
