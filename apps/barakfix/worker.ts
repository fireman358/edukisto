/* Worker unique Barakfix : routes /api/* (ex-Pages Functions) + assets statiques. */

import { onRequest as ownerAuth } from "./functions/api/owner-auth";
import { onRequest as ownerData } from "./functions/api/owner-data";
import { onRequest as ownerDelete } from "./functions/api/owner-delete";
import { onRequest as tenantCreate } from "./functions/api/tenant-create";
import { onRequest as tenantLogin } from "./functions/api/tenant-login";
import { onRequest as tenantData } from "./functions/api/tenant-data";
import { onRequest as tenantRequestCreate } from "./functions/api/tenant-request-create";

interface Env {
  DB: D1Database;
  AUTH_SECRET: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  APP_URL?: string;
  ASSETS: Fetcher;
}

type RouteHandler = (context: { env: Env; request: Request }) => Promise<Response>;

const routes: Record<string, RouteHandler> = {
  "owner-auth": ownerAuth as RouteHandler,
  "owner-data": ownerData as RouteHandler,
  "owner-delete": ownerDelete as RouteHandler,
  "tenant-create": tenantCreate as RouteHandler,
  "tenant-login": tenantLogin as RouteHandler,
  "tenant-data": tenantData as RouteHandler,
  "tenant-request-create": tenantRequestCreate as RouteHandler,
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      const handler = routes[url.pathname.slice("/api/".length)];
      if (handler) return handler({ env, request });
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return env.ASSETS.fetch(request);
  },
};
