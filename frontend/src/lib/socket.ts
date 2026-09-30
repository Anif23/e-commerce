import { io, type Socket } from 'socket.io-client';

/**
 * Use the current origin by default. In local development and the Arena preview,
 * Vite proxies `/socket.io` to the API so the browser never calls localhost.
 */
let socket: Socket | null = null;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

export const getSocket = (accessToken: string): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      path: '/socket.io',
      auth: { token: accessToken },
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 10_000,
      transports: ['websocket', 'polling'],
    });
  } else if ((socket.auth as { token?: string }).token !== accessToken) {
    socket.auth = { token: accessToken };
    socket.disconnect();
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
