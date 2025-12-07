import { NextRequest, NextResponse } from 'next/server';
import { parseFileContent, processTimeRecords } from '@/infrastructure/file-processor';
import { calculateDailyRecords } from '@/application/daily-calculation-service';
import { Buffer } from 'buffer';

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
      console.error('Erro ao ler arquivo:', error);
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
      // Log do conteúdo para debug (apenas primeiras 500 caracteres)
      console.log('Conteúdo do arquivo (primeiros 500 chars):', content.substring(0, 500));
      console.log('Tamanho do arquivo:', content.length, 'caracteres');
      
      records = parseFileContent(content);
      console.log('Registros parseados:', records.length);
    } catch (error: any) {
      console.error('Erro ao fazer parse do arquivo:', error);
      console.error('Stack trace:', error.stack);
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
    try {
      console.log(`Iniciando processamento de ${records.length} registros...`);
      await processTimeRecords(records);
      console.log('Registros salvos com sucesso no banco de dados');
    } catch (error: any) {
      console.error('Erro ao processar registros no banco:', error);
      
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
    
    for (const date of uniqueDates) {
      try {
        await calculateDailyRecords(date);
      } catch (error: any) {
        console.error(`Erro ao calcular registros para data ${date}:`, error);
        // Continua processando outras datas mesmo se uma falhar
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `${records.length} registros processados com sucesso`,
      recordsProcessed: records.length,
      datesProcessed: Array.from(uniqueDates)
    });
  } catch (error: any) {
    console.error('Erro geral ao processar arquivo:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar arquivo' },
      { status: 500 }
    );
  }
}

