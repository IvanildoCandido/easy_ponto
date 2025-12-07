#!/bin/bash
# Script para limpar completamente o cache do Next.js

echo "🧹 Limpando cache do Next.js..."

# Remover pasta .next
rm -rf .next

# Remover cache do node_modules
rm -rf node_modules/.cache

# Remover cache do Next.js no sistema (se existir)
rm -rf ~/.next

echo "✅ Cache limpo com sucesso!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Pare o servidor (Ctrl+C no terminal onde está rodando)"
echo "2. Execute: npm run dev"
echo "3. O servidor deve iniciar sem erros"


