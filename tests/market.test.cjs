const test = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-typescript.cjs");
const path = require("node:path");
test("fixed feed parses source, date and safe link with cached refresh", async () => {
  const { createMarketService } = load(path.join(__dirname, "../src/lib/market.server.ts"));
  let calls = 0;
  const service = createMarketService(async (url) => {
    calls++;
    assert.ok(url.startsWith("https://news.google.com/rss/search"));
    return new Response(
      `<rss version="2.0"><channel><title>Test</title><item><title>Mercado sobe</title><link>https://news.google.com/rss/articles/example</link><pubDate>Mon, 02 Nov 2026 12:00:00 GMT</pubDate><source url="https://publisher.example">Publisher</source></item></channel></rss>`,
    );
  });
  const result = await service.news();
  assert.equal(result.status, "ok");
  assert.equal(result.items[0].source, "Publisher");
  assert.equal(result.items[0].publishedAt, "2026-11-02T12:00:00.000Z");
  await service.news();
  assert.equal(calls, 1);
});

test("quotes normalize real provider schema and preserve partial failures without fake prices", async () => {
  const { createMarketService } = load(path.join(__dirname, "../src/lib/market.server.ts"));
  let calls = 0;
  const service = createMarketService(async (url) => {
    calls++;
    return url.includes("brapi.dev")
      ? new Response(
          JSON.stringify({
            results: [
              {
                symbol: "PETR4",
                longName: "Petrobras",
                regularMarketPrice: 30.2,
                regularMarketChangePercent: -1.2,
                regularMarketTime: "2026-11-02T12:00:00Z",
              },
            ],
          }),
        )
      : new Response("blocked", { status: 429 });
  });
  const result = await service.quotes();
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].price, 30.2);
  assert.equal(result.items[0].provider, "brapi");
  assert.match(result.error, /429/);
  await service.quotes();
  assert.equal(calls, 2);
});

test("expired feed keeps last successful data labelled stale and empty failures stay empty", async () => {
  const { createMarketService } = load(path.join(__dirname, "../src/lib/market.server.ts"));
  let now = 0,
    fail = false;
  const service = createMarketService(
    async () => {
      if (fail) throw new Error("offline");
      return new Response(
        `<rss version="2.0"><channel><item><title>News</title><link>https://news.google.com/rss/articles/a</link></item></channel></rss>`,
      );
    },
    () => now,
  );
  const first = await service.news();
  fail = true;
  now = 300001;
  const stale = await service.news();
  assert.equal(stale.status, "stale");
  assert.deepEqual(stale.items, first.items);
  assert.equal(stale.fetchedAt, first.fetchedAt);
  const empty = await createMarketService(async () => {
    throw new Error("offline");
  }).quotes();
  assert.equal(empty.status, "error");
  assert.deepEqual(empty.items, []);
});
test("market page has accessible filters, retry and explicit gateway disclosure", async () => {
  const fs = require("node:fs");
  const os = require("node:os");
  const { pathToFileURL } = require("node:url");
  const { rolldown } = await import("rolldown");
  const file = path.join(__dirname, "../.market-test.mjs");
  const bundle = await rolldown({
    input: path.join(__dirname, "../src/components/MarketPage.tsx"),
    external: ["react", "react/jsx-runtime"],
    transform: { define: { "process.env.NODE_ENV": JSON.stringify("production") } },
  });
  try {
    await bundle.write({ file, format: "esm" });
    const { MarketPage } = await import(pathToFileURL(file).href + "?t=" + Date.now());
    const React = require("react"),
      { renderToStaticMarkup } = require("react-dom/server");
    const html = renderToStaticMarkup(React.createElement(MarketPage));
    assert.match(html, /Buscar/);
    assert.match(html, /Atualizar/);
    assert.match(html, /credencial de IA/);
    assert.match(html, /gateway/);
    assert.match(html, /Google News|AwesomeAPI/);
  } finally {
    await bundle.close();
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
});
