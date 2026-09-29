# SlothSignal

Serviço independente de Web Push da DULLSHIFT. O primeiro consumidor é o SlothMint.

## O que faz

- `POST /api/subscriptions`: registra uma inscrição Web Push de um aplicativo autenticado;
- `DELETE /api/subscriptions`: revoga a inscrição;
- `POST /api/events`: valida, deduplica e envia o evento aos dispositivos inscritos;
- `GET /api/health`: informa se o serviço responde.

Cada aplicativo tem token de servidor próprio em `SLOTHSIGNAL_APP_TOKENS`. O token
nunca deve ir ao navegador. Os clientes fazem a inscrição Web Push no próprio
domínio e a encaminham por seu backend. A API não aceita CORS público. O
service worker do SlothMint fica no repositório do SlothMint.

## Configuração gratuita

1. Na mesma instância Supabase usada pelo SlothMint, execute
   `supabase/migrations/001_signal.sql`. Isso mantém CalendarMate e SlothMint
   dentro dos dois projetos Free ativos permitidos por conta; as tabelas do
   SlothSignal têm prefixo `signal_` e RLS habilitada sem política pública.
2. Gere um par de chaves VAPID em ambiente seguro (`npx web-push generate-vapid-keys --json`).
   Guarde a chave privada só no ambiente do SlothSignal e configure a chave
   pública também no SlothMint.
3. Configure as variáveis de `.env.example` no host do SlothSignal; a service
   role deve permanecer somente no servidor. Configure no SlothMint
   `SLOTHSIGNAL_URL`, `SLOTHSIGNAL_APP_TOKEN` e
   `NEXT_PUBLIC_SLOTHSIGNAL_VAPID_PUBLIC_KEY`. O token deve ter pelo menos 32
   caracteres e corresponder à entrada `slothmint` no mapa do serviço.
4. Implante os dois projetos por HTTPS e habilite notificações em Ajustes no
   SlothMint. O navegador precisa conceder permissão a cada dispositivo.

Eventos iniciais: `opportunity.created`, `earning.approved` e `earning.paid`.
Cada evento leva um caminho relativo do aplicativo, para impedir abertura de
origens arbitrárias ao clicar na notificação. Ganhos e oportunidades são
registrados mesmo quando o serviço de alerta está indisponível.

O banco é compartilhado por restrição do plano Free; os serviços têm deploy,
API e código separados. Separe o banco quando houver necessidade operacional.

`npm run check` e `npm run build` verificam esta implementação. Não há tokens,
VAPID privado ou chaves Supabase reais no repositório.
