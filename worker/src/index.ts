interface Env {
  PRESENCE: DurableObjectNamespace;
}

const ALLOWED_ORIGINS = new Set([
  "https://k8s.saidborna.com",
  "http://localhost:5173",
  "http://localhost:4173",
]);

export class PresenceRoom {
  private state: DurableObjectState;
  private sessions: Set<WebSocket> = new Set();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response(JSON.stringify({ count: this.sessions.size }), {
        headers: { "content-type": "application/json" },
      });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    server.accept();
    this.sessions.add(server);
    this.broadcast();

    const cleanup = () => {
      if (this.sessions.delete(server)) {
        this.broadcast();
      }
    };

    server.addEventListener("close", cleanup);
    server.addEventListener("error", cleanup);

    return new Response(null, { status: 101, webSocket: client });
  }

  private broadcast() {
    const message = JSON.stringify({ count: this.sessions.size });
    for (const ws of this.sessions) {
      try {
        ws.send(message);
      } catch {
        this.sessions.delete(ws);
      }
    }
  }
}

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === "/ws") {
      const id = env.PRESENCE.idFromName("global");
      const room = env.PRESENCE.get(id);
      return room.fetch(request);
    }

    if (url.pathname === "/count") {
      const id = env.PRESENCE.idFromName("global");
      const room = env.PRESENCE.get(id);
      const resp = await room.fetch(new Request("https://internal/count"));
      const body = await resp.text();
      return new Response(body, {
        headers: {
          "content-type": "application/json",
          ...corsHeaders(origin),
        },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        endpoints: { ws: "/ws", count: "/count" },
      }),
      {
        headers: {
          "content-type": "application/json",
          ...corsHeaders(origin),
        },
      },
    );
  },
};
