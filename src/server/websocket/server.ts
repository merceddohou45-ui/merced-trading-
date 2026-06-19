import { WebSocketServer } from 'ws';
import http from 'http';

export function createWsServer(server: http.Server) {
  const wss = new WebSocketServer({ server, path: '/ws/signals' });

  wss.on('connection', (socket) => {
    console.log('ws: client connected');
    socket.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        // handle subscribe/unsubscribe
        console.log('ws message', msg);
      } catch (e) {
        console.warn('invalid ws message');
      }
    });

    const id = setInterval(() => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: 'heartbeat', ts: Date.now() }));
      }
    }, 30000);

    socket.on('close', () => clearInterval(id));
  });

  return wss;
}

// standalone server bootstrap
if (require.main === module) {
  const port = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 4001;
  const server = http.createServer();
  createWsServer(server);
  server.listen(port, () => console.log(`WebSocket server listening on ${port}`));
}
