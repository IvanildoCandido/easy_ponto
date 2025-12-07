import { query, queryOne } from './db';
import { TimeRecord } from './types';

export function parseFileContent(content: string): TimeRecord[] {
  if (!content || typeof content !== 'string') {
    throw new Error('Conteúdo do arquivo inválido ou vazio');
  }

  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error('Arquivo vazio');
  }

  // Normalizar quebras de linha (Windows \r\n, Unix \n, Mac antigo \r)
  const normalizedContent = trimmedContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const allLines = normalizedContent.split('\n');
  const lines = allLines.map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length === 0) {
    throw new Error('Arquivo não contém linhas válidas');
  }

  const headerLine = lines[0];
  if (!headerLine) {
    throw new Error('Cabeçalho do arquivo não encontrado');
  }

  // Detectar o separador: tabulação tem prioridade
  const hasTabs = headerLine.includes('\t');
  const separator = hasTabs ? '\t' : (headerLine.match(/\s{2,}/) ? /\s{2,}/ : /\s+/);
  
  // Separar cabeçalhos
  let headers: string[];
  if (typeof separator === 'string') {
    headers = headerLine.split(separator).map(h => h.trim()).filter(h => h.length > 0);
  } else {
    headers = headerLine.split(separator).map(h => h.trim()).filter(h => h.length > 0);
  }
  
  if (headers.length === 0) {
    throw new Error('Cabeçalhos não encontrados no arquivo. Verifique se o arquivo usa tabulação ou espaços para separar as colunas.');
  }
  
  if (headers.length < 5) {
    throw new Error(`Número insuficiente de colunas no cabeçalho (encontrado: ${headers.length}, esperado: pelo menos 5). Verifique o formato do arquivo.`);
  }
  
  // Validar cabeçalhos obrigatórios ANTES de processar as linhas
  // Usar comparação case-insensitive e ignorar espaços extras
  const normalizeHeader = (h: string) => h.trim().toLowerCase();
  const enNoKey = headers.find(h => normalizeHeader(h) === 'enno');
  const nameKey = headers.find(h => normalizeHeader(h) === 'name');
  const dateTimeKey = headers.find(h => normalizeHeader(h) === 'datetime');
  
  if (!enNoKey || !nameKey || !dateTimeKey) {
    throw new Error(`Cabeçalhos obrigatórios não encontrados. Esperado: EnNo, Name, DateTime. Encontrado: ${headers.join(', ')}`);
  }
  
  const records: TimeRecord[] = [];
  
  // Debug apenas em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log('Cabeçalhos encontrados:', headers);
    console.log('Número de cabeçalhos:', headers.length);
    console.log('Separador detectado:', typeof separator === 'string' ? 'TAB' : 'ESPAÇOS');
    console.log('Chaves obrigatórias encontradas:', { enNoKey, nameKey, dateTimeKey });
  }
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    // Usar o mesmo separador detectado no cabeçalho
    let values: string[];
    if (typeof separator === 'string') {
      values = line.split(separator).map(v => v.trim());
    } else {
      values = line.split(separator).map(v => v.trim());
    }
    
    // Remover valores vazios do final (caso haja separadores extras)
    while (values.length > 0 && values[values.length - 1] === '') {
      values.pop();
    }
    
    if (values.length < headers.length) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Linha ${i + 1} ignorada: número insuficiente de colunas (esperado: ${headers.length}, encontrado: ${values.length})`);
        console.warn(`Valores encontrados:`, values);
      }
      continue;
    }
    
    const record: any = {};
    headers.forEach((header, index) => {
      const value = values[index] || '';
      const trimmedValue = value.trim();
      
      // Mapear o campo "In/Out" corretamente
      const headerKey = header === 'In/Out' ? 'In/Out' : header;
      
      if (header === 'No' || header === 'TMNo' || header === 'EnNo' || 
          header === 'GMNo' || header === 'Mode' || header === 'In/Out') {
        const numValue = parseInt(trimmedValue);
        record[headerKey] = isNaN(numValue) ? 0 : numValue;
      } else {
        record[headerKey] = trimmedValue || '';
      }
    });
    
    // Usar as chaves já validadas anteriormente
    const enNo = record[enNoKey];
    const name = String(record[nameKey] || '').trim();
    const dateTime = String(record[dateTimeKey] || '').trim();
    
    // Validar se os campos têm valores válidos
    if (enNo === undefined || enNo === null || name === '' || dateTime === '') {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Linha ${i + 1} ignorada: campos obrigatórios inválidos`);
        console.warn(`EnNo: ${enNo}, Name: "${name}", DateTime: "${dateTime}"`);
        console.warn(`Record completo:`, JSON.stringify(record, null, 2));
        console.warn(`Chaves do record:`, Object.keys(record));
      }
      continue;
    }
    
    records.push(record as TimeRecord);
  }
  
  if (records.length === 0) {
    throw new Error('Nenhum registro válido foi encontrado após o processamento. Verifique o formato do arquivo.');
  }
  
  return records;
}

export async function processTimeRecords(records: TimeRecord[]) {
  const isProduction = process.env.NODE_ENV === 'production';
  const useSupabase = isProduction && process.env.SUPABASE_DB_URL;

  // Extrair datas únicas dos registros que serão processados
  const datesToProcess = new Set<string>();
  for (const record of records) {
    if (record.DateTime) {
      const datePart = record.DateTime.split(' ')[0]; // "2025-12-05 06:55:24" -> "2025-12-05"
      if (datePart) {
        datesToProcess.add(datePart);
      }
    }
  }

  // ANTES de inserir, DELETAR registros existentes das datas que serão processadas
  // Isso evita duplicatas quando o mesmo arquivo é carregado novamente
  if (datesToProcess.size > 0) {
    const datesArray = Array.from(datesToProcess);
    console.log(`🗑️  Removendo registros existentes das datas: ${datesArray.join(', ')}`);
    
    if (useSupabase) {
      // Postgres: usar DATE() function
      const placeholders = datesArray.map((_, i) => `$${i + 1}`).join(', ');
      await query(
        `DELETE FROM time_records WHERE DATE(datetime) IN (${placeholders})`,
        datesArray
      );
      // Também deletar processed_records das mesmas datas
      await query(
        `DELETE FROM processed_records WHERE date IN (${placeholders})`,
        datesArray
      );
    } else {
      // SQLite: usar LIKE
      for (const date of datesArray) {
        await query(
          `DELETE FROM time_records WHERE datetime LIKE $1`,
          [`${date}%`]
        );
        await query(
          `DELETE FROM processed_records WHERE date = $1`,
          [date]
        );
      }
    }
    console.log(`✅ Registros antigos removidos para ${datesArray.length} data(s)`);
  }

  // Primeiro, inserir todos os funcionários únicos de uma vez
  const uniqueEmployees = new Map<number, { enNo: number; name: string; department: string }>();
  for (const record of records) {
    if (!uniqueEmployees.has(record.EnNo)) {
      uniqueEmployees.set(record.EnNo, {
        enNo: record.EnNo,
        name: record.Name,
        department: record.Department,
      });
    }
  }

  // Inserir funcionários em batch
  if (uniqueEmployees.size > 0) {
    const employeeValues = Array.from(uniqueEmployees.values());
    const employeePlaceholders = employeeValues.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(', ');
    const employeeParams = employeeValues.flatMap(e => [e.enNo, e.name, e.department]);
    
    await query(
      `
        INSERT INTO employees (en_no, name, department)
        VALUES ${employeePlaceholders}
        ON CONFLICT (en_no) DO NOTHING
      `,
      employeeParams
    );
  }

  // Buscar todos os IDs dos funcionários de uma vez
  const enNos = Array.from(uniqueEmployees.keys());
  const employeeMap = new Map<number, number>();
  
  if (enNos.length > 0) {
    const placeholders = enNos.map((_, i) => `$${i + 1}`).join(', ');
    const employeeResult = await query<{ id: number; en_no: number }>(
      `SELECT id, en_no FROM employees WHERE en_no IN (${placeholders})`,
      enNos
    );
    
    for (const emp of employeeResult) {
      employeeMap.set(emp.en_no, emp.id);
    }
  }

  // Processar time_records em lotes para melhor performance
  const BATCH_SIZE = 50;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    // Construir query de inserção em batch
    const values: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    for (const record of batch) {
      const employeeId = employeeMap.get(record.EnNo);
      if (employeeId) {
        values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`);
        params.push(
          employeeId,
          record.No,
          record.TMNo,
          record.Mode,
          record['In/Out'],
          record.VM,
          record.Department,
          record.DateTime,
        );
        paramIndex += 8;
      }
    }

    if (values.length > 0) {
      await query(
        `
          INSERT INTO time_records 
            (employee_id, record_no, tm_no, mode, in_out, vm, department, datetime)
          VALUES ${values.join(', ')}
        `,
        params
      );
    }

    // Log de progresso
    const processed = Math.min(i + BATCH_SIZE, records.length);
    if (processed % 50 === 0 || processed === records.length) {
      console.log(`Processados ${processed} de ${records.length} registros...`);
    }
  }

  console.log('Todos os registros foram salvos com sucesso!');
}

