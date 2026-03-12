# Print3D Manager

Sistema de gestão completo para empresas de impressão 3D.

## Módulos

- **Radar de Concorrentes** - Analise produtos da concorrência e compare preços
- **Precificação** - Em breve
- **Estoque** - Em breve
- **Filamentos** - Em breve
- **Embalagens** - Em breve

## Stack

- **Frontend**: Next.js 14 (App Router)
- **Backend**: API Routes do Next.js
- **Banco de dados**: PostgreSQL (Neon/Supabase)
- **Upload de imagens**: Vercel Blob
- **UI**: TailwindCSS
- **Deploy**: Vercel

---

## Deploy na Vercel

### 1. Criar banco de dados PostgreSQL

Recomendo usar **Neon** (gratuito):

1. Acesse [neon.tech](https://neon.tech)
2. Crie uma conta e um novo projeto
3. Copie a connection string

### 2. Configurar Vercel Blob

1. No dashboard da Vercel, vá em **Storage**
2. Crie um novo **Blob Store**
3. Copie o `BLOB_READ_WRITE_TOKEN`

### 3. Deploy

1. Faça push do código para GitHub
2. Importe o projeto na [Vercel](https://vercel.com)
3. Configure as variáveis de ambiente:

```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
BLOB_READ_WRITE_TOKEN=vercel_blob_...
```

4. Deploy!

### 4. Criar tabelas

Após o deploy, execute localmente:

```bash
npx prisma db push
```

Ou use o Prisma Studio para visualizar:

```bash
npx prisma studio
```

---

## Desenvolvimento Local

### Pré-requisitos

- Node.js 18+
- PostgreSQL (local ou Neon)

### Instalação

```bash
# Clone o repositório
git clone <url>
cd print3d-manager

# Instale as dependências
npm install

# Configure o .env
cp .env.example .env
# Edite o .env com suas credenciais

# Crie as tabelas
npm run db:push

# Inicie o servidor
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string do PostgreSQL (pooled) |
| `DIRECT_URL` | Connection string direta (para migrations) |
| `BLOB_READ_WRITE_TOKEN` | Token do Vercel Blob para uploads |

---

## Estrutura do Projeto

```
print3d-manager/
├── app/
│   ├── api/
│   │   ├── concorrentes/     # CRUD concorrentes
│   │   ├── produtos/         # CRUD produtos
│   │   ├── upload/           # Upload de imagens
│   │   └── scrape/           # Scraping de URLs
│   ├── radar-concorrentes/   # Módulo principal
│   └── page.tsx              # Dashboard
├── components/
│   ├── concorrentes/         # Componentes do módulo
│   ├── ImageUpload.tsx
│   └── Sidebar.tsx
├── lib/
│   ├── prisma.ts
│   ├── types.ts
│   └── concorrentes.ts
└── prisma/
    └── schema.prisma
```

---

## Licença

MIT
