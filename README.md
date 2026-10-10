# SlothSignal

Serviço de notificações Web Push da DULLSHIFT, preparado para receber inscrições e eventos dos backends de outros aplicativos. O SlothMint é o consumidor previsto na configuração inicial.

## Estado e funcionamento

A implementação contém API em Next.js, autenticação por aplicativo, contratos Zod, armazenamento no Supabase e envio com `web-push`. O service worker e a solicitação de permissão pertencem ao aplicativo consumidor, em seu próprio domínio.

```text
Navegador → backend do aplicativo → SlothSignal → serviço Web Push → service worker
                                       ↕
                                    Supabase
```

O token de aplicativo e a chave Supabase de servidor permanecem nos backends. A API não fornece CORS público. Cada aplicativo é identificado por `app` e pelo seu Bearer token.

## Execução local

Pré-requisitos: Git, Node.js 20.19 ou mais recente da série 20, ou Node.js 22.12 ou superior, npm e um projeto Supabase para as rotas de inscrições e eventos. O health check responde sem banco ou VAPID, mas não verifica essas dependências.

```bash
git clone https://github.com/PHnsilva/SlothSignal.git
cd SlothSignal
npm ci
```

Copie [`.env.example`](.env.example) para `.env.local`. No PowerShell:

```powershell
Copy-Item .env.example .env.local
```

1. Execute [supabase/migrations/001_signal.sql](supabase/migrations/001_signal.sql) no Supabase. A migração cria `signal_subscriptions` e `signal_events`, com RLS habilitada e sem políticas públicas.
2. Gere as chaves VAPID com `npx web-push generate-vapid-keys --json`.
3. Preencha as variáveis e execute `npm run dev`. O endereço padrão é `http://localhost:3000`.

| Variável                    | Uso                                                                       |
| --------------------------- | ------------------------------------------------------------------------- |
| `SUPABASE_URL`              | URL do projeto Supabase                                                   |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de servidor para acessar as tabelas protegidas                      |
| `SLOTHSIGNAL_APP_TOKENS`    | JSON com identificador de aplicativo e token com pelo menos 32 caracteres |
| `VAPID_SUBJECT`             | Contato VAPID, por exemplo `mailto:contato@example.com`                   |
| `VAPID_PUBLIC_KEY`          | Chave pública, compartilhada com o aplicativo consumidor                  |
| `VAPID_PRIVATE_KEY`         | Chave privada, usada somente no SlothSignal                               |

Exemplo de estrutura do mapa: `{"meu-app":"<token-aleatorio-com-pelo-menos-32-caracteres>"}`. Substitua o marcador por um segredo real e não o versione.

## Contrato da API

As rotas protegidas recebem JSON e `Authorization: Bearer <token-do-aplicativo>`.

| Método e rota               | Corpo / resultado                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `GET /api/health`           | Retorna `ok` e nome do serviço; não testa Supabase ou entrega de notificações                              |
| `POST /api/subscriptions`   | `{app, subscription: {endpoint, keys: {p256dh, auth}}}`; registra ou atualiza pelo par aplicativo/endpoint |
| `DELETE /api/subscriptions` | `{app, endpoint}`; remove a inscrição daquele aplicativo                                                   |
| `POST /api/events`          | Valida o evento, registra a chave de deduplicação e tenta enviar aos dispositivos                          |

Exemplo de evento:

```json
{
  "app": "meu-app",
  "event": "earning.paid",
  "title": "Pagamento registrado",
  "body": "Um registro de pagamento foi atualizado.",
  "path": "/earnings",
  "dedupeKey": "earning-123-paid",
  "priority": "normal"
}
```

`expiresAt` é opcional, em data ISO UTC. Eventos já vencidos retornam `skipped: "expired"`. O tipo do evento segue `categoria.acao`; exemplos iniciais são `opportunity.created`, `earning.approved` e `earning.paid`. O destino deve ser um caminho relativo iniciado por `/`, sem `//`, `\` ou `..`.

## Entrega e limites

- A unicidade de `(app, dedupe_key)` impede novo processamento de uma chave já registrada. Um evento repetido retorna `duplicate: true`.
- `accepted: true`, `sent` e `failed` informam as tentativas de envio ao serviço Web Push. Não confirmam exibição ou leitura no dispositivo.
- Inscrições que retornam 404 ou 410 são removidas. As demais falhas são contadas; não há fila de retry ou worker de reprocessamento.
- O evento é registrado antes do envio. Uma falha posterior não apaga a chave de deduplicação: repetir a mesma chave não recupera automaticamente entregas pendentes.
- A implementação pagina inscrições em lotes de 100 e envia as de cada lote em paralelo. Não oferece garantia de entrega única, ordenação ou entrega a todos os dispositivos.

## Integração e publicação

O consumidor cria sua inscrição Web Push em HTTPS e a encaminha pelo próprio backend. Para SlothMint, as variáveis previstas são `SLOTHSIGNAL_URL`, `SLOTHSIGNAL_APP_TOKEN` e `NEXT_PUBLIC_SLOTHSIGNAL_VAPID_PUBLIC_KEY`. O token deve corresponder à entrada `slothmint` no serviço.

As tabelas podem compartilhar uma instância Supabase com o consumidor. O código e o deploy do serviço continuam separados; o compartilhamento não é obrigatório nem comprova integração concluída.

Para servir uma compilação local:

```bash
npm run build
npm start
```

Na publicação, configure as mesmas variáveis no host. Verifique separadamente health check, registro de inscrição, envio de evento e recebimento no dispositivo. Este repositório não fornece uma URL pública de demonstração confirmada.

## Validação

```bash
npm run check
npm run build
```

`check` reúne ESLint, TypeScript e Vitest. Os testes em [src/lib/contract.test.ts](src/lib/contract.test.ts) verificam o caminho da notificação e a exigência do token. Eles não exercitam Supabase, serviço Web Push ou recebimento no navegador.

## Estrutura e contribuição

- [src/app/api/](src/app/api/): health check, inscrições e eventos.
- [src/lib/](src/lib/): contratos, autenticação e cliente Supabase.
- [supabase/migrations/](supabase/migrations/): esquema persistido.

Abra uma branch e um pull request com a alteração e sua validação. Mudanças no contrato devem considerar os aplicativos consumidores e manter segredos fora do código e da documentação.

## Licença

Não há arquivo `LICENSE` neste repositório. A publicação do código não define, por si só, uma licença de reutilização.
