import { getToken, clearSession } from './lib/authStore';

const BASE = '';

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearSession();
    const onManage =
      typeof window !== 'undefined' && window.location.pathname.startsWith('/manage');
    if (onManage && !path.includes('/auth/login')) {
      window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
    }
  }
  if (!res.ok) throw new Error(data.error || 'שגיאה בשרת');
  return data;
}

export const api = {
  login: (username, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request('/api/auth/me'),
  changePassword: (current_password, new_password) =>
    request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),

  getSettings: () => request('/api/settings'),
  updateSettings: (body) => request('/api/settings', { method: 'PUT', body: JSON.stringify(body) }),
  uploadLogo: (imageDataUrl) =>
    request('/api/settings/logo', { method: 'POST', body: JSON.stringify({ image: imageDataUrl }) }),
  removeLogo: () => request('/api/settings/logo', { method: 'DELETE' }),
  uploadDisplaySlide: (image) =>
    request('/api/settings/display-slide', { method: 'POST', body: JSON.stringify({ image }) }),
  removeDisplaySlide: (url) =>
    request('/api/settings/display-slide', { method: 'DELETE', body: JSON.stringify({ url }) }),
  uploadDisplayImage: (image) =>
    request('/api/settings/display-image', { method: 'POST', body: JSON.stringify({ image }) }),
  uploadDisplayVideo: (body) =>
    request('/api/settings/display-video', { method: 'POST', body: JSON.stringify(body) }),
  clearDisplayMedia: (field) =>
    request('/api/settings/display-media', { method: 'DELETE', body: JSON.stringify({ field }) }),
  getTtsVoices: () => request('/api/tts/voices'),
  speakTts: async (text) => {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch('/api/tts/speak', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'שגיאה בהקראה');
    }
    return res.blob();
  },

  getRooms: () => request('/api/rooms'),
  getRoomsAll: () => request('/api/rooms/all'),
  getRoom: (id) => request(`/api/rooms/${id}`),
  createRoom: (body) => request('/api/rooms', { method: 'POST', body: JSON.stringify(body) }),
  updateRoom: (id, body) => request(`/api/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteRoom: (id) => request(`/api/rooms/${id}`, { method: 'DELETE' }),
  getSharedGroups: () => request('/api/rooms/shared-groups'),

  getServices: () => request('/api/services'),
  createService: (body) => request('/api/services', { method: 'POST', body: JSON.stringify(body) }),
  updateService: (id, body) => request(`/api/services/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  getUsers: () => request('/api/users'),
  createUser: (body) => request('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) => request(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  getDashboard: () => request('/api/admin/dashboard'),
  getReports: (params = {}) => {
    const q = new URLSearchParams();
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    if (params.room_id) q.set('room_id', params.room_id);
    if (params.service_id) q.set('service_id', params.service_id);
    if (params.status) q.set('status', params.status);
    const qs = q.toString();
    return request(`/api/admin/reports${qs ? `?${qs}` : ''}`);
  },
  getTickets: () => request('/api/tickets'),
  createTicket: (body) => request('/api/tickets', { method: 'POST', body: JSON.stringify(body) }),

  getKioskConfig: () => request('/api/kiosk/config'),
  createKioskTicket: (body) =>
    request('/api/kiosk/ticket', { method: 'POST', body: JSON.stringify(body) }),

  getQueue: (roomId) => request(`/api/rooms/${roomId}/queue`),
  getDisplay: (roomId) => request(`/api/rooms/${roomId}/display`),
  getLobby: () => request('/api/display/lobby'),
  getRoomStation: (roomId) => request(`/api/rooms/${roomId}/station`),

  callNext: (roomId) => request(`/api/rooms/${roomId}/call-next`, { method: 'POST' }),
  callTicketAtStation: (roomId, ticketId) =>
    request(`/api/rooms/${roomId}/call-ticket/${ticketId}`, { method: 'POST' }),
  bumpTicketPriority: (ticketId) =>
    request(`/api/tickets/${ticketId}/bump-priority`, { method: 'POST' }),
  clearTicketPriority: (ticketId) =>
    request(`/api/tickets/${ticketId}/clear-priority`, { method: 'POST' }),
  forwardTicket: (ticketId, toRoomId) =>
    request(`/api/tickets/${ticketId}/forward`, {
      method: 'POST',
      body: JSON.stringify({ room_id: toRoomId }),
    }),
  summonDoctor: (stationRoomId, targetRoomId) =>
    request(`/api/rooms/${stationRoomId}/summon-doctor`, {
      method: 'POST',
      body: JSON.stringify({ target_room_id: targetRoomId }),
    }),
  receivePatient: (id) => request(`/api/tickets/${id}/receive`, { method: 'POST' }),
  announceTicket: (id) => request(`/api/tickets/${id}/announce`, { method: 'POST' }),
  callTicket: (id, roomId) =>
    request(`/api/tickets/${id}/call`, { method: 'POST', body: JSON.stringify({ room_id: roomId }) }),
  serveTicket: (id) => request(`/api/tickets/${id}/serve`, { method: 'POST' }),
  moveTicket: (id, roomId) =>
    request(`/api/tickets/${id}/move`, { method: 'POST', body: JSON.stringify({ room_id: roomId }) }),
  completeTicket: (id) => request(`/api/tickets/${id}/complete`, { method: 'POST' }),
  skipTicket: (id) => request(`/api/tickets/${id}/skip`, { method: 'POST' }),
  recallTicket: (id, roomId) =>
    request(`/api/tickets/${id}/recall`, {
      method: 'POST',
      body: JSON.stringify({ room_id: roomId }),
    }),
  getStats: () => request('/api/stats'),

  getSystemStatus: () => request('/api/admin/system-status'),
  getBackups: () => request('/api/admin/backups'),
  createBackup: () => request('/api/admin/backup', { method: 'POST' }),
  testExternalPatientConnection: () => request('/api/admin/external-patient/test', { method: 'POST' }),
  getWhatsAppStatus: () => request('/api/admin/whatsapp/status'),
  connectWhatsApp: () => request('/api/admin/whatsapp/connect', { method: 'POST' }),
  disconnectWhatsApp: () => request('/api/admin/whatsapp/disconnect', { method: 'POST' }),
  testAlertEmail: () => request('/api/admin/email/test', { method: 'POST' }),
  getActivityLog: (params = {}) => {
    const q = new URLSearchParams();
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    if (params.limit) q.set('limit', params.limit);
    const qs = q.toString();
    return request(`/api/admin/activity${qs ? `?${qs}` : ''}`);
  },
};
