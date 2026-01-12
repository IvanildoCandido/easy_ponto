-- Migração: Adicionar campo compensation_type para diferenciar Banco de Horas vs Pagamento em Folha
-- Conforme Art. 58 §1º CLT, o tratamento do resultado final varia conforme o tipo de compensação

DO $$ 
BEGIN
    -- Adicionar compensation_type
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'employees' 
        AND column_name = 'compensation_type'
    ) THEN
        ALTER TABLE employees 
        ADD COLUMN compensation_type TEXT CHECK(compensation_type IN ('BANCO_DE_HORAS', 'PAGAMENTO_FOLHA')) DEFAULT 'BANCO_DE_HORAS';
        
        -- Atualizar registros existentes para BANCO_DE_HORAS (comportamento padrão)
        UPDATE employees 
        SET compensation_type = 'BANCO_DE_HORAS' 
        WHERE compensation_type IS NULL;
        
        RAISE NOTICE 'Campo compensation_type adicionado à tabela employees';
    ELSE
        RAISE NOTICE 'Campo compensation_type já existe na tabela employees';
    END IF;
END $$;

-- Comentário para documentação
COMMENT ON COLUMN employees.compensation_type IS 'Tipo de compensação: BANCO_DE_HORAS (faz netting de saldo líquido) ou PAGAMENTO_FOLHA (separa extras para pagamento e faltas para desconto). Padrão: BANCO_DE_HORAS.';











