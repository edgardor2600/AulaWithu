/**
 * Type declaration for y-websocket internal utils.
 *
 * The package does not ship TypeScript types for bin/utils.js,
 * so we declare the subset we actually use here.
 * This lets us use a proper `import` instead of a bare `require()`.
 */
declare module 'y-websocket/bin/utils' {
  import type { IncomingMessage } from 'http';
  import type { WebSocket } from 'ws';

  interface SetupWSConnectionOptions {
    /** Custom document name (defaults to url path) */
    docName?: string;
    /** Enable garbage collection on the shared doc */
    gc?: boolean;
  }

  /**
   * Attaches a Yjs sync/awareness handler to an already-authenticated WebSocket.
   */
  export function setupWSConnection(
    ws: WebSocket,
    req: IncomingMessage,
    options?: SetupWSConnectionOptions
  ): void;
}
