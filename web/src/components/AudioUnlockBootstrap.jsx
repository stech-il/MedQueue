import { useEffect } from 'react';
import { installAudioUnlockListeners, prepareDisplayAudio } from '../lib/announce';

/** שחרור השמעה ב-SPA — נשמר בין מסכים אחרי מגע/לחיצה ראשונה */
export default function AudioUnlockBootstrap() {
  useEffect(() => {
    prepareDisplayAudio();
    return installAudioUnlockListeners();
  }, []);
  return null;
}
