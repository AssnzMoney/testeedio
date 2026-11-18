import { createFileRoute } from "@tanstack/react-router";
import { MarketPage } from "../components/MarketPage";
export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "BLOCK / BR — mercados e fontes públicas" }] }),
  component: MarketPage,
});
