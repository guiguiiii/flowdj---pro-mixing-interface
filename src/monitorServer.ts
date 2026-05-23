import type { IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import type { Plugin, ViteDevServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';

const MONITOR_SOCKET_PATH = '/flowdj-monitor';

type MonitorClientRole = 'controller' | 'monitor';

type MonitorClient = {
  socket: any;
  role: MonitorClientRole;
};

const getClientRole = (request: IncomingMessage): MonitorClientRole => {
  const host = request.headers.host ?? 'localhost';
  const url = new URL(request.url ?? MONITOR_SOCKET_PATH, `http://${host}`);

  return url.searchParams.get('role') === 'monitor' ? 'monitor' : 'controller';
};

const sendJson = (socket: any, payload: unknown) => {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(payload));
};

const broadcastStatus = (clients: Set<MonitorClient>) => {
  const payload = {
    type: 'monitor-status',
    controllers: [...clients].filter((client) => client.role === 'controller').length,
    monitors: [...clients].filter((client) => client.role === 'monitor').length,
  };

  clients.forEach((client) => sendJson(client.socket, payload));
};

const broadcastToMonitors = (clients: Set<MonitorClient>, message: string) => {
  clients.forEach((client) => {
    if (client.role === 'monitor') {
      sendJson(client.socket, JSON.parse(message));
    }
  });
};

export const flowDjMonitorServer = (): Plugin => ({
  name: 'flowdj-monitor-server',
  configureServer(server: ViteDevServer) {
    if (!server.httpServer) {
      return;
    }

    const clients = new Set<MonitorClient>();
    const socketServer = new WebSocketServer({ noServer: true });

    const handleUpgrade = (request: IncomingMessage, socket: Socket, head: Buffer) => {
      const host = request.headers.host ?? 'localhost';
      const url = new URL(request.url ?? '/', `http://${host}`);

      if (url.pathname !== MONITOR_SOCKET_PATH) {
        return;
      }

      socketServer.handleUpgrade(request, socket, head, (webSocket: any) => {
        socketServer.emit('connection', webSocket, request);
      });
    };

    socketServer.on('connection', (socket: any, request: IncomingMessage) => {
      const client: MonitorClient = {
        socket,
        role: getClientRole(request),
      };

      clients.add(client);
      sendJson(socket, {
        type: 'monitor-hello',
        role: client.role,
      });
      broadcastStatus(clients);

      socket.on('message', (data: Buffer | string) => {
        const message = data.toString();

        if (client.role !== 'controller') {
          return;
        }

        try {
          JSON.parse(message);
          broadcastToMonitors(clients, message);
        } catch {
          sendJson(socket, {
            type: 'monitor-error',
            message: 'Invalid monitor message',
          });
        }
      });

      socket.on('close', () => {
        clients.delete(client);
        broadcastStatus(clients);
      });
    });

    server.httpServer.on('upgrade', handleUpgrade);

    server.httpServer.on('close', () => {
      socketServer.close();
    });
  },
});

