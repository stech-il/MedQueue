/** בוחר תבנית מסך תצוגה לפי הגדרות */

import { getDisplayTemplate } from '../lib/displayTemplate';
import DisplayLobbyBoard, { DisplaySingleRoomBoard } from './DisplayLobbyBoard';
import DisplayLobbyClassic, { DisplaySingleRoomClassic } from './DisplayLobbyClassic';

export default function DisplayLobbyLayout({ serving, settings, clock, ticker }) {
  const template = getDisplayTemplate(settings);
  if (template === 'classic') {
    return (
      <DisplayLobbyClassic serving={serving} settings={settings} clock={clock} ticker={ticker} />
    );
  }
  return <DisplayLobbyBoard serving={serving} settings={settings} clock={clock} ticker={ticker} />;
}

export function DisplaySingleRoomLayout({ room, current, queue, settings, clock, ticker }) {
  const template = getDisplayTemplate(settings);
  if (template === 'classic') {
    return (
      <DisplaySingleRoomClassic
        room={room}
        current={current}
        queue={queue}
        settings={settings}
        clock={clock}
        ticker={ticker}
      />
    );
  }
  return (
    <DisplaySingleRoomBoard
      room={room}
      current={current}
      queue={queue}
      settings={settings}
      clock={clock}
      ticker={ticker}
    />
  );
}
