import { useEffect, useState } from "react";
import type { DataResult, NewsItem, QuoteItem } from "../lib/market.server";
const config = {
  mode: "crypto",
  brand: "BLOCK / BR",
  title: "Além da próxima alta.",
  intro: "Acompanhe o ecossistema cripto com informação — não com hype.",
};
const money = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const stamp = (v: string | null) =>
  v
    ? new Date(v).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) + " BRT"
    : "Ainda sem atualização";
export function MarketPage() {
  const [news, setNews] = useState<DataResult<NewsItem> | null>(null),
    [quotes, setQuotes] = useState<DataResult<QuoteItem> | null>(null);
  const [search, setSearch] = useState(""),
    [source, setSource] = useState(""),
    [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    async function read<T>(url: string): Promise<DataResult<T>> {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return await r.json();
      } catch (e) {
        return {
          status: "error",
          items: [],
          error: e instanceof Error ? e.message : "Falha de conexão",
          fetchedAt: null,
          refreshSeconds: 60,
        };
      }
    }
    const [n, q] = await Promise.all([
      config.mode === "terminal" ? Promise.resolve(null) : read<NewsItem>("/api/market/news"),
      read<QuoteItem>("/api/market/quotes"),
    ]);
    if (n)
      setNews((old) =>
        n.status === "error" && old?.items.length ? { ...old, status: "stale", error: n.error } : n,
      );
    setQuotes((old) =>
      q.status === "error" && old?.items.length ? { ...old, status: "stale", error: q.error } : q,
    );
    setBusy(false);
  }
  useEffect(() => {
    void refresh();
    const id = window.setInterval(
      () => void refresh(),
      config.mode === "terminal" ? 60000 : 300000,
    );
    return () => window.clearInterval(id);
  }, []);
  const visible = (news?.items || []).filter(
    (n) => (!source || n.source === source) && n.title.toLowerCase().includes(search.toLowerCase()),
  );
  const prices = (quotes?.items || []).filter(
    (q) =>
      config.mode !== "terminal" ||
      `${q.symbol} ${q.name}`.toLowerCase().includes(search.toLowerCase()),
  );
  const primary = config.mode === "terminal" ? quotes : news;
  return (
    <div className={`market-page ${config.mode}`}>
      <header className="masthead">
        <a href="/" className="logo">
          {config.brand}
          <span>●</span>
        </a>
        <div className="edition">
          INFORMAÇÃO ABERTA
          <br />
          BRASIL / MERCADOS
        </div>
        <span className="header-note">Leitura independente. Dados públicos.</span>
      </header>
      <nav className="section-nav" aria-label="Seções">
        <a href="#conteudo">
          {config.mode === "terminal" ? "Painel de preços" : "Últimas notícias"}
        </a>
        <a href="#fontes">Fontes & metodologia</a>
        <span>SEM CADASTRO · SEM RECOMENDAÇÃO</span>
      </nav>
      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">
              {config.mode === "crypto"
                ? "ATIVOS DIGITAIS · NOVA ECONOMIA"
                : "ECONOMIA, EMPRESAS & CAPITAL"}
            </p>
            <h1>{config.title}</h1>
            <p className="intro">{config.intro}</p>
          </div>
          <div className="hero-note">
            <span className="signal" /> DADOS PÚBLICOS
            <small>
              Refresh {config.mode === "terminal" ? "60 segundos" : "5 minutos"}
              <br />
              Não é B3 em tempo real.
            </small>
          </div>
        </section>
        <section className="ticker" aria-label="Cotações de referência">
          {!quotes ? (
            <p>Carregando cotações reais…</p>
          ) : !quotes.items.length ? (
            <p role="alert">Cotações indisponíveis. {quotes.error}</p>
          ) : (
            prices.map((q) => (
              <div key={q.symbol}>
                <span>
                  {q.symbol}
                  <small>{q.provider}</small>
                </span>
                <strong>{money(q.price)}</strong>
                <b className={q.change >= 0 ? "up" : "down"}>
                  {q.change >= 0 ? "+" : ""}
                  {q.change.toFixed(2)}%
                </b>
              </div>
            ))
          )}
        </section>
        {quotes && quotes.status !== "ok" && (
          <p className="warning" role="status">
            {quotes.status === "stale"
              ? "Dados em cache ou cobertura parcial (stale)."
              : "Falha nas cotações."}{" "}
            {quotes.error}
          </p>
        )}
        <section id="conteudo" className="content">
          <div className="content-heading">
            <div>
              <p className="eyebrow">
                {config.mode === "terminal" ? "MARKET WATCH / BRL" : "CURADORIA AUTOMÁTICA / PT-BR"}
              </p>
              <h2>{config.mode === "terminal" ? "Monitor de ativos" : "O que move o mercado"}</h2>
            </div>
            <button disabled={busy} onClick={() => void refresh()}>
              {busy ? "Atualizando…" : "↻ Atualizar"}
            </button>
          </div>
          <div className="filters">
            <label>
              Buscar
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  config.mode === "terminal" ? "Símbolo ou empresa" : "Título da notícia"
                }
              />
            </label>
            {config.mode !== "terminal" && (
              <label>
                Fonte
                <select value={source} onChange={(e) => setSource(e.target.value)}>
                  <option value="">Todas as fontes</option>
                  {Array.from(new Set(news?.items.map((n) => n.source)))
                    .sort()
                    .map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                </select>
              </label>
            )}
            <span>{stamp(primary?.fetchedAt || null)}</span>
          </div>
          {primary && primary.status !== "ok" && (
            <div className="warning" role="alert">
              {primary.status === "stale"
                ? "Dados antigos em cache (stale)."
                : "Não foi possível carregar."}{" "}
              {primary.error} <button onClick={() => void refresh()}>Tentar novamente</button>
            </div>
          )}
          {!primary && (
            <div className="empty" role="status">
              Conectando às fontes públicas…
            </div>
          )}
          {config.mode === "terminal" ? (
            <div className="table-wrap">
              <table>
                <caption>
                  Preços de referência em reais · variação informada pelo fornecedor
                </caption>
                <thead>
                  <tr>
                    <th>Ativo / empresa</th>
                    <th>Mercado</th>
                    <th>Preço BRL</th>
                    <th>Variação %</th>
                    <th>Fornecedor / horário</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((q) => (
                    <tr key={q.symbol}>
                      <td>
                        <strong>{q.symbol}</strong>
                        <small>{q.name}</small>
                      </td>
                      <td>{q.kind}</td>
                      <td>{money(q.price)}</td>
                      <td className={q.change >= 0 ? "up" : "down"}>
                        {q.change > 0 ? "+" : ""}
                        {q.change.toFixed(2)}%
                      </td>
                      <td>
                        {q.provider}
                        <small>{stamp(q.asOf)}</small>
                        <small>{q.delay}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {quotes && !prices.length && (
                <p className="empty">Nenhum ativo disponível para este filtro.</p>
              )}
            </div>
          ) : (
            <div className="news-layout">
              <div className="articles">
                {visible.map((n, i) => (
                  <article className={i === 0 ? "lead-story" : ""} key={n.link}>
                    <div className="article-meta">
                      <span>{n.source}</span>
                      <time dateTime={n.publishedAt || undefined}>{stamp(n.publishedAt)}</time>
                    </div>
                    <a href={n.link} target="_blank" rel="noopener noreferrer">
                      <h3>{n.title}</h3>
                      <span className="read-link">Ler na fonte ↗</span>
                    </a>
                  </article>
                ))}
                {news && !visible.length && (
                  <p className="empty">Nenhuma notícia para este filtro.</p>
                )}
              </div>
              <aside>
                <p className="eyebrow">EM PERSPECTIVA</p>
                <h3>
                  Informação antes
                  <br />
                  da decisão.
                </h3>
                <p>Manchetes de veículos independentes. Confira sempre a publicação original.</p>
                <div className="aside-rule" />
                <p>
                  Sem sinais de compra.
                  <br />
                  Sem promessas de retorno.
                  <br />
                  Sem números inventados.
                </p>
                <small>Links via Google News. Alguns veículos podem exigir assinatura.</small>
              </aside>
            </div>
          )}
        </section>
        <section id="fontes" className="method">
          <h2>Transparência de dados</h2>
          <p>
            {config.mode === "terminal"
              ? "brapi: PETR4, VALE3, ITUB4 e MGLU3 são ativos gratuitos de teste. Não representam um feed oficial B3. AwesomeAPI: USD/BRL, EUR/BRL e BTC/BRL, preço de compra (bid)."
              : "Google News RSS pt-BR: título, fonte, data e link. Leitor pessoal, não comercial, conforme restrição do feed. Sem reprodução integral."}
          </p>
          <p>
            Notícias: cache 5 minutos. Preços: cache 60 segundos. Atraso do fornecedor não
            garantido; horários em Brasília. Falhas não geram valores fictícios: último resultado
            marcado stale ou estado de erro. Limites e disponibilidade podem mudar. Não é
            aconselhamento financeiro.
          </p>
          {config.mode !== "terminal" && (
            <details>
              <summary>Horários das cotações e fornecedores</summary>
              {prices.map((q) => (
                <p key={q.symbol}>
                  {q.symbol} · {q.provider} · {stamp(q.asOf)} · {q.delay}
                </p>
              ))}
            </details>
          )}
        </section>
      </main>
      <footer>
        <a href="/" className="logo">
          {config.brand}
        </a>
        <p>Informação para acompanhar. Não para recomendar.</p>
        <p className="service-notice">
          Conexão de serviço ativa: este projeto registra sua credencial de IA no servidor da
          central para uso pelo gateway. A credencial não é exibida no navegador.
        </p>
      </footer>
    </div>
  );
}
