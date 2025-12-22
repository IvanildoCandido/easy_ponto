import { NextRequest, NextResponse } from 'next/server';
import { parseFileContent, processTimeRecords } from '@/infrastructure/file-processor';
import { calculateDailyRecords, generateMonthlyRecords } from '@/application/daily-calculation-service';
import { logger } from '@/infrastructure/logger';
import { Buffer } from 'buffer';
import { parse, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }
    
    let content: string;
    try {
      // Ler como ArrayBuffer primeiro para detectar encoding
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Detectar UTF-16 BOM (FE FF ou FF FE)
      if (buffer.length >= 2) {
        const bom1 = buffer[0];
        const bom2 = buffer[1];
        
        // UTF-16 LE BOM: FF FE
        // UTF-16 BE BOM: FE FF
        if ((bom1 === 0xFF && bom2 === 0xFE) || (bom1 === 0xFE && bom2 === 0xFF)) {
          // Determinar endianness e converter
          const isLE = bom1 === 0xFF && bom2 === 0xFE;
          // Pular o BOM (2 bytes) e converter
          const contentBuffer = buffer.slice(2);
          // TypeScript não reconhece 'utf16be' como BufferEncoding válido, mas funciona em runtime
          content = contentBuffer.toString(isLE ? 'utf16le' : ('utf16be' as BufferEncoding));
        } else {
          // UTF-8 ou outro encoding - usar text() normal
          content = await file.text();
        }
      } else {
        content = await file.text();
      }
    } catch (error: any) {
      logger.error('Erro ao ler arquivo:', error);
      return NextResponse.json(
        { error: 'Erro ao ler o arquivo. Verifique se é um arquivo de texto válido.' },
        { status: 400 }
      );
    }
    
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Arquivo vazio ou inválido' },
        { status: 400 }
      );
    }
    
    let records;
    try {
      records = parseFileContent(content);
      logger.info(`Registros parseados: ${records.length}`);
    } catch (error: any) {
      logger.error('Erro ao fazer parse do arquivo:', error);
      return NextResponse.json(
        { 
          error: `Erro ao processar o arquivo: ${error.message || 'Formato inválido'}`,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: 400 }
      );
    }
    
    if (records.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum registro válido encontrado no arquivo' },
        { status: 400 }
      );
    }
    
    // Processar registros
    let savedOccurrences: Map<string, any> = new Map();
    try {
      logger.info(`Iniciando processamento de ${records.length} registros...`);
      savedOccurrences = await processTimeRecords(records);
    } catch (error: any) {
      logger.error('Erro ao processar registros no banco:', error);
      
      // Mensagens de erro mais específicas
      let errorMessage = error.message || 'Erro desconhecido';
      if (error.code === 'ENOTFOUND' || error.code === 'EADDRNOTAVAIL' || error.code === 'EHOSTUNREACH') {
        errorMessage = 'Erro de conexão com o banco de dados. Verifique sua conexão com a internet e a configuração do Supabase no arquivo .env.local';
      } else if (error.message?.includes('not queryable') || error.message?.includes('connection error')) {
        errorMessage = 'Conexão com o banco de dados foi perdida. Tente novamente em alguns instantes.';
      }
      
      return NextResponse.json(
        { error: `Erro ao salvar registros: ${errorMessage}` },
        { status: 500 }
      );
    }
    
    // Calcular registros processados para todas as datas únicas
    const uniqueDates = new Set(
      records
        .filter(r => r.DateTime && typeof r.DateTime === 'string')
        .map(r => {
          const datePart = r.DateTime.split(' ')[0];
          return datePart || null;
        })
        .filter((date): date is string => date !== null)
    );
    
    // Calcular registros processados para todas as datas únicas
    // IMPORTANTE: Fazer isso antes de restaurar ocorrências para garantir que os registros existam
    for (const date of uniqueDates) {
      try {
        await calculateDailyRecords(date);
      } catch (error: any) {
        logger.error(`Erro ao calcular registros para data ${date}:`, error);
        // Continua processando outras datas mesmo se uma falhar
      }
    }
    
    // Gerar entradas para todos os dias do mês para funcionários que têm batidas
    // Identificar meses únicos nas datas processadas
    const months = new Set<string>();
    const employeeIdsByMonth = new Map<string, Set<number>>();
    
    // Agrupar datas por mês
    for (const date of uniqueDates) {
      try {
        const dateObj = parse(date, 'yyyy-MM-dd', new Date());
        const month = format(dateObj, 'yyyy-MM');
        months.add(month);
      } catch (error: any) {
        logger.error(`Erro ao processar data ${date}:`, error);
      }
    }
    
    // Para cada mês, buscar todos os funcionários que têm batidas em qualquer data do mês
    const { query } = await import('@/infrastructure/database');
    const useSupabase = !!process.env.SUPABASE_DB_URL;
    
    for (const month of months) {
      try {
        // Calcular início e fim do mês
        const monthDate = parse(month, 'yyyy-MM', new Date());
        const startDate = format(monthDate, 'yyyy-MM-01');
        const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        const endDate = format(lastDay, 'yyyy-MM-dd');
        
        // Buscar todos os funcionários únicos que têm batidas neste mês
        const employeesWithRecords = await query<{ employee_id: number }>(
          useSupabase
            ? `SELECT DISTINCT employee_id FROM time_records WHERE DATE(datetime AT TIME ZONE 'America/Sao_Paulo') >= $1::date AND DATE(datetime AT TIME ZONE 'America/Sao_Paulo') <= $2::date`
            : `SELECT DISTINCT employee_id FROM time_records WHERE date(datetime) >= $1 AND date(datetime) <= $2`,
          [startDate, endDate]
        );
        
        const employeeIds = employeesWithRecords.map(emp => emp.employee_id);
        if (employeeIds.length > 0) {
          employeeIdsByMonth.set(month, new Set(employeeIds));
          logger.info(`Encontrados ${employeeIds.length} funcionário(s) com batidas no mês ${month}`);
        }
      } catch (error: any) {
        logger.error(`Erro ao buscar funcionários para mês ${month}:`, error);
      }
    }
    
    // Gerar registros para todos os meses encontrados
    for (const month of months) {
      const employeeIds = Array.from(employeeIdsByMonth.get(month) || []);
      if (employeeIds.length > 0) {
        try {
          logger.info(`Gerando registros mensais para mês ${month} e ${employeeIds.length} funcionário(s)...`);
          await generateMonthlyRecords(month, employeeIds);
        } catch (error: any) {
          logger.error(`Erro ao gerar registros mensais para mês ${month}:`, error);
          // Continua processando outros meses mesmo se um falhar
        }
      }
    }
    
    // Restaurar ocorrências após recálculo
    // IMPORTANTE: Fazer UPDATE diretamente para garantir que as ocorrências sejam preservadas
    if (savedOccurrences.size > 0) {
      const { query } = await import('@/infrastructure/database');
      logger.info(`Restaurando ${savedOccurrences.size} ocorrência(s)...`);
      
      for (const [key, occ] of savedOccurrences.entries()) {
        const parts = key.split('-');
        // Key format: "employeeId-date" (ex: "2-2025-12-05")
        // Pegar primeiro elemento como employeeId, resto como data
        const employeeId = parts[0];
        const date = parts.length >= 4 ? parts.slice(1).join('-') : parts[1]; // Junta todos os partes da data (yyyy-MM-dd)
        try {
          // Verificar se o registro existe antes de atualizar
          const existingRecord = await query(
            `SELECT id FROM processed_records WHERE employee_id = $1 AND date = $2`,
            [parseInt(employeeId), date]
          );
          
          if (existingRecord.length > 0) {
            // Se o registro existe, fazer UPDATE das ocorrências
            await query(
              `UPDATE processed_records 
               SET occurrence_type = $1,
                   occurrence_hours_minutes = $2,
                   occurrence_duration = $3,
                   occurrence_morning_entry = $4,
                   occurrence_lunch_exit = $5,
                   occurrence_afternoon_entry = $6,
                   occurrence_final_exit = $7
               WHERE employee_id = $8 AND date = $9`,
              [
                occ.occurrence_type,
                occ.occurrence_hours_minutes,
                occ.occurrence_duration,
                occ.occurrence_morning_entry || false,
                occ.occurrence_lunch_exit || false,
                occ.occurrence_afternoon_entry || false,
                occ.occurrence_final_exit || false,
                parseInt(employeeId),
                date
              ]
            );
            logger.info(`Ocorrência restaurada para funcionário ${employeeId} na data ${date}`);
          } else {
            logger.warn(`Registro não encontrado para funcionário ${employeeId} na data ${date} - ocorrência não pode ser restaurada`);
          }
        } catch (error: any) {
          logger.error(`Erro ao restaurar ocorrência para ${key}:`, error);
        }
      }
      
      // Recalcular apenas as datas que tiveram ocorrências restauradas para ajustar saldos
      const datesToRecalculate = new Set<string>();
      for (const [key] of savedOccurrences.entries()) {
        const parts = key.split('-');
        // Key format: "employeeId-date" (ex: "2-2025-12-05")
        // Pegar tudo após o primeiro '-' como data
        if (parts.length >= 4) {
          const date = parts.slice(1).join('-'); // Junta todos os partes da data (yyyy-MM-dd)
          // Validar formato de data (yyyy-MM-dd)
          if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            datesToRecalculate.add(date);
          } else {
            logger.warn(`Formato de data inválido extraído da key "${key}": ${date}`);
          }
        } else {
          logger.warn(`Formato de key inválido: "${key}" (esperado: "employeeId-yyyy-MM-dd")`);
        }
      }
      
      for (const date of datesToRecalculate) {
        try {
          await calculateDailyRecords(date);
          logger.info(`Recálculo concluído para data ${date} após restaurar ocorrências`);
        } catch (error: any) {
          logger.error(`Erro ao recalcular após restaurar ocorrências para data ${date}:`, error);
        }
      }
    }
    
    // Contar funcionários únicos processados
    const uniqueEmployeeIds = new Set<number>();
    for (const record of records) {
      if (record.EnNo) {
        uniqueEmployeeIds.add(record.EnNo);
      }
    }
    
    // Contar meses processados
    const monthsProcessed = Array.from(months);
    
    const successMessage = `Processamento concluído! ${records.length} registro(s) de ${uniqueEmployeeIds.size} funcionário(s) processado(s) em ${monthsProcessed.length} mês(es).`;
    
    return NextResponse.json({
      success: true,
      message: successMessage,
      recordsProcessed: records.length,
      employeesProcessed: uniqueEmployeeIds.size,
      datesProcessed: Array.from(uniqueDates),
      monthsProcessed: monthsProcessed.length,
    });
  } catch (error: any) {
    logger.error('Erro geral ao processar arquivo:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar arquivo' },
      { status: 500 }
    );
  }
}

