import { createFileRoute } from "@tanstack/react-router";
import { marketService } from "../../../lib/market.server";
export const Route = createFileRoute("/api/market/news")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(await marketService.news(), { headers: { "Cache-Control": "no-store" } }),
    },
  },
});
