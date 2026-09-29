import { io, type Socket } from 'socket.io-client';

/**
 * A single lazily-created Socket.IO connection.
 *
 * The socket is only opened once a signed-in visitor (or admin) needs it, and it
 * is torn down on sign-out. Real-time events simply invalidate React Query
 * caches — the UI never renders socket payloads directly, so a missed event can
 * never leave the screen inconsistent.
 */

let socket: Socket | null = null;

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ??
  (typeof window === 'undefined' ? 'http://localhost:5000' : window.location.origin);

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
