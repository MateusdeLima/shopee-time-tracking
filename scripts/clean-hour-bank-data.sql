-- Script para limpar todos os dados de banco de horas IA
-- Execute este script no Supabase SQL Editor

-- 1. Deletar registros de horas extras criados pela IA
DELETE FROM overtime_records 
WHERE option_id = 'ai_bank_hours';

-- 2. Deletar compensações de banco de horas
DELETE FROM hour_bank_compensations;

-- 3. Verificar se as tabelas estão vazias
SELECT 'overtime_records com ai_bank_hours' as tabela, COUNT(*) as registros 
FROM overtime_records 
WHERE option_id = 'ai_bank_hours'
UNION ALL
SELECT 'hour_bank_compensations' as tabela, COUNT(*) as registros 
FROM hour_bank_compensations;
