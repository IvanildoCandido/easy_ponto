# Easy Ponto - Sistema de Controle de Ponto

Sistema web para processamento e controle de folha de ponto, com cálculo automático de atrasos, chegadas antecipadas e horas extras.

## Funcionalidades

- ✅ Upload e processamento de arquivos de ponto (formato TXT com valores separados por tabulação)
- ✅ Configuração de horários de trabalho por funcionário e dia da semana
- ✅ Cálculo automático de:
  - Atrasos
  - Chegadas antecipadas
  - Horas extras
  - Horas trabalhadas
- ✅ Relatórios detalhados com filtros por funcionário e período

## Tecnologias

- **Next.js 14** (App Router)
- **TypeScript**
- **SQLite** (better-sqlite3)
- **Tailwind CSS**
- **date-fns**

## Instalação

1. Instale as dependências:
```bash
npm install
```

2. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

3. Acesse [http://localhost:3000](http://localhost:3000)

## Formato do Arquivo de Ponto

O arquivo deve ser um arquivo de texto (TXT) com valores separados por tabulação. A primeira linha deve conter os cabeçalhos:

```
No	TMNo	EnNo	Name	GMNo	Mode	In/Out	VM	Department	DateTime
```

Exemplo:
```
No	TMNo	EnNo	Name	GMNo	Mode	In/Out	VM	Department	DateTime
1	1	2	Maria Raquel	1	1	1	Dedo	CLÍNICA	2025-12-03 19:38:33
2	1	1	Marizelma de Souza	1	1	1	Dedo	PET SHOP	2025-12-03 19:38:37
```

## Estrutura do Banco de Dados

- **employees**: Funcionários cadastrados
- **work_schedules**: Horários de trabalho por funcionário e dia da semana
- **time_records**: Registros brutos de batidas de ponto
- **processed_records**: Registros processados com cálculos de atrasos, horas extras, etc.

## Deploy na Vercel

⚠️ **IMPORTANTE**: SQLite (`better-sqlite3`) não é compatível com ambientes serverless como a Vercel, pois requer compilação nativa e sistema de arquivos persistente.

### Opções para Deploy na Vercel:

1. **Turso (Recomendado)** - SQLite distribuído e compatível com serverless:
   ```bash
   npm install @libsql/client
   ```
   Substitua `better-sqlite3` por `@libsql/client` no código.

2. **Vercel Postgres** - PostgreSQL gerenciado pela Vercel:
   - Crie um banco Postgres no dashboard da Vercel
   - Use `@vercel/postgres` ou `pg` como cliente
   - Adapte o schema SQL para PostgreSQL

3. **Supabase** - PostgreSQL com API REST:
   - Crie um projeto no Supabase
   - Use `@supabase/supabase-js` como cliente
   - Adapte o schema SQL para PostgreSQL

4. **PlanetScale** - MySQL serverless:
   - Crie um banco no PlanetScale
   - Use `@planetscale/database` como cliente
   - Adapte o schema SQL para MySQL

### Para desenvolvimento local:
O sistema funciona perfeitamente com SQLite local. Use `npm run dev` para testar localmente antes de fazer o deploy.

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria a build de produção
- `npm start` - Inicia o servidor de produção
- `npm run lint` - Executa o linter

## Estrutura do Projeto

```
easy_ponto/
├── app/
│   ├── api/          # Rotas da API
│   ├── globals.css   # Estilos globais
│   ├── layout.tsx    # Layout principal
│   └── page.tsx      # Página inicial
├── components/       # Componentes React
├── lib/              # Utilitários e lógica de negócio
│   ├── db.ts         # Configuração do banco de dados
│   ├── types.ts      # Tipos TypeScript
│   ├── processFile.ts # Processamento de arquivos
│   └── calculate.ts  # Cálculos de ponto
└── database/         # Arquivo SQLite (gerado automaticamente)
```

## Licença

MIT

