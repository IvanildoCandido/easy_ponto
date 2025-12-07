# Configuração MCP para Supabase

## 📋 Passo 1: Instalar o MCP Server do Supabase

O MCP server do Supabase será instalado automaticamente quando o Cursor tentar usar, mas você pode instalar manualmente:

```bash
npm install -g @supabase/mcp-server-supabase
```

## 📋 Passo 2: Configurar Variáveis de Ambiente

Você precisa ter estas variáveis configuradas. Crie um arquivo `.env.local` na raiz do projeto (se ainda não tiver):

```bash
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

**Onde encontrar:**
1. Acesse https://app.supabase.com
2. Selecione seu projeto
3. Vá em **Project Settings** > **API**
4. **Project URL** → `SUPABASE_URL`
5. **service_role key** (secret) → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **IMPORTANTE**: A service_role key tem acesso total ao banco. Não compartilhe!

## 📋 Passo 3: Configurar no Cursor

O arquivo `.cursor/mcp.json` já foi criado. Agora você precisa:

1. **Reiniciar o Cursor** para carregar a configuração MCP
2. Ou ir em **Settings** > **Features** > **MCP** e verificar se está ativo

## 📋 Passo 4: Verificar se está funcionando

Após reiniciar, eu (o assistente) deveria ter acesso ao Supabase. Você pode me pedir para:
- Listar tabelas
- Verificar dados
- Fazer deploy de funções
- Configurar variáveis de ambiente
- Etc.

## 🔧 Troubleshooting

### MCP não está funcionando
1. Verifique se as variáveis de ambiente estão configuradas
2. Reinicie o Cursor completamente
3. Verifique os logs do Cursor (Help > Toggle Developer Tools > Console)

### Erro de autenticação
- Verifique se o `SUPABASE_SERVICE_ROLE_KEY` está correto
- Verifique se o `SUPABASE_URL` está correto

### MCP server não encontrado
- Execute: `npm install -g @supabase/mcp-server-supabase`
- Ou deixe o Cursor instalar automaticamente na primeira vez









