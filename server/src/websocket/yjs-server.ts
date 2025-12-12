import { WebSocketServer } from 'ws';
// Note: y-websocket does not have complete typescript definitions in some versions, 
// using 'any' or skipping checks might be needed depending on installation.
// @ts-ignore
const { setupWSConnection } = require('y-websocket/bin/utils');

export const setupWebSocketServer = (port: number) => {
  const wss = new WebSocketServer({ port });

  wss.on('connection', (ws: any, req: any) => {
    setupWSConnection(ws, req);
  });

  console.log(`Yjs WebSocket server running on port ${port}`);
};
