import { createFileRoute } from "@tanstack/react-router";
import { marketService } from "../../../lib/market.server";
export const Route = createFileRoute("/api/market/quotes")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(await marketService.quotes(), { headers: { "Cache-Control": "no-store" } }),
    },
  },
});
