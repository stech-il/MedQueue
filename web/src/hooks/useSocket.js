import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { announceTicketClear } from '../lib/announce';

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001' : '';

const SOCKET_EVENTS = [
  'state:refresh',
  'ticket:created',
  'ticket:called',
  'ticket:updated',
  'ticket:moved',
  'ticket:completed',
  'settings:updated',
  'doctor:summon',
  'rooms:updated',
];

export function useSocket(events = {}) {
  const socketRef = useRef(null);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    const names = new Set([...SOCKET_EVENTS, ...Object.keys(eventsRef.current || {})]);
    for (const name of names) {
      socket.on(name, (data) => eventsRef.current[name]?.(data));
    }

    return () => socket.disconnect();
  }, []);

  return socketRef;
}

/** @deprecated — use announceTicketClear */
export function announceTicket(ticket, room, clinicName) {
  announceTicketClear(ticket, room);
  if (clinicName && ticket) {
    document.title = `🔔 ${ticket.display_code} → ${room?.name || ''}`;
  }
}
