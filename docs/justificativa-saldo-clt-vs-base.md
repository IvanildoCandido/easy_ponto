# Justificativa: "Divergência" da Jornada-Base na Folha de Ponto

## O que a outra análise fez

A análise comparou, para cada dia:
- **Trabalhado** = (Almoço − Entrada) + (Saída − Retorno) em minutos
- **Saldo** = valor exibido na coluna "Saldo" do relatório
- **Base inferida** = Trabalhado − Saldo

E concluiu: "Se a regra fosse consistente, a Base deveria ser igual para todas as terças, igual para todas as quartas, etc. E não é."

## Por que a "Base inferida" varia no relatório

A coluna **Saldo** exibida na folha de ponto **não é** o saldo gerencial (Trabalhado − Jornada prevista). Ela é o **Saldo CLT** (`saldo_clt_minutes`), usado para banco de horas / pagamento em folha, após:

1. **Tolerância de 5 minutos por batida** (Art. 58 §1º CLT): diferenças ≤ 5 min são zeradas.
2. **Excesso de intervalo**: só é descontado (e vira atraso) quando o funcionário **não cumpriu** a jornada (saldo gerencial negativo); quando cumpriu, o intervalo é tratado como flexível.
3. **Cálculo**  
   Saldo CLT = (Extra CLT + Chegada antecipada CLT) − (Atraso CLT + Saída antecipada CLT).

Por isso:

- **Base inferida** = Trabalhado − **Saldo CLT**  
  não recupera a jornada prevista; recupera um número que mistura jornada com regras CLT (tolerâncias e excesso de intervalo).
- **Jornada prevista** (em minutos) é fixa por dia da semana e vem da tabela `work_schedules` (por `day_of_week`). Ou seja: **todas as terças usam a mesma jornada prevista**, todas as quartas também, etc.

## Exemplo (Terças)

- Jornada prevista Terça: **480 min** (8h), igual para 06/01, 13/01, 20/01, 27/01.
- Em cada dia:
  - **Saldo gerencial** = Trabalhado − 480 (sempre com a mesma base).
  - **Saldo CLT** pode ser diferente por causa de:
    - atrasos/antecipações que entram ou saem da tolerância de 5 min;
    - excesso de intervalo (só quando saldo gerencial < 0);
    - diferença entre “extra/atraso bruto” e “extra/atraso CLT”.

Então:
- 06/01: Trabalhado 502, Saldo CLT +9 → Base inferida 493 (≠ 480)
- 13/01: Trabalhado 497, Saldo CLT +7 → Base inferida 490 (≠ 480)

A “base” 493, 490 etc. **não é** a jornada de referência; é um artefato de usar Saldo CLT na fórmula.

## Caso 05/01 (Segunda)

- Segunda está configurada como **só manhã** (ex.: 4h = 240 min).
- Trabalhado no dia: 512 min (batidas de manhã + tarde).
- **Saldo gerencial** = 512 − 240 = **+272 min** (a mais em relação à jornada prevista).
- O relatório mostra **Extra** e **Saldo** em minutos CLT (ex.: 313 min). Esse valor vem de:
  - comparação da última saída real com o fim da jornada prevista (12:00);
  - aplicação da tolerância de 5 min;
  - não há “jornada de 199 min” no sistema; 199 é apenas Trabalhado − Saldo CLT, não a escala.

Ou seja: o cálculo do dia **não** está usando uma “base” diferente das outras segundas; a segunda continua com a mesma jornada prevista (ex.: 240 min). O que muda é que o **Saldo exibido é CLT**, não gerencial.

## Conclusão

- **Jornada de referência (base)** é **consistente** por dia da semana: uma única escala por dia da semana em `work_schedules`, usada em todos os cálculos.
- A **“divergência”** aparece porque:
  1. O relatório mostra **Saldo CLT**, não (Trabalhado − Jornada prevista).
  2. A fórmula **Base = Trabalhado − Saldo** foi aplicada ao Saldo CLT, então a “base inferida” não é a jornada prevista e pode variar mesmo com a mesma escala.

Para deixar isso explícito e auditar a consistência:

- Passamos a exibir a coluna **Jornada prevista** (em horas/minutos) na folha de ponto.
- Assim fica claro que a base é a mesma para todas as terças, quartas, etc., e que **Saldo** é o saldo CLT (para banco de horas/pagamento), não o saldo gerencial puro.
