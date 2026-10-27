# Kenya / SA Survey Rewards - Developer Package

Este pacote contém o código-fonte completo e limpo da plataforma (TanStack Start + React + Supabase + Tailwind CSS).

---

## 🚀 Como Rodar o Projeto Localmente

### 1. Pré-requisitos
* **Node.js** (v18, v20 ou v22+)
* **NPM** (ou Bun / Yarn / PNPM)

### 2. Instalação das Dependências
Abra o terminal na pasta do projeto e execute:
```bash
npm install
```

### 3. Variáveis de Ambiente (.env)
O arquivo `.env` já está configurado na raiz com as chaves ativas do Supabase e integrações. Caso queira usar suas próprias chaves, consulte o modelo `.env.example`:

```env
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-anon-or-publishable-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-secret-key"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-or-publishable-key"
```

### 4. Iniciar Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse a aplicação no navegador em: `http://localhost:3000` (ou a porta exibida no terminal).

### 5. Build de Produção
Para compilar para deploy (Vercel / Cloudflare Workers / Nitro):
```bash
npm run build
```

---

## 📂 Estrutura Principal de Pastas

* `src/routes/`: Rotas e páginas da aplicação (TanStack Router com file-based routing)
  * `src/routes/_authenticated/`: Páginas do painel do usuário e admin (`dashboard`, `wallet`, `admin.index.tsx`, `payout-setup`, `upgrade`, etc.)
  * `src/routes/api/`: Endpoints de API e Webhooks (SmooPay, Cron de recuperação, etc.)
* `src/lib/`: Lógica de negócio, integrações e funções de servidor (`payments.server.ts`, `greensend.server.ts`, `charges.server.ts`, `sms.functions.ts`)
* `src/components/`: Componentes reutilizáveis de interface (UI shadcn/radix)
* `src/integrations/supabase/`: Clientes Supabase para Client-side e Server-side
* `supabase/migrations/`: Histórico de migrações e schema SQL do banco de dados

---

## 🛠️ Tecnologias Utilizadas
* **Framework:** TanStack Start (React 18 + Vite SSR + Nitro)
* **Estilização:** Tailwind CSS + Radix UI + Lucide Icons
* **Banco de Dados & Auth:** Supabase (PostgreSQL)
* **Pagamentos & Automação:** SmooPay Webhooks + GreenSend API + SMSPortal
