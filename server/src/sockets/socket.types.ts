import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export interface SocketGatewayOptions {
  corsOrigin: string | string[];
}
