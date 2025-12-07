# Changelog - Correção do Sistema de Cálculo de Ponto

## Data: 2025-06-12

### Problemas Corrigidos

1. **Minutos "sumindo" no cálculo de horas trabalhadas**
   - **Causa**: Truncamento/arredondamento por intervalo separado
   - **Solução**: Calcular total do dia em segundos e arredondar só no final
   - **Arquivo**: `lib/calculation-core.ts` - função `computeIntervals`

2. **Tolerância aplicada incorretamente**
   - **Causa**: Tolerância acumulável ou aplicada de forma incorreta
   - **Solução**: Implementada regra de "zona neutra" por batida:
     - Se |Δ| ≤ 5 min → Δ_ajustado = 0 (não gera crédito nem débito)
     - Se |Δ| > 5 min → Δ_ajustado = sign(Δ) * (|Δ| - 5) (excedente)
   - **Arquivo**: `lib/calculation-core.ts` - função `computeDeltaAdjust`

3. **Cálculo indevido quando há batidas faltantes**
   - **Causa**: Sistema calculava atraso/extra mesmo com batidas ausentes
   - **Solução**: Marcar registro como `INCONSISTENTE` quando faltam batidas necessárias
   - **Arquivo**: `lib/calculation-core.ts` - função `hasAllRequiredPunches` e `computeDaySummary`

### Mudanças Implementadas

#### 1. Novas Funções Puras (`lib/calculation-core.ts`)

- `computeDeltaAdjust()`: Calcula delta ajustado com tolerância por batida
- `computeIntervals()`: Calcula intervalos trabalhados com precisão (segundos)
- `computeDaySummary()`: Calcula resumo completo do dia
- `hasAllRequiredPunches()`: Valida se todas as batidas necessárias estão presentes

#### 2. Refatoração do Cálculo Principal (`lib/calculate.ts`)

- Refatorado para usar as novas funções puras
- Mantém compatibilidade com código existente
- Adiciona logs detalhados em desenvolvimento

#### 3. Schema do Banco de Dados (`lib/db.ts`)

- Adicionado campo `status` na tabela `processed_records`
- Valores: `'OK'` ou `'INCONSISTENTE'`
- Migração automática para SQLite
- Script SQL fornecido para Postgres (`migrations/add_status_column.sql`)

#### 4. Interface do Usuário (`components/ReportsView.tsx`)

- Exibe status `INCONSISTENTE` com destaque visual (fundo amarelo)
- Mostra aviso "⚠️ Inconsistente" na coluna de data

#### 5. API de Relatórios (`app/api/reports/route.ts`)

- Inclui campo `status` na resposta

#### 6. Testes Unitários (`lib/__tests__/calculation-core.test.ts`)

- Cobertura completa das regras de tolerância
- Testes de cálculo de intervalos
- Testes de validação de batidas ausentes
- Testes de casos reais (ex: entrada 08:13 com previsto 08:00)

### Regras Implementadas

#### Tolerância (5 minutos por batida)

- **Dentro da tolerância** (|Δ| ≤ 5 min): Zona neutra, não gera crédito nem débito
- **Fora da tolerância** (|Δ| > 5 min): Aplica excedente
  - Exemplo: Atraso de 8 min → conta 3 min de atraso (8 - 5 = 3)
  - Exemplo: Adiantamento de 9 min → conta 4 min de antecipação (9 - 5 = 4)

#### Cálculo de Horas Trabalhadas

1. Calcular períodos em segundos (manhã e tarde)
2. Somar os períodos
3. Arredondar o total para o minuto mais próximo

#### Tratamento de Batidas Ausentes

- Se faltar qualquer batida necessária → status `INCONSISTENTE`
- Cálculos parciais são mantidos, mas marcados como inconsistentes
- Não permite classificar "chegada antecipada" ou "hora extra" com base em suposições

#### Saldo do Dia

- Saldo = (Chegada Antecipada + Hora Extra) - Atraso
- Usa valores ajustados (após tolerância), não valores brutos

### Como Testar

1. **Instalar dependências de teste**:
   ```bash
   npm install
   ```

2. **Executar testes**:
   ```bash
   npm test
   ```

3. **Testar manualmente**:
   - Fazer upload de arquivo de ponto
   - Verificar cálculos no relatório
   - Verificar se registros com batidas faltantes aparecem como "INCONSISTENTE"

### Migração do Banco de Dados

#### SQLite (Desenvolvimento)
- Migração automática ao iniciar a aplicação
- Campo `status` adicionado automaticamente se não existir

#### Postgres/Supabase (Produção)
- Executar script SQL: `migrations/add_status_column.sql`
- Ou executar manualmente:
  ```sql
  ALTER TABLE processed_records 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'OK';
  
  UPDATE processed_records 
  SET status = 'OK' 
  WHERE status IS NULL;
  ```

### Próximos Passos Sugeridos

1. **Recalcular registros existentes**: Executar recálculo para aplicar novas regras
2. **Monitorar logs**: Verificar logs em desenvolvimento para validar cálculos
3. **Validar com dados reais**: Comparar resultados antes/depois da correção
4. **Adicionar detalhamento por batida**: Exibir Δ bruto, tolerância e Δ ajustado na interface (opcional)

### Arquivos Modificados

- `lib/calculation-core.ts` (novo)
- `lib/calculate.ts` (refatorado)
- `lib/db.ts` (schema atualizado)
- `app/api/reports/route.ts` (inclui status)
- `components/ReportsView.tsx` (exibe status)
- `lib/__tests__/calculation-core.test.ts` (novo)
- `package.json` (dependências de teste)
- `jest.config.js` (novo)
- `jest.setup.js` (novo)

### Arquivos Criados

- `migrations/add_status_column.sql` (migração Postgres)
- `CHANGELOG_CALCULO.md` (este arquivo)


