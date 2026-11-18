import Parser from "rss-parser";
export type NewsItem = { title: string; link: string; source: string; publishedAt: string | null };
export type DataResult<T> = {
  status: "ok" | "stale" | "error";
  items: T[];
  fetchedAt: string | null;
  error: string | null;
  refreshSeconds: number;
};
export type QuoteItem = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  asOf: string;
  provider: string;
  kind: string;
  currency: string;
  delay: string;
};
const NEWS_URL = "https://news.google.com/rss/search?q=criptomoedas&hl=pt-BR&gl=BR&ceid=BR:pt-419";
export function createMarketService(transport: typeof fetch = fetch, clock = () => Date.now()) {
  const parser = new Parser({
    customFields: { item: [["source", "publisher", { keepArray: false }]] },
  });
  let cached: DataResult<NewsItem> | undefined;
  let next = 0;
  let pending: Promise<DataResult<NewsItem>> | undefined;
  async function news(): Promise<DataResult<NewsItem>> {
    if (cached && clock() < next) return cached;
    if (pending) return pending;
    pending = (async () => {
      try {
        const response = await transport(NEWS_URL, {
          signal: AbortSignal.timeout(5000),
          redirect: "error",
        });
        if (!response.ok) throw new Error(`Google News HTTP ${response.status}`);
        const xml = await response.text();
        if (xml.length > 2000000) throw new Error("Feed excede limite");
        const feed = await parser.parseString(xml);
        const items: NewsItem[] = [];
        const seen = new Set<string>();
        for (const item of feed.items) {
          if (!item.title || !item.link || seen.has(item.link)) continue;
          const url = new URL(item.link);
          if (url.protocol !== "https:" || url.hostname !== "news.google.com") continue;
          const publisher = item.publisher as unknown as { _: string } | string | undefined;
          const date = item.isoDate || item.pubDate;
          items.push({
            title: item.title,
            link: item.link,
            source: typeof publisher === "string" ? publisher : publisher?._ || "Google News",
            publishedAt:
              date && Number.isFinite(Date.parse(date)) ? new Date(date).toISOString() : null,
          });
          seen.add(item.link);
        }
        if (!items.length) throw new Error("Feed sem notícias válidas");
        cached = {
          status: "ok",
          items: items.slice(0, 60),
          fetchedAt: new Date(clock()).toISOString(),
          error: null,
          refreshSeconds: 300,
        };
        next = clock() + 300000;
      } catch (error) {
        cached = {
          status: cached?.items.length ? "stale" : "error",
          items: cached?.items || [],
          fetchedAt: cached?.fetchedAt || null,
          error: error instanceof Error ? error.message : "Feed indisponível",
          refreshSeconds: 300,
        };
        next = clock() + 300000;
      }
      return cached;
    })().finally(() => {
      pending = undefined;
    });
    return pending;
  }
  let quoteCache: DataResult<QuoteItem> | undefined;
  let quoteNext = 0;
  let quotePending: Promise<DataResult<QuoteItem>> | undefined;
  async function quotes(): Promise<DataResult<QuoteItem>> {
    if (quoteCache && clock() < quoteNext) return quoteCache;
    if (quotePending) return quotePending;
    quotePending = (async () => {
      const items: QuoteItem[] = [];
      const errors: string[] = [];
      await Promise.all([
        (async () => {
          try {
            const r = await transport("https://brapi.dev/api/quote/PETR4,VALE3,ITUB4,MGLU3", {
              signal: AbortSignal.timeout(5000),
              redirect: "error",
            });
            if (!r.ok) throw new Error(`brapi HTTP ${r.status}`);
            const body = (await r.json()) as {
              results?: {
                symbol: string;
                longName: string;
                regularMarketPrice: number;
                regularMarketChangePercent: number;
                regularMarketTime: string;
              }[];
            };
            for (const q of body.results || []) {
              if (
                !["PETR4", "VALE3", "ITUB4", "MGLU3"].includes(q.symbol) ||
                !Number.isFinite(q.regularMarketPrice) ||
                q.regularMarketPrice <= 0 ||
                !Number.isFinite(q.regularMarketChangePercent) ||
                !Number.isFinite(Date.parse(q.regularMarketTime))
              )
                continue;
              items.push({
                symbol: q.symbol,
                name: q.longName || q.symbol,
                price: q.regularMarketPrice,
                change: q.regularMarketChangePercent,
                asOf: new Date(q.regularMarketTime).toISOString(),
                provider: "brapi",
                kind: "Ação",
                currency: "BRL",
                delay: "Ativos gratuitos de teste; atraso não informado. Não é B3 em tempo real.",
              });
            }
            if (!items.some((q) => q.provider === "brapi"))
              throw new Error("brapi sem dados válidos");
          } catch (e) {
            errors.push(e instanceof Error ? e.message : "brapi indisponível");
          }
        })(),
        (async () => {
          try {
            const r = await transport(
              "https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL",
              { signal: AbortSignal.timeout(5000), redirect: "error" },
            );
            if (!r.ok) throw new Error(`AwesomeAPI HTTP ${r.status}`);
            const body = (await r.json()) as Record<
              string,
              { name: string; bid: string; pctChange: string; timestamp: string }
            >;
            for (const symbol of ["USDBRL", "EURBRL", "BTCBRL"]) {
              const q = body[symbol];
              if (
                !q ||
                !Number.isFinite(Number(q.bid)) ||
                Number(q.bid) <= 0 ||
                !Number.isFinite(Number(q.pctChange)) ||
                !Number.isFinite(Number(q.timestamp))
              )
                continue;
              items.push({
                symbol,
                name: q.name,
                price: Number(q.bid),
                change: Number(q.pctChange),
                asOf: new Date(Number(q.timestamp) * 1000).toISOString(),
                provider: "AwesomeAPI",
                kind: symbol === "BTCBRL" ? "Cripto" : "Moeda",
                currency: "BRL",
                delay: "Preço de compra (bid); não é cotação executável. Atraso não garantido.",
              });
            }
            if (!items.some((q) => q.provider === "AwesomeAPI"))
              throw new Error("AwesomeAPI sem dados válidos");
          } catch (e) {
            errors.push(e instanceof Error ? e.message : "AwesomeAPI indisponível");
          }
        })(),
      ]);
      if (items.length)
        quoteCache = {
          status: errors.length ? "stale" : "ok",
          items: items.sort((a, b) => a.symbol.localeCompare(b.symbol)),
          fetchedAt: new Date(clock()).toISOString(),
          error: errors.join("; ") || null,
          refreshSeconds: 60,
        };
      else
        quoteCache = {
          status: quoteCache?.items.length ? "stale" : "error",
          items: quoteCache?.items || [],
          fetchedAt: quoteCache?.fetchedAt || null,
          error: errors.join("; "),
          refreshSeconds: 60,
        };
      quoteNext = clock() + 60000;
      return quoteCache;
    })().finally(() => {
      quotePending = undefined;
    });
    return quotePending;
  }
  return { news, quotes };
}
export const marketService = createMarketService();
