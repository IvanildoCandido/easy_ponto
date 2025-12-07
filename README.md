# Easy Ponto - Sistema de Controle de Ponto

Sistema web para processamento e controle de folha de ponto, com cálculo automático de horas trabalhadas, saldos e indicadores CLT.

## Desenvolvedor

**Ivanildo Cândido Bezerra**  
Analista de Sistemas & Engenheiro da Computação

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Ivanildo%20Cândido-blue?style=flat&logo=linkedin)](https://www.linkedin.com/in/ivanildocandido/)

## Funcionalidades

- ✅ Upload e processamento de arquivos de ponto (formato TXT com valores separados por tabulação)
- ✅ Configuração de horários de trabalho por funcionário e dia da semana
- ✅ Cálculo automático de:
  - Horas trabalhadas vs horas previstas
  - Saldo gerencial (trabalhadas - previstas)
  - Indicadores informativos (atraso, chegada antecipada, hora extra, saída antecipada)
  - Excesso de intervalo
  - Valores CLT (art. 58 §1º + Súmula 366 TST)
- ✅ Relatórios detalhados com filtros por funcionário e período
- ✅ Geração de PDF de folha de ponto

## Tecnologias

- **Next.js 14** (App Router)
- **TypeScript**
- **SQLite** (desenvolvimento) / **Postgres/Supabase** (produção)
- **Tailwind CSS**
- **date-fns**
- **jsPDF**

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

## Estrutura do Projeto

```
easy_ponto/
├── app/                    # Next.js App Router
│   ├── api/                # Rotas da API
│   ├── globals.css         # Estilos globais
│   ├── layout.tsx          # Layout principal
│   └── page.tsx            # Página inicial
├── components/             # Componentes React
├── domain/                 # Lógica de domínio (pura)
│   ├── time-utils.ts       # Utilitários de tempo
│   ├── clt-tolerance.ts    # Lógica CLT
│   └── time-calculation.ts # Cálculo de ponto
├── application/            # Casos de uso
│   └── daily-calculation-service.ts
├── infrastructure/         # Infraestrutura
│   ├── database.ts         # Acesso ao banco
│   └── file-processor.ts   # Processamento de arquivos
├── lib/                    # Compatibilidade (deprecated)
├── database/               # Arquivo SQLite (gerado automaticamente)
└── docs/                   # Documentação
```

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria a build de produção
- `npm start` - Inicia o servidor de produção
- `npm run lint` - Executa o linter
- `npm test` - Executa os testes unitários
- `npm run test:watch` - Executa os testes em modo watch
- `npm run test:coverage` - Executa os testes com relatório de cobertura
- `npm run test:ci` - Executa os testes em modo CI (com cobertura)

## Deploy

O sistema suporta SQLite para desenvolvimento local e Postgres/Supabase para produção.

### Configuração de Produção

Configure a variável de ambiente `SUPABASE_DB_URL` para usar Postgres em produção:

```env
SUPABASE_DB_URL=postgresql://user:password@host:port/database
```

## Testes

O projeto possui uma suíte completa de testes automatizados com alta cobertura (meta: 80-90% na camada de domínio).

### Executando Testes

```bash
# Executar todos os testes (resumo)
npm test

# Executar com detalhes de cada teste (verbose)
npm run test:verbose

# Executar em modo watch (desenvolvimento)
npm run test:watch

# Executar com relatório de cobertura
npm run test:coverage

# Executar com cobertura e detalhes
npm run test:coverage:verbose
```

### Testes Automatizados com Git Hooks

O projeto utiliza **Husky** para executar testes automaticamente antes de commits e pushes:

- **pre-commit**: Executa `npm test` antes de cada commit
  - Se os testes falharem, o commit é bloqueado
- **pre-push**: Executa `npm run test:coverage` antes de cada push
  - Garante que a cobertura está adequada antes de enviar código

**Comportamento**: Ao tentar commitar ou fazer push, os testes rodam automaticamente. Se falharem, a operação é cancelada para evitar quebrar funcionalidades que já estão funcionando.

Consulte `docs/TESTES.md` para documentação completa sobre testes.

## Documentação

Consulte a pasta `docs/` para documentação detalhada:
- `docs/ARQUITETURA.md` - Arquitetura do sistema
- `docs/TOLERANCIA_CLT.md` - Regras de tolerância CLT
- `docs/CHANGELOG.md` - Histórico de mudanças

## Licença

MIT
