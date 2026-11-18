# 03-noticias-cripto

Interface local independente: notícias cripto dark/neon.

## Executar

Verificado com Node.js 22.23.2 / npm 10. Instale Node 22 LTS ou superior compatível.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5103
```

Ou abra `INICIAR.bat`. Acesse http://127.0.0.1:5103. O launcher usa `npm ci` quando faltar node_modules. Não exige cadastro ou token para as fontes implementadas.

```sh
npm test
npm run typecheck
npm run build
npm run lint
```

Os arquivos `*.log` e `VERIFICACAO.json` registram execução real. Os testes usam fixtures declaradamente sintéticas apenas dentro dos arquivos de teste; a interface nunca contém preços simulados.

## Fontes gratuitas e limites

- Notícias: Google News RSS pt-BR, busca fixa criptomoedas. Endpoint `https://news.google.com/rss/search?q=criptomoedas&hl=pt-BR&gl=BR&ceid=BR:pt-419`. Parse XML no servidor com rss-parser. Até 60 manchetes únicas, fonte, publicação, link Google News; sem copiar o artigo completo. Filtro local de título e fonte.
- **Restrição importante:** o próprio RSS informa uso pessoal e não comercial apenas. Este projeto é um leitor local. Não publicar/revender comercialmente este feed sem permissão; substitua por fontes com licença adequada antes desse uso. Links de editoras podem levar a paywalls.
- brapi: `https://brapi.dev/api/quote/PETR4,VALE3,ITUB4,MGLU3`. São os quatro ativos gratuitos de teste verificados sem token. Não é uma cobertura geral da B3 e **não é B3 em tempo real**. Atraso não informado/garantido. Nenhum token opcional foi adicionado; ativos adicionais podem exigir plano/cadastro e estão fora do escopo.
- AwesomeAPI: `https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL`. Compra (bid), variação percentual do fornecedor, timestamp convertido a ISO/Brasília. Não é preço executável nem promessa de feed em tempo real.
- Todos foram consultados via HTTPS sem credenciais. Disponibilidade e limites gratuitos podem mudar; não há SLA. Consultas inválidas não abrem proxy: as URLs externas são constantes, ignorando parâmetros arbitrários.

## Cache e erros

Rotas server-side TanStack `/api/market/news` e `/api/market/quotes` evitam CORS e expõem só dados normalizados. Timeout de 5 segundos por fornecedor, redirects rejeitados. Cache em memória por processo, notícias 300s, cotações 60s; chamadas concorrentes compartilham requisição. HTTP local usa no-store para refletir status atualizado; refresh manual respeita o cache e não força tráfego externo.

Interface atualiza a cada 5 minutos, incluindo o ticker. Fontes parciais/falhas exibem erro e retry; último cache é marcado **stale**. Primeira falha retorna lista vazia, nunca números fictícios. Não há persistência entre reinícios nem garantia de atualização do mercado. Cada cotação traz fornecedor, data/hora e aviso de atraso. Notícias podem não ser cronologicamente ordenadas pelo Google.

## Gateway preservado

Preservados servidor, configuração, assinatura/handshake, central-address, root/mount e rota announce; hashes antes/depois em `VERIFICACAO.json`. Aviso explícito no rodapé: **a credencial de IA é enviada ao servidor da central para uso pelo gateway**. Nenhuma credencial é exibida no navegador. Origem local é ignorada pelo announce original. Nenhuma produção/publish/cadastro live foi executado e nenhum `.env` foi alterado.

## Auditoria de dependências

A instalação original com rss-parser relatou 14 vulnerabilidades moderadas transitivas. Não foi feito `npm audit fix --force`, pois alteraria dependências/framework fora do escopo. Revisar a cadeia antes de publicar. Logs registram warnings de depreciação existentes.

---

## Documentação original do gateway (preservada como referência)

# Base remixável: conexão com a central

Este repositório contém somente o aplicativo-base da Lovable e o mecanismo de cadastro do próprio projeto. O painel, API de modelos, pool, banco, MCP e implantação da VPS ficam em outro projeto.

## O que deve permanecer

- src/server.ts: gatilho server-side e execução SSR.
- src/lib/child-config.server.ts, child-handshake.server.ts e central-address.ts: configuração e envio HTTPS com cache e confirmação do receptor.
- /api/public/v1/workers/announce: diagnóstico sem segredo e disparo idempotente.
- src/routes/__root.tsx: gatilho adicional no carregamento, sem chave no navegador.
- Configuração TanStack/Lovable, página e estilos mínimos, tratamento de erro e testes de conexão.

## Como usar

1. Aguarde a sincronização do GitHub com a base Lovable e publique a versão atualizada.
2. Confirme que o backend fornece LOVABLE_API_KEY, somente no servidor.
3. Faça o remix da base atualizada e abra a prévia hospedada ou publique e acesse o projeto.
4. Confirme a origem na aba Contas da central. O GET /api/public/v1/workers/announce informa ready, keyAvailable, registered e reason sem revelar a credencial.

Destino padrão: https://api.delvertokens.store. GATOR_PUBLIC_URL e PARENT_GATEWAY_URL substituem o padrão: confira variáveis herdadas. Não definir GATEWAY_ROLE=central nos filhos. Nenhum GitHub individual, secret compartilhado ou banco administrativo é necessário no modo auto.

O projeto precisa de runtime servidor e da própria credencial. Uma cópia apenas estática ou o clique em Remix, sem execução do backend, não garantem registro. O cadastro envia a chave de inferência à central para armazenamento cifrado e uso nas chamadas de IA. Autorize somente contas/projetos próprios ou que você pode administrar.

Pode substituir a interface por outro aplicativo sem remover o gatilho. Não copie service_role, senha administrativa, chave Vault ou secrets da central. Esta base não consulta saldo ou data de renovação de créditos.

## Verificação

npm ci
npm test
npm run typecheck
npm run build

## Separação local

Central: C:/Users/e_dio/Desktop/Gateway (código completo e alterações locais preservados).
Remix: C:/Users/e_dio/Desktop/Gateway-Remix (este repositório).
A separação é feita por novo commit; histórico anterior permanece recuperável. Nenhuma implantação na VPS acompanha este commit. Remixes antigos precisam de atualização/publicação própria.

## Correções de baseline e reinstalação

A cópia continha `supabase/config.toml` com project_id e integração Supabase não usada, sem dependência instalada. O teste de isolamento, typecheck e lint originais falhavam nesses arquivos. Foram removidos somente os arquivos órfãos nas três cópias; backups fora do projeto em `C:/Users/e_dio/AppData/Local/hermes/cache/scratch/03-noticias-cripto-unused-supabase` e `03-noticias-cripto-supabase-config.original.toml`. Nenhum arquivo protegido do gateway foi modificado.

No Windows, feche o servidor dev antes de `npm ci`: lightningcss mantém binário nativo em uso, causando EPERM ao reinstalar. A verificação final reinstala com o servidor fechado. Build usa o target Cloudflare original, sem deploy.
