# Changelog - Easy Ponto

## [Refatoração de Arquitetura] - 2025-01-XX

### Mudanças Estruturais

- ✅ Reorganização completa do código seguindo Clean Architecture
- ✅ Separação em camadas: `domain/`, `application/`, `infrastructure/`
- ✅ Extração de utilitários de tempo para `domain/time-utils.ts`
- ✅ Isolamento da lógica CLT em `domain/clt-tolerance.ts`
- ✅ Refatoração do cálculo principal para `domain/time-calculation.ts`
- ✅ Criação de serviços de aplicação em `application/`
- ✅ Migração de acesso a dados para `infrastructure/`

### Compatibilidade

- ✅ Arquivos de compatibilidade criados em `lib/` para manter imports antigos
- ✅ Todos os testes continuam funcionando
- ✅ Nenhuma quebra de funcionalidade

---

## [V2 - Saldo = Horas Trabalhadas - Horas Previstas] - 2025-XX-XX

### Mudança Fundamental

**Modelo Novo (V2) - REGRA DE OURO:**
```
SALDO = HORAS_TRABALHADAS - HORAS_PREVISTAS
```

Onde:
- **HORAS_TRABALHADAS** = soma dos períodos realmente trabalhados (diferença entre batidas)
- **HORAS_PREVISTAS** = carga horária prevista pela escala do dia

### Vantagens

1. **Atraso no almoço** → trabalha menos → saldo negativo automaticamente ✅
2. **Saída antes** → trabalha menos → saldo negativo ✅
3. **Fica depois** → trabalha mais → saldo positivo ✅
4. **Sem "inventar" hora extra na saída do almoço** ✅
5. **Cálculo simples e transparente** ✅

### Implementação

- Cálculo em **segundos** e conversão para minutos (floor) apenas no final
- Excesso de intervalo separado de atraso (indicador informativo)
- Indicadores (atraso, extra, etc.) são apenas informativos, não determinam o saldo

---

## [Implementação CLT] - 2025-XX-XX

### Regra CLT Implementada

- ✅ Tolerância de 5 minutos por evento de jornada (zona neutra)
- ✅ Teto diário de 10 minutos de tolerância total
- ✅ Se |Δ| ≤ 5: tolera inteiro
- ✅ Se |Δ| > 5: computa inteiro (NÃO o excedente)
- ✅ Se exceder 10 min no dia: recupera excedente

### Campos CLT Adicionados

- `atraso_clt_minutes`: Atraso CLT (após tolerância)
- `chegada_antec_clt_minutes`: Chegada antecipada CLT (após tolerância)
- `extra_clt_minutes`: Hora extra CLT (após tolerância)
- `saida_antec_clt_minutes`: Saída antecipada CLT (após tolerância)
- `saldo_clt_minutes`: SALDO_CLT (para fins de pagamento/banco de horas legal)

---

## [Correção de Cálculo] - 2025-XX-XX

### Problemas Corrigidos

1. **Minutos "sumindo" no cálculo de horas trabalhadas**
   - **Causa**: Truncamento/arredondamento por intervalo separado
   - **Solução**: Calcular total do dia em segundos e arredondar só no final

2. **Tolerância aplicada incorretamente**
   - **Causa**: Tolerância acumulável ou aplicada de forma incorreta
   - **Solução**: Implementada regra de "zona neutra" por batida

3. **Cálculo indevido quando há batidas faltantes**
   - **Causa**: Sistema calculava atraso/extra mesmo com batidas ausentes
   - **Solução**: Marcar registro como `INCONSISTENTE` quando faltam batidas necessárias

### Mudanças Implementadas

- Novas funções puras para cálculo
- Campo `status` adicionado ao banco de dados
- Validação de batidas necessárias
- Testes unitários criados

---

## [Versão Inicial] - 2025-XX-XX

### Funcionalidades Iniciais

- Upload e processamento de arquivos de ponto
- Configuração de horários de trabalho
- Cálculo básico de atrasos e horas extras
- Relatórios detalhados
- Interface web com Next.js










