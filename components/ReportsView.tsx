'use client';

import { useState, useEffect, useCallback } from 'react';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface Employee {
  id: number;
  en_no: number;
  name: string;
  department: string;
}

interface Report {
  id: number;
  employee_id: number;
  employee_name: string;
  en_no: number;
  department: string;
  date: string;
  first_entry: string | null;
  last_exit: string | null;
  morning_entry: string | null;
  lunch_exit: string | null;
  afternoon_entry: string | null;
  final_exit: string | null;
  expected_start: string | null;
  expected_end: string | null;
  delay_minutes: number;
  early_arrival_minutes: number;
  overtime_minutes: number;
  early_exit_minutes?: number; // Saída antecipada
  worked_minutes: number;
  worked_hours: string;
  expected_minutes?: number; // Horas previstas
  expected_hours?: string; // Horas previstas formatadas
  balance_minutes?: number; // Saldo GERENCIAL (trabalhadas - previstas)
  interval_excess_minutes?: number; // Excesso de intervalo do almoço (indicador separado)
  // Valores CLT (art. 58 §1º + Súmula 366 TST)
  atraso_clt_minutes?: number; // Atraso CLT (após tolerância)
  chegada_antec_clt_minutes?: number; // Chegada antecipada CLT (após tolerância)
  extra_clt_minutes?: number; // Hora extra CLT (após tolerância)
  saida_antec_clt_minutes?: number; // Saída antecipada CLT (após tolerância)
  saldo_clt_minutes?: number; // SALDO_CLT (para fins de pagamento/banco de horas legal)
  status: 'OK' | 'INCONSISTENTE';
  occurrence_type?: 'FERIADO' | 'FALTA' | 'FOLGA' | 'ATESTADO' | 'DECLARACAO' | 'ESQUECIMENTO_BATIDA' | null;
  occurrence_morning_entry?: boolean;
  occurrence_lunch_exit?: boolean;
  occurrence_afternoon_entry?: boolean;
  occurrence_final_exit?: boolean;
  shift_type?: 'FULL_DAY' | 'MORNING_ONLY' | 'AFTERNOON_ONLY' | null;
  break_minutes?: number | null;
  calendar_event_type?: 'FERIADO' | 'DSR' | null;
  calendar_event_description?: string | null;
  // Indicadores de correção manual
  is_manual_morning_entry?: boolean;
  is_manual_lunch_exit?: boolean;
  is_manual_afternoon_entry?: boolean;
  is_manual_final_exit?: boolean;
}

export default function ReportsView() {
  // Calcular primeiro e último dia do mês atual
  const today = new Date();
  const firstDayOfMonth = format(startOfMonth(today), 'yyyy-MM-dd');
  const lastDayOfMonth = format(endOfMonth(today), 'yyyy-MM-dd');
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | ''>('');
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(lastDayOfMonth);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingReport, setEditingReport] = useState<number | null>(null); // ID do registro sendo editado
  const [editingOccurrenceType, setEditingOccurrenceType] = useState<string>('');
  const [editingOccurrenceMorningEntry, setEditingOccurrenceMorningEntry] = useState<boolean>(false);
  const [editingOccurrenceLunchExit, setEditingOccurrenceLunchExit] = useState<boolean>(false);
  const [editingOccurrenceAfternoonEntry, setEditingOccurrenceAfternoonEntry] = useState<boolean>(false);
  const [editingOccurrenceFinalExit, setEditingOccurrenceFinalExit] = useState<boolean>(false);
  const [isSavingOccurrence, setIsSavingOccurrence] = useState(false);
  
  // Estados para correção manual de batidas
  const [editingManualPunch, setEditingManualPunch] = useState<number | null>(null); // ID do registro sendo editado
  const [isSavingManualPunch, setIsSavingManualPunch] = useState(false);
  const [editingManualMorningEntry, setEditingManualMorningEntry] = useState<string>('');
  const [editingManualLunchExit, setEditingManualLunchExit] = useState<string>('');
  const [editingManualAfternoonEntry, setEditingManualAfternoonEntry] = useState<string>('');
  const [editingManualFinalExit, setEditingManualFinalExit] = useState<string>('');
  const [editingManualReason, setEditingManualReason] = useState<string>('');
  
  // Estados para batidas originais do relógio
  const [originalMorningEntry, setOriginalMorningEntry] = useState<string>('');
  const [originalLunchExit, setOriginalLunchExit] = useState<string>('');
  const [originalAfternoonEntry, setOriginalAfternoonEntry] = useState<string>('');
  const [originalFinalExit, setOriginalFinalExit] = useState<string>('');

  const loadEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      // Erro silencioso - usuário verá lista vazia
    }
  };

  const loadReports = useCallback(async () => {
    // Só carregar dados se um funcionário estiver selecionado
    if (!selectedEmployee || !startDate || !endDate) {
      setReports([]);
      return;
    }
    
    setLoading(true);
    try {
      const url = `/api/reports?startDate=${startDate}&endDate=${endDate}&employeeId=${selectedEmployee}`;
      const response = await fetch(url);
      const data = await response.json();
      setReports(data);
    } catch (error) {
      // Erro silencioso - usuário verá lista vazia
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedEmployee]);

  useEffect(() => {
    loadEmployees();
    // Datas padrão já são definidas no useState como primeiro e último dia do mês atual
    // Não precisa definir novamente aqui
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    if (date) {
      // Calcular o último dia do mês da data selecionada
      const selectedDate = new Date(date + 'T00:00:00');
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      // Criar data do primeiro dia do próximo mês e subtrair 1 dia
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const endDateStr = lastDayOfMonth.toISOString().split('T')[0];
      setEndDate(endDateStr);
    }
  };


  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return new Date(time).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'Data inválida';
    
    // Normalizar para string se for Date object
    let dateStr: string;
    if (date instanceof Date) {
      dateStr = date.toISOString().split('T')[0];
    } else if (typeof date === 'string') {
      // Se já está no formato yyyy-MM-dd, usar diretamente
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        dateStr = date;
      } else {
        // Tentar parsear como Date e converter
        const parsed = new Date(date);
        if (isNaN(parsed.getTime())) {
          return 'Data inválida';
        }
        dateStr = parsed.toISOString().split('T')[0];
      }
    } else {
      return 'Data inválida';
    }
    
    const dateObj = new Date(dateStr + 'T00:00:00');
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida';
    }
    
    const formattedDate = dateObj.toLocaleDateString('pt-BR');
    const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase();
    return `${formattedDate} - ${dayOfWeek}`;
  };

  const formatMinutes = (minutes: number, showZero: boolean = false) => {
    const roundedMinutes = Math.round(minutes);
    if (roundedMinutes === 0 && !showZero) return '-';
    
    const hours = Math.floor(roundedMinutes / 60);
    const mins = roundedMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const formatBalance = (minutes: number) => {
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const formatWorkedHours = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  
  const formatMinutesAsTime = (minutes: number) => {
    if (minutes === 0) return '-';
    const totalSeconds = Math.round(minutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const calculateBalance = (earlyArrival: number, overtime: number, delay: number, earlyExit: number = 0) => {
    // Saldo = (Hora Extra + Chegada Antecipada) - (Atraso + Saída Antecipada)
    return (earlyArrival + overtime) - (delay + earlyExit);
  };

  // Função auxiliar para renderizar uma página de funcionário no PDF
  const renderEmployeePage = (
    pdf: any,
    data: any,
    pageWidth: number,
    pageHeight: number
  ) => {
    let yPos = 7; // Sempre começar do topo da página
    const lineHeight = 5.5; // Aumentada para acomodar nomes completos sem cortar
    const margin = 7;
    const headerHeight = 20;
    const textVerticalOffset = 2.2; // Offset para centralizar texto verticalmente na célula

    // Cabeçalho compacto com fundo colorido
    pdf.setFillColor(41, 128, 185); // Azul elegante
    pdf.rect(0, 0, pageWidth, headerHeight, 'F');
    
    // Título principal
    pdf.setTextColor(255, 255, 255); // Branco
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FOLHA DE PONTO', pageWidth / 2, 10, { align: 'center' });
    
    // Informações do funcionário no cabeçalho (compacto)
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${data.employee.name} | ${data.employee.department || '-'} | ${data.month}`, pageWidth / 2, 16, { align: 'center' });
    
    // Resetar cor do texto
    pdf.setTextColor(0, 0, 0); // Preto
    yPos = headerHeight + 6;

    // Detectar se é turno único
    const isSingleShift = data.isSingleShift || false;
    
    // Tabela expandida - larguras ajustadas para ocupar melhor a página A4 (210mm)
    // Colunas: Data, Dia, Ocorr, Entrada, Almoço, Retorno, Saída, Atraso, Extra, Saldo
    // Aumentadas colunas de horário para acomodar nomes completos de ocorrências
    const colWidths = [25, 12, 14, 18, 18, 18, 18, 14, 14, 16];
    const totalTableWidth = colWidths.reduce((sum, w) => sum + w, 0); // Total: ~171mm
    const tableMargin = Math.max(10, (pageWidth - totalTableWidth) / 2); // Centralizar com margem mínima
    
    // Headers dinâmicos baseados no tipo de turno
    const headers = isSingleShift
      ? ['Data', 'Dia', 'Ocorr.', 'Entrada', 'S. Intervalo', 'E. Pós-Int.', 'Saída Final', 'Atraso', 'Extra', 'Saldo']
      : ['Data', 'Dia', 'Ocorr.', 'Entrada', 'Almoço', 'Retorno', 'Saída', 'Atraso', 'Extra', 'Saldo'];
    
    // Cabeçalho da tabela com fundo
    pdf.setFillColor(52, 152, 219); // Azul mais claro
    pdf.rect(tableMargin, yPos - 5, totalTableWidth, 8, 'F');
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    let xPos = tableMargin;
    headers.forEach((header, idx) => {
      pdf.text(String(header), xPos + 0.5, yPos);
      xPos += colWidths[idx];
    });
    pdf.setTextColor(0, 0, 0); // Resetar para preto
    yPos += lineHeight + 2;
    
    // Linha separadora
    pdf.setDrawColor(200, 200, 200);
    pdf.line(tableMargin, yPos, tableMargin + totalTableWidth, yPos);
    yPos += 2.5;

    // Dados
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    let rowIndex = 0;
    
    data.days.forEach((day: any) => {
      // Verificar se precisa de nova página
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        yPos = 7;
        
        // Redesenhar cabeçalho da tabela na nova página
        pdf.setFillColor(52, 152, 219);
        pdf.rect(tableMargin, yPos - 5, totalTableWidth, 8, 'F');
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        xPos = tableMargin;
        headers.forEach((header, idx) => {
          pdf.text(String(header), xPos + 0.5, yPos);
          xPos += colWidths[idx];
        });
        pdf.setTextColor(0, 0, 0);
        yPos += lineHeight + 2;
        pdf.setDrawColor(200, 200, 200);
        pdf.line(tableMargin, yPos, tableMargin + totalTableWidth, yPos);
        yPos += 2.5;
      }
      
      // Alternar cores das linhas (mais sutil)
      if (rowIndex % 2 === 0) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(tableMargin, yPos - textVerticalOffset, totalTableWidth, lineHeight, 'F');
      }

      // Destaque para domingos (sem background especial para ocorrências ou inconsistências)
      if (day.isSunday) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(tableMargin, yPos - textVerticalOffset, totalTableWidth, lineHeight, 'F');
      }

      // Montar texto da data (limpar qualquer caractere extra e garantir tamanho fixo)
      let dateText = String(day.date || '').trim();
      // Limitar tamanho da data para não ultrapassar a coluna (máximo 12 caracteres)
      if (dateText.length > 12) {
        dateText = dateText.substring(0, 12);
      }
      // Não adicionar ⚠ na data - isso está na coluna de ocorrência agora
      
      // Texto do dia da semana (garantir que seja apenas 3 caracteres)
      let dayOfWeekText = String(day.dayOfWeek || '').trim();
      if (dayOfWeekText.length > 3) {
        dayOfWeekText = dayOfWeekText.substring(0, 3);
      }
      dayOfWeekText = dayOfWeekText.toUpperCase();
      
      // Labels abreviadas para ocorrências
      const occurrenceLabels: Record<string, string> = {
        FERIADO: 'Feriado',
        FALTA: 'Falta',
        FOLGA: 'Folga',
        ATESTADO: 'Atestado',
        DECLARACAO: 'Declaração',
        // Abreviar para evitar quebra em PDF
        ESQUECIMENTO_BATIDA: 'E. Batida',
      };
      
      // Verificar se tem evento do calendário (prioridade sobre ocorrência)
      const hasCalendarEvent = day.calendarEventType ? true : false;
      const calendarEventType = day.calendarEventType ? String(day.calendarEventType).trim().toUpperCase() : '';
      const calendarEventLabel = calendarEventType === 'FERIADO' ? 'Feriado' : calendarEventType === 'DSR' ? 'DSR' : '';
      
      // Verificar se tem ocorrência (só se não tiver evento do calendário)
      const hasOccurrence = !hasCalendarEvent && day.occurrenceType ? true : false;
      const occType = day.occurrenceType ? String(day.occurrenceType).trim().toUpperCase() : '';
      const occLabel = occType && occurrenceLabels[occType] ? occurrenceLabels[occType] : '';
      
      // Priorizar evento do calendário sobre ocorrência
      const displayType = hasCalendarEvent ? calendarEventType : occType;
      // Para DSR, mostrar apenas "DSR" (sem descrição completa para não ficar muito grande)
      const displayLabel = hasCalendarEvent 
        ? (calendarEventType === 'DSR' ? 'DSR' : calendarEventLabel)
        : occLabel;
      
      // Verificar quais batidas têm ocorrência (pode vir como boolean ou número do banco)
      const hasOccMorning = day.occurrenceMorningEntry === true || day.occurrenceMorningEntry === 1;
      const hasOccLunch = day.occurrenceLunchExit === true || day.occurrenceLunchExit === 1;
      const hasOccAfternoon = day.occurrenceAfternoonEntry === true || day.occurrenceAfternoonEntry === 1;
      const hasOccFinal = day.occurrenceFinalExit === true || day.occurrenceFinalExit === 1;

      // Garantir que fonte e cor estão corretas antes de renderizar linha
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(0, 0, 0);
      
      xPos = tableMargin;
      // Calcular posição Y centralizada para o texto (centralizar verticalmente na célula)
      const textY = yPos - textVerticalOffset + (lineHeight / 2) - 1;
      
      // Coluna 0: Data - garantir que não ultrapasse
      const finalDateText = String(dateText).substring(0, 12); // Limitar a 12 caracteres
      pdf.text(finalDateText, xPos + 0.5, textY);
      xPos += colWidths[0];
      
      // Coluna 1: Dia - garantir que seja exatamente 3 caracteres
      const finalDayText = String(dayOfWeekText).substring(0, 3);
      pdf.text(finalDayText, xPos + 0.5, textY);
      xPos += colWidths[1];
      
      // Coluna 2: Ocorrência - mostrar evento do calendário ou ocorrência
      pdf.setTextColor(0, 0, 0);
      let occurrenceText = '-';
      if (hasCalendarEvent) {
        occurrenceText = displayLabel || displayType;
        // Diferentes cores para feriado e DSR
        if (calendarEventType === 'FERIADO') {
          pdf.setTextColor(147, 51, 234); // Roxo para feriado
        } else if (calendarEventType === 'DSR') {
          pdf.setTextColor(59, 130, 246); // Azul para DSR
        }
      } else if (hasOccurrence) {
        occurrenceText = 'SIM';
      }
      pdf.text(occurrenceText, xPos + 0.5, textY);
      xPos += colWidths[2];
      pdf.setTextColor(0, 0, 0);
      
      // Coluna 3: Entrada - mostrar evento do calendário, ocorrência se marcada, senão horário
      if (hasCalendarEvent) {
        // Mostrar evento do calendário em todas as batidas
        pdf.setTextColor(52, 73, 94);
        pdf.text(displayLabel || displayType, xPos + 0.5, textY);
      } else if (hasOccMorning && occLabel) {
        pdf.setTextColor(52, 73, 94); // Cinza escuro para ocorrência
        pdf.text(occLabel, xPos + 0.5, textY);
          } else {
        pdf.setTextColor(0, 0, 0);
        const entryText = day.morningEntry && day.morningEntry !== '-' ? day.morningEntry : '-';
        pdf.text(String(entryText), xPos + 0.5, textY);
      }
      xPos += colWidths[3];
      pdf.setTextColor(0, 0, 0);
      
      // Coluna 4: Almoço - mostrar evento do calendário, ocorrência se marcada, senão horário
      if (hasCalendarEvent) {
        pdf.setTextColor(52, 73, 94);
        pdf.text(displayLabel || displayType, xPos + 0.5, textY);
      } else if (hasOccLunch && occLabel) {
        pdf.setTextColor(52, 73, 94);
        pdf.text(occLabel, xPos + 0.5, textY);
        } else {
        pdf.setTextColor(0, 0, 0);
        const lunchText = day.lunchExit && day.lunchExit !== '-' ? day.lunchExit : '-';
        pdf.text(String(lunchText), xPos + 0.5, textY);
      }
      xPos += colWidths[4];
      pdf.setTextColor(0, 0, 0);
      
      // Coluna 5: Retorno - mostrar evento do calendário, ocorrência se marcada, senão horário
      if (hasCalendarEvent) {
        pdf.setTextColor(52, 73, 94);
        pdf.text(displayLabel || displayType, xPos + 0.5, textY);
      } else if (hasOccAfternoon && occLabel) {
        pdf.setTextColor(52, 73, 94);
        pdf.text(occLabel, xPos + 0.5, textY);
      } else {
        pdf.setTextColor(0, 0, 0);
        const afternoonText = day.afternoonEntry && day.afternoonEntry !== '-' ? day.afternoonEntry : '-';
        pdf.text(String(afternoonText), xPos + 0.5, textY);
      }
      xPos += colWidths[5];
      pdf.setTextColor(0, 0, 0);
      
      // Coluna 6: Saída - mostrar evento do calendário, ocorrência se marcada, senão horário
      if (hasCalendarEvent) {
        pdf.setTextColor(52, 73, 94);
        pdf.text(displayLabel || displayType, xPos + 0.5, textY);
      } else if (hasOccFinal && occLabel) {
        pdf.setTextColor(52, 73, 94);
        pdf.text(occLabel, xPos + 0.5, textY);
      } else {
        pdf.setTextColor(0, 0, 0);
        const exitText = day.finalExit && day.finalExit !== '-' ? day.finalExit : '-';
        pdf.text(String(exitText), xPos + 0.5, textY);
      }
      xPos += colWidths[6];
      pdf.setTextColor(0, 0, 0);
      
      // Coluna 7: Atraso
      pdf.setTextColor(0, 0, 0);
      const atrasoText = day.atrasoClt > 0 ? `${day.atrasoClt}min` : '-';
      if (day.atrasoClt > 0) {
        pdf.setTextColor(231, 76, 60);
      }
      pdf.text(String(atrasoText), xPos + 0.5, textY);
      xPos += colWidths[7];
      pdf.setTextColor(0, 0, 0);
      
      // Coluna 8: Extra
      const extraText = day.extraClt > 0 ? `${day.extraClt}min` : '-';
      if (day.extraClt > 0) {
        pdf.setTextColor(52, 152, 219);
      }
      pdf.text(String(extraText), xPos + 0.5, textY);
      xPos += colWidths[8];
      pdf.setTextColor(0, 0, 0);
      
      // Coluna 9: Saldo
      const saldoText = day.saldoClt !== 0 
        ? `${formatBalance(day.saldoClt)}${day.saldoClt > 0 ? '+' : '-'}` 
        : '0min';
      if (day.saldoClt > 0) {
        pdf.setTextColor(39, 174, 96);
      } else if (day.saldoClt < 0) {
        pdf.setTextColor(231, 76, 60);
      } else {
        pdf.setTextColor(127, 140, 141);
      }
      pdf.text(String(saldoText), xPos + 0.5, textY);
      pdf.setTextColor(0, 0, 0);

      yPos += lineHeight;
      rowIndex++;
    });

    // Totais compactos - centralizar
    yPos += 4;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(tableMargin, yPos, tableMargin + totalTableWidth, yPos);
    yPos += 5;

    // Fundo para seção de totais (compacto e centralizado)
    const totalsWidth = totalTableWidth;
    pdf.setFillColor(241, 245, 249); // Cinza muito claro
    pdf.rect(tableMargin, yPos - 3.5, totalsWidth, 10, 'F');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(41, 128, 185); // Azul
    pdf.text('TOTAIS:', tableMargin + 2, yPos);
    
    // Exibir apenas o Saldo
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Saldo:', tableMargin + 2, yPos + 5.5);
    
    // Valor do saldo com cor apropriada
    if (data.totals.saldoClt > 0) {
      pdf.setTextColor(39, 174, 96); // Verde
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${formatBalance(data.totals.saldoClt)}+`, tableMargin + totalsWidth - 2, yPos + 5.5, { align: 'right' });
    } else if (data.totals.saldoClt < 0) {
      pdf.setTextColor(231, 76, 60); // Vermelho
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${formatBalance(data.totals.saldoClt)}-`, tableMargin + totalsWidth - 2, yPos + 5.5, { align: 'right' });
    } else {
      pdf.setTextColor(127, 140, 141); // Cinza
      pdf.setFont('helvetica', 'bold');
      pdf.text('0min', tableMargin + totalsWidth - 2, yPos + 5.5, { align: 'right' });
    }
    
    yPos += 12;

    // Campo para assinatura compacto e centralizado
    pdf.setDrawColor(200, 200, 200);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(tableMargin, yPos, totalsWidth, 12, 'FD');
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Assinatura:', tableMargin + 2, yPos + 6);
    pdf.setDrawColor(150, 150, 150);
    pdf.line(tableMargin + 28, yPos + 6, tableMargin + totalsWidth - 55, yPos + 6);
    pdf.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, tableMargin + totalsWidth - 2, yPos + 6, { align: 'right' });
    
    return yPos;
  };

  const generatePDF = async () => {
    // Agora o PDF só pode ser gerado se um único funcionário estiver selecionado
    if (!selectedEmployee) {
      alert('Selecione um funcionário específico para gerar o PDF da folha de ponto.');
      return;
    }

    const employeeIdToUse = selectedEmployee;

    try {
      // Importar jsPDF dinamicamente
      const { default: jsPDF } = await import('jspdf');
      
      // Pegar o mês atual baseado nas datas selecionadas
      const month = startDate.substring(0, 7); // YYYY-MM
      
      const response = await fetch(`/api/pdf?employeeId=${employeeIdToUse}&month=${month}`);
      const data = await response.json();
      
      if (response.status !== 200) {
        alert(data.error || 'Erro ao gerar PDF');
        return;
      }
      
      if (!data.days || data.days.length === 0) {
        alert('Nenhum dado encontrado para gerar o PDF. Verifique se há registros processados para este funcionário e mês.');
        return;
      }

      // Criar PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Renderizar página do funcionário
      renderEmployeePage(pdf, data, pageWidth, pageHeight);

      // Salvar PDF
      const fileName = `Folha_Ponto_${data.employee.name.replace(/\s+/g, '_')}_${data.monthYear}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  const updateOccurrenceType = async (
    reportId: number, 
    occurrenceType: string | null,
    occurrenceMorningEntry?: boolean,
    occurrenceLunchExit?: boolean,
    occurrenceAfternoonEntry?: boolean,
    occurrenceFinalExit?: boolean
  ) => {
    if (isSavingOccurrence) return; // Prevenir múltiplos cliques
    
    setIsSavingOccurrence(true);
    try {
      const response = await fetch('/api/reports/update-occurrence', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: reportId,
          occurrence_type: occurrenceType || null,
          occurrence_hours_minutes: null,
          occurrence_duration: null,
          occurrence_morning_entry: occurrenceMorningEntry || false,
          occurrence_lunch_exit: occurrenceLunchExit || false,
          occurrence_afternoon_entry: occurrenceAfternoonEntry || false,
          occurrence_final_exit: occurrenceFinalExit || false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Erro ao atualizar ocorrência');
        return;
      }

      const result = await response.json();

      // Atualizar o estado local
      setReports(prevReports =>
        prevReports.map(r =>
          r.id === reportId ? { 
            ...r, 
            occurrence_type: result.data.occurrence_type,
            occurrence_morning_entry: result.data.occurrence_morning_entry,
            occurrence_lunch_exit: result.data.occurrence_lunch_exit,
            occurrence_afternoon_entry: result.data.occurrence_afternoon_entry,
            occurrence_final_exit: result.data.occurrence_final_exit,
          } : r
        )
      );

      // Recarregar relatórios para refletir novos cálculos
      await loadReports();

      setEditingReport(null);
    } catch (error) {
      alert('Erro ao atualizar ocorrência. Tente novamente.');
    } finally {
      setIsSavingOccurrence(false);
    }
  };

  // Função para salvar correção manual de batidas
  const saveManualPunchCorrection = async (report: Report) => {
    if (isSavingManualPunch) return; // Prevenir múltiplos cliques
    
    setIsSavingManualPunch(true);
    try {
      // Converter horários para formato HH:mm (remover data se presente)
      const formatTimeInput = (time: string | null): string | null => {
        if (!time) return null;
        // Se já estiver em formato HH:mm, retornar como está
        if (/^\d{2}:\d{2}$/.test(time)) return time;
        // Se estiver em formato datetime, extrair apenas HH:mm
        const match = time.match(/(\d{2}:\d{2})/);
        return match ? match[1] : null;
      };

      const response = await fetch('/api/manual-punch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: report.employee_id,
          date: report.date,
          morningEntry: formatTimeInput(editingManualMorningEntry) || null,
          lunchExit: formatTimeInput(editingManualLunchExit) || null,
          afternoonEntry: formatTimeInput(editingManualAfternoonEntry) || null,
          finalExit: formatTimeInput(editingManualFinalExit) || null,
          correctionReason: editingManualReason || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Erro ao salvar correção manual');
        return;
      }

      // Recarregar relatórios para refletir novos cálculos
      await loadReports();

      // Limpar estados
      setEditingManualPunch(null);
      setEditingManualMorningEntry('');
      setEditingManualLunchExit('');
      setEditingManualAfternoonEntry('');
      setEditingManualFinalExit('');
      setEditingManualReason('');
      setOriginalMorningEntry('');
      setOriginalLunchExit('');
      setOriginalAfternoonEntry('');
      setOriginalFinalExit('');
    } catch (error) {
      alert('Erro ao salvar correção manual. Tente novamente.');
    } finally {
      setIsSavingManualPunch(false);
    }
  };

  // Função para remover correção manual de batidas
  const removeManualPunchCorrection = async (report: Report) => {
    if (!confirm('Tem certeza que deseja remover a correção manual? As batidas do arquivo serão usadas novamente.')) {
      return;
    }

    try {
      const response = await fetch(`/api/manual-punch?employeeId=${report.employee_id}&date=${report.date}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Erro ao remover correção manual');
        return;
      }

      // Recarregar relatórios para refletir novos cálculos
      await loadReports();

      // Limpar estados
      setEditingManualPunch(null);
      setEditingManualMorningEntry('');
      setEditingManualLunchExit('');
      setEditingManualAfternoonEntry('');
      setEditingManualFinalExit('');
      setEditingManualReason('');
      setOriginalMorningEntry('');
      setOriginalLunchExit('');
      setOriginalAfternoonEntry('');
      setOriginalFinalExit('');
      setOriginalMorningEntry('');
      setOriginalLunchExit('');
      setOriginalAfternoonEntry('');
      setOriginalFinalExit('');
    } catch (error) {
      alert('Erro ao remover correção manual. Tente novamente.');
    }
  };

  // Função para buscar correção manual existente e preencher o modal
  const openManualPunchModal = async (report: Report) => {
    setEditingManualPunch(report.id);
    
    // Buscar correção manual existente e batidas originais
    try {
      const response = await fetch(`/api/manual-punch?employeeId=${report.employee_id}&date=${report.date}`);
      const data = await response.json();
      
      // Função auxiliar para formatar datetime para HH:mm
      const formatToTime = (time: string | null): string => {
        if (!time) return '';
        const match = time.match(/(\d{2}:\d{2})/);
        return match ? match[1] : '';
      };
      
      // Preencher batidas originais do relógio
      if (data.originalPunches) {
        setOriginalMorningEntry(formatToTime(data.originalPunches.morning_entry));
        setOriginalLunchExit(formatToTime(data.originalPunches.lunch_exit));
        setOriginalAfternoonEntry(formatToTime(data.originalPunches.afternoon_entry));
        setOriginalFinalExit(formatToTime(data.originalPunches.final_exit));
      } else {
        // Se não houver batidas originais, limpar
        setOriginalMorningEntry('');
        setOriginalLunchExit('');
        setOriginalAfternoonEntry('');
        setOriginalFinalExit('');
      }
      
      if (data.data) {
        // Preencher com dados existentes (formatar para HH:mm)
        setEditingManualMorningEntry(formatToTime(data.data.morning_entry));
        setEditingManualLunchExit(formatToTime(data.data.lunch_exit));
        setEditingManualAfternoonEntry(formatToTime(data.data.afternoon_entry));
        setEditingManualFinalExit(formatToTime(data.data.final_exit));
        setEditingManualReason(data.data.correction_reason || '');
      } else {
        // Preencher com batidas atuais (formatar para HH:mm)
        setEditingManualMorningEntry(formatToTime(report.morning_entry));
        setEditingManualLunchExit(formatToTime(report.lunch_exit));
        setEditingManualAfternoonEntry(formatToTime(report.afternoon_entry));
        setEditingManualFinalExit(formatToTime(report.final_exit));
        setEditingManualReason('');
      }
    } catch (error) {
      // Em caso de erro, preencher com batidas atuais
      const formatToTime = (time: string | null): string => {
        if (!time) return '';
        const match = time.match(/(\d{2}:\d{2})/);
        return match ? match[1] : '';
      };
      
      setEditingManualMorningEntry(formatToTime(report.morning_entry));
      setEditingManualLunchExit(formatToTime(report.lunch_exit));
      setEditingManualAfternoonEntry(formatToTime(report.afternoon_entry));
      setEditingManualFinalExit(formatToTime(report.final_exit));
      setEditingManualReason('');
      // Limpar batidas originais em caso de erro
      setOriginalMorningEntry('');
      setOriginalLunchExit('');
      setOriginalAfternoonEntry('');
      setOriginalFinalExit('');
    }
  };

  const getOccurrenceTypeLabel = (type: string | null | undefined): string => {
    const labels: Record<string, string> = {
      FERIADO: 'Feriado',
      FALTA: 'Falta',
      FOLGA: 'Folga',
      ATESTADO: 'Atestado',
      DECLARACAO: 'Declaração',
      ESQUECIMENTO_BATIDA: 'E. Batida',
    };
    return type ? labels[type] || type : '';
  };

  const getOccurrenceTypeColor = (type: string | null | undefined): string => {
    const colors: Record<string, string> = {
      FERIADO: 'bg-purple-100 text-purple-800 border-purple-300',
      FALTA: 'bg-red-100 text-red-800 border-red-300',
      FOLGA: 'bg-blue-100 text-blue-800 border-blue-300',
      ATESTADO: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      DECLARACAO: 'bg-green-100 text-green-800 border-green-300',
      ESQUECIMENTO_BATIDA: 'bg-orange-100 text-orange-800 border-orange-300',
    };
    return type ? colors[type] || 'bg-gray-100 text-gray-800 border-gray-300' : '';
  };

  const generateAllPDFs = async () => {
    if (employees.length === 0) {
      alert('Nenhum funcionário encontrado.');
      return;
    }

    try {
      // Importar jsPDF dinamicamente
      const { default: jsPDF } = await import('jspdf');
      
      // Pegar o mês atual baseado nas datas selecionadas
      const month = startDate.substring(0, 7); // YYYY-MM
      
      // Criar PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let isFirstEmployee = true;
      let employeesWithData = 0;
      
      // Processar cada funcionário
      for (let i = 0; i < employees.length; i++) {
        const employee = employees[i];
        
        try {
          const response = await fetch(`/api/pdf?employeeId=${employee.id}&month=${month}`);
          const data = await response.json();
          
          if (response.status !== 200) {
            continue;
          }
          
          if (!data.days || data.days.length === 0) {
            continue;
          }
          
          // Se não for o primeiro funcionário, adicionar nova página
          if (!isFirstEmployee) {
            pdf.addPage();
          }
          
          // Renderizar página do funcionário
          renderEmployeePage(pdf, data, pageWidth, pageHeight);
          isFirstEmployee = false;
          employeesWithData++;
        } catch (error) {
          // Erro ao processar funcionário - continua com os próximos
          continue;
        }
      }
      
      if (employeesWithData === 0) {
        alert('Nenhum dado encontrado para gerar o PDF. Verifique se há registros processados para o mês selecionado.');
        return;
      }
      
      // Salvar PDF
      const monthYear = month.replace('-', '_');
      const fileName = `Folha_Ponto_Todos_Funcionarios_${monthYear}.pdf`;
      pdf.save(fileName);
      
      alert(`PDF gerado com sucesso! ${employeesWithData} funcionário(s) incluído(s).`);
    } catch (error) {
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Relatórios de Ponto</h2>
          <p className="text-neutral-600">Visualize e exporte relatórios detalhados de ponto</p>
        </div>
      </div>
      
      <div className="p-4 bg-primary-50 border-2 border-primary-200 rounded-xl">
        <p className="text-sm text-primary-800 flex items-start space-x-2">
          <svg className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span><strong>Modo CLT (Legal):</strong> Exibindo dados conforme art. 58 §1º CLT + Súmula 366 TST.</span>
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            Funcionário
          </label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value ? parseInt(e.target.value) : '')}
            className="input"
            required
          >
            <option value="">-- Selecione um funcionário --</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            Data Inicial
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            Data Final
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={generatePDF}
            disabled={loading || reports.length === 0 || !selectedEmployee}
            className="flex-1 btn-primary disabled:bg-neutral-400 disabled:cursor-not-allowed disabled:hover:bg-neutral-400"
            title={
              reports.length === 0
                ? 'Nenhum relatório disponível'
                : !selectedEmployee
                  ? 'Selecione um funcionário para habilitar a geração do PDF'
                  : 'Gerar PDF do funcionário selecionado'
            }
          >
            Gerar PDF Individual
          </button>
          <button
            onClick={generateAllPDFs}
            disabled={loading || employees.length === 0}
            className="flex-1 btn-accent disabled:bg-neutral-400 disabled:cursor-not-allowed disabled:hover:bg-neutral-400"
            title="Gerar PDF com todos os funcionários (um documento único com uma folha por funcionário)"
          >
            Gerar PDF Todos
          </button>
        </div>
      </div>

      {!selectedEmployee ? (
        <div className="text-center py-12 text-neutral-500">
          <svg className="mx-auto h-12 w-12 text-neutral-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p>Selecione um funcionário para visualizar os registros.</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-neutral-500 flex items-center justify-center space-x-2">
          <svg className="animate-spin h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Carregando...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          <svg className="mx-auto h-12 w-12 text-neutral-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>Nenhum registro encontrado para o período selecionado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-3 sm:mx-0 rounded-xl border border-neutral-200">
          <table className="w-full divide-y divide-neutral-200 table-auto text-xs sm:text-sm bg-white">
            <thead className="bg-gradient-to-r from-primary-500 to-primary-600">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Data
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Ocorrência
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Ações
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider min-w-[120px]">
                  Funcionário
                </th>
                {/* Headers dinâmicos: verificar se há turno único nos reports */}
                {reports.length > 0 && (reports[0].shift_type === 'MORNING_ONLY' || reports[0].shift_type === 'AFTERNOON_ONLY') ? (
                      <>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                          Entrada
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                          S. Intervalo
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                          E. Pós-Int.
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                          Saída Final
                    </th>
                  </>
                ) : (
                  <>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                          E. Manhã
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                          S. Alm.
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                          E. Tarde
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                          S. Tarde
                        </th>
                      </>
                    )}
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                      ATRASO_CLT
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                      H.EXTRA_CLT
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      SALDO_CLT
                    </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {reports.map((report) => {
                // Saldo = Horas Trabalhadas - Horas Previstas
                // Usar os mesmos valores de worked_minutes e expected_minutes
                const workedMinutes = report.worked_minutes || 0;
                const expectedMinutes = report.expected_minutes || 0;
                const balance = workedMinutes - expectedMinutes;
                const isInconsistent = (report.status || 'OK') === 'INCONSISTENTE';
                const isSingleShift = report.shift_type === 'MORNING_ONLY' || report.shift_type === 'AFTERNOON_ONLY';
                return (
                  <tr key={report.id} className="hover:bg-primary-50/30 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-neutral-900">
                      {formatDate(report.date)}
                      {isInconsistent && (
                        <span className="ml-1 text-yellow-600">⚠️</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs">
                      {report.calendar_event_type ? (
                        <span className={`px-2 py-1 rounded text-[10px] font-medium border ${
                          report.calendar_event_type === 'FERIADO' 
                            ? 'bg-purple-100 text-purple-800 border-purple-300'
                            : 'bg-blue-100 text-blue-800 border-blue-300'
                        }`} title={report.calendar_event_description || undefined}>
                          {report.calendar_event_type === 'FERIADO' 
                            ? (report.calendar_event_description ? `Feriado: ${report.calendar_event_description}` : 'Feriado')
                            : 'DSR'}
                        </span>
                      ) : report.occurrence_type ? (
                        <span className={`px-2 py-1 rounded text-[10px] font-medium border ${getOccurrenceTypeColor(report.occurrence_type)}`}>
                          {getOccurrenceTypeLabel(report.occurrence_type)}
                        </span>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingReport(report.id);
                            setEditingOccurrenceType(report.occurrence_type || '');
                            setEditingOccurrenceMorningEntry(report.occurrence_morning_entry || false);
                            setEditingOccurrenceLunchExit(report.occurrence_lunch_exit || false);
                            setEditingOccurrenceAfternoonEntry(report.occurrence_afternoon_entry || false);
                            setEditingOccurrenceFinalExit(report.occurrence_final_exit || false);
                          }}
                          className="text-primary-600 hover:text-primary-800 transition-colors p-1 rounded hover:bg-primary-50"
                          title="Editar ocorrência"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openManualPunchModal(report);
                          }}
                          className="text-orange-600 hover:text-orange-800 transition-colors p-1 rounded hover:bg-orange-50"
                          title="Corrigir batidas manualmente"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-neutral-900">
                      <div className="font-medium truncate">{report.employee_name}</div>
                      <div className="text-[10px] text-neutral-500 truncate">{report.department}</div>
                    </td>
                    {/* Para turnos únicos, os campos são sempre na ordem: 1ª=Entrada, 2ª=Saída intervalo, 3ª=Entrada pós-intervalo, 4ª=Saída final */}
                        {isSingleShift ? (
                          <>
                            {/* Coluna 1: Entrada (1ª batida) */}
                        <td className="px-3 py-3 whitespace-nowrap text-xs">
                              {report.occurrence_morning_entry && report.occurrence_type ? (
                                <span className={`px-2 py-1 rounded text-[10px] font-medium border ${getOccurrenceTypeColor(report.occurrence_type)}`}>
                                  {getOccurrenceTypeLabel(report.occurrence_type)}
                            </span>
                          ) : (
                                <span className={`text-neutral-900 ${report.is_manual_morning_entry ? 'text-orange-600 font-semibold' : ''}`} title={report.is_manual_morning_entry ? 'Batida corrigida manualmente' : ''}>
                                  {report.is_manual_morning_entry && '🔧 '}
                                  {formatTime(report.morning_entry)}
                                </span>
                          )}
                        </td>
                            {/* Coluna 2: Saída Intervalo (2ª batida) */}
                        <td className="px-3 py-3 whitespace-nowrap text-xs">
                              {report.occurrence_lunch_exit && report.occurrence_type ? (
                                <span className={`px-2 py-1 rounded text-[10px] font-medium border ${getOccurrenceTypeColor(report.occurrence_type)}`}>
                                  {getOccurrenceTypeLabel(report.occurrence_type)}
                            </span>
                          ) : (
                                <span className={`text-neutral-900 ${report.is_manual_lunch_exit ? 'text-orange-600 font-semibold' : ''}`} title={report.is_manual_lunch_exit ? 'Batida corrigida manualmente' : ''}>
                                  {report.is_manual_lunch_exit && '🔧 '}
                                  {formatTime(report.lunch_exit)}
                                </span>
                          )}
                        </td>
                            {/* Coluna 3: Entrada Pós-Intervalo (3ª batida) */}
                        <td className="px-3 py-3 whitespace-nowrap text-xs">
                              {report.occurrence_afternoon_entry && report.occurrence_type ? (
                                <span className={`px-2 py-1 rounded text-[10px] font-medium border ${getOccurrenceTypeColor(report.occurrence_type)}`}>
                                  {getOccurrenceTypeLabel(report.occurrence_type)}
                            </span>
                          ) : (
                                <span className={`text-neutral-900 ${report.is_manual_afternoon_entry ? 'text-orange-600 font-semibold' : ''}`} title={report.is_manual_afternoon_entry ? 'Batida corrigida manualmente' : ''}>
                                  {report.is_manual_afternoon_entry && '🔧 '}
                                  {formatTime(report.afternoon_entry)}
                                </span>
                          )}
                        </td>
                            {/* Coluna 4: Saída Final (4ª batida) */}
                        <td className="px-3 py-3 whitespace-nowrap text-xs">
                              {report.occurrence_final_exit && report.occurrence_type ? (
                                <span className={`px-2 py-1 rounded text-[10px] font-medium border ${getOccurrenceTypeColor(report.occurrence_type)}`}>
                                  {getOccurrenceTypeLabel(report.occurrence_type)}
                            </span>
                          ) : (
                                <span className={`text-neutral-900 ${report.is_manual_final_exit ? 'text-orange-600 font-semibold' : ''}`} title={report.is_manual_final_exit ? 'Batida corrigida manualmente' : ''}>
                                  {report.is_manual_final_exit && '🔧 '}
                                  {formatTime(report.final_exit)}
                                </span>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                            {/* Jornada completa: manter mapeamento original */}
                            <td className="px-3 py-3 whitespace-nowrap text-xs">
                              {report.occurrence_morning_entry && report.occurrence_type ? (
                                <span className={`px-2 py-1 rounded text-[10px] font-medium border ${getOccurrenceTypeColor(report.occurrence_type)}`}>
                                  {getOccurrenceTypeLabel(report.occurrence_type)}
                                </span>
                              ) : (
                                <span className={`text-neutral-900 ${report.is_manual_morning_entry ? 'text-orange-600 font-semibold' : ''}`} title={report.is_manual_morning_entry ? 'Batida corrigida manualmente' : ''}>
                                  {report.is_manual_morning_entry && '🔧 '}
                                  {formatTime(report.morning_entry)}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-xs">
                              {report.occurrence_lunch_exit && report.occurrence_type ? (
                                <span className={`px-2 py-1 rounded text-[10px] font-medium border ${getOccurrenceTypeColor(report.occurrence_type)}`}>
                                  {getOccurrenceTypeLabel(report.occurrence_type)}
                                </span>
                              ) : (
                                <span className={`text-neutral-900 ${report.is_manual_lunch_exit ? 'text-orange-600 font-semibold' : ''}`} title={report.is_manual_lunch_exit ? 'Batida corrigida manualmente' : ''}>
                                  {report.is_manual_lunch_exit && '🔧 '}
                                  {formatTime(report.lunch_exit)}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-xs">
                              {report.occurrence_afternoon_entry && report.occurrence_type ? (
                                <span className={`px-2 py-1 rounded text-[10px] font-medium border ${getOccurrenceTypeColor(report.occurrence_type)}`}>
                                  {getOccurrenceTypeLabel(report.occurrence_type)}
                                </span>
                              ) : (
                                <span className={`text-neutral-900 ${report.is_manual_afternoon_entry ? 'text-orange-600 font-semibold' : ''}`} title={report.is_manual_afternoon_entry ? 'Batida corrigida manualmente' : ''}>
                                  {report.is_manual_afternoon_entry && '🔧 '}
                                  {formatTime(report.afternoon_entry)}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-xs">
                              {report.occurrence_final_exit && report.occurrence_type ? (
                                <span className={`px-2 py-1 rounded text-[10px] font-medium border ${getOccurrenceTypeColor(report.occurrence_type)}`}>
                                  {getOccurrenceTypeLabel(report.occurrence_type)}
                                </span>
                              ) : (
                                <span className={`text-neutral-900 ${report.is_manual_final_exit ? 'text-orange-600 font-semibold' : ''}`} title={report.is_manual_final_exit ? 'Batida corrigida manualmente' : ''}>
                                  {report.is_manual_final_exit && '🔧 '}
                                  {formatTime(report.final_exit)}
                                </span>
                              )}
                            </td>
                          </>
                        )}
                    <td className="px-3 py-3 whitespace-nowrap text-xs">
                      {report.atraso_clt_minutes && report.atraso_clt_minutes > 0 ? (
                        <span className="text-red-600 font-medium" title="Atraso CLT (após tolerância de 5 min por marcação, máximo 10 min/dia)">
                          {formatMinutes(report.atraso_clt_minutes)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs">
                      {report.extra_clt_minutes && report.extra_clt_minutes > 0 ? (
                        <span className="text-blue-600 font-medium" title="Hora extra CLT (após tolerância de 5 min por marcação, máximo 10 min/dia)">
                          {formatMinutes(report.extra_clt_minutes)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs">
                      {(() => {
                        const saldoClt = report.saldo_clt_minutes || 0;
                        return (
                          <div className={`font-semibold ${saldoClt > 0 ? 'text-green-600' : saldoClt < 0 ? 'text-red-600' : 'text-neutral-600'}`}>
                            {formatMinutes(Math.abs(saldoClt), true)}
                            {saldoClt > 0 ? '+' : saldoClt < 0 ? '-' : ''}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gradient-to-r from-primary-50 to-primary-100 font-semibold">
              <tr>
                <td colSpan={3} className="px-3 py-3 text-left text-xs text-neutral-700 font-semibold">
                  Totais:
                </td>
                <td className="px-3 py-3 text-xs text-neutral-700">
                  {/* Coluna Funcionário - vazia nos totais */}
                </td>
                <td colSpan={4} className="px-3 py-3 text-xs text-neutral-700">
                  {/* E. Manhã, S. Alm., E. Tarde, S. Tarde - vazias nos totais */}
                </td>
                <td className="px-3 py-3 text-xs text-red-600">
                  {formatMinutes(reports.reduce((sum, r) => sum + (r.atraso_clt_minutes || 0), 0))}
                </td>
                <td className="px-3 py-3 text-xs text-blue-600">
                  {formatMinutes(reports.reduce((sum, r) => sum + (r.extra_clt_minutes || 0), 0))}
                </td>
                <td className="px-3 py-3 text-xs">
                  {(() => {
                    const totalSaldoClt = reports.reduce((sum, r) => sum + (r.saldo_clt_minutes || 0), 0);
                    return (
                      <span className={`font-semibold ${totalSaldoClt > 0 ? 'text-green-600' : totalSaldoClt < 0 ? 'text-red-600' : 'text-neutral-600'}`}>
                        {formatMinutes(Math.abs(totalSaldoClt), true)}
                        {totalSaldoClt > 0 ? '+' : totalSaldoClt < 0 ? '-' : ''}
                      </span>
                    );
                  })()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Modal para editar ocorrência */}
      {editingReport && (() => {
        const report = reports.find(r => r.id === editingReport);
        if (!report) return null;

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                if (isSavingOccurrence) return; // Prevenir fechamento durante salvamento
                setEditingReport(null);
                setEditingOccurrenceType('');
                setEditingOccurrenceMorningEntry(false);
                setEditingOccurrenceLunchExit(false);
                setEditingOccurrenceAfternoonEntry(false);
                setEditingOccurrenceFinalExit(false);
              }}
            />
            
            {/* Modal Content */}
            <div
              className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-neutral-900">
                  Editar Ocorrência
                </h3>
                <button
                  onClick={() => {
                    if (isSavingOccurrence) return; // Prevenir fechamento durante salvamento
                    setEditingReport(null);
                    setEditingOccurrenceType('');
                    setEditingOccurrenceMorningEntry(false);
                    setEditingOccurrenceLunchExit(false);
                    setEditingOccurrenceAfternoonEntry(false);
                    setEditingOccurrenceFinalExit(false);
                  }}
                  disabled={isSavingOccurrence}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Informações do registro */}
              <div className="mb-4 p-3 bg-neutral-50 rounded-lg">
                <p className="text-sm text-neutral-600">
                  <span className="font-medium">Funcionário:</span> {report.employee_name}
                </p>
                <p className="text-sm text-neutral-600">
                  <span className="font-medium">Data:</span> {formatDate(report.date)}
                </p>
              </div>

              {/* Tipo de Ocorrência */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Tipo de Ocorrência
                </label>
                <select
                  value={editingOccurrenceType || report.occurrence_type || ''}
                  onChange={(e) => {
                    const value = e.target.value || null;
                    setEditingOccurrenceType(value || '');
                    if (!value) {
                      setEditingOccurrenceMorningEntry(false);
                      setEditingOccurrenceLunchExit(false);
                      setEditingOccurrenceAfternoonEntry(false);
                      setEditingOccurrenceFinalExit(false);
                    }
                  }}
                  className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus
                >
                  <option value="">Normal (nenhuma ocorrência)</option>
                  <option value="FERIADO">Feriado</option>
                  <option value="FALTA">Falta</option>
                  <option value="FOLGA">Folga</option>
                  <option value="ATESTADO">Atestado</option>
                  <option value="DECLARACAO">Declaração</option>
                  <option value="ESQUECIMENTO_BATIDA">Esquecimento de Batida</option>
                </select>
              </div>

              {/* Seleção de Batidas (apenas se houver tipo selecionado) */}
              {(editingOccurrenceType || report.occurrence_type) && (() => {
                // Detectar se é turno único (horista)
                const isSingleShift = report.shift_type === 'MORNING_ONLY' || report.shift_type === 'AFTERNOON_ONLY';
                
                // Labels dinâmicos baseados no tipo de turno
                const punchLabels = isSingleShift ? {
                  morning: 'Entrada',
                  lunch: 'Saída Intervalo',
                  afternoon: 'Entrada Pós-Intervalo',
                  final: 'Saída Final'
                } : {
                  morning: 'Entrada Manhã',
                  lunch: 'Saída Almoço',
                  afternoon: 'Entrada Tarde',
                  final: 'Saída Final'
                };
                
                return (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-neutral-700 mb-3">
                      Aplicar ocorrência nas batidas:
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingOccurrenceMorningEntry || report.occurrence_morning_entry || false}
                          onChange={(e) => setEditingOccurrenceMorningEntry(e.target.checked)}
                          className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-neutral-700">{punchLabels.morning}</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingOccurrenceLunchExit || report.occurrence_lunch_exit || false}
                          onChange={(e) => setEditingOccurrenceLunchExit(e.target.checked)}
                          className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-neutral-700">{punchLabels.lunch}</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingOccurrenceAfternoonEntry || report.occurrence_afternoon_entry || false}
                          onChange={(e) => setEditingOccurrenceAfternoonEntry(e.target.checked)}
                          className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-neutral-700">{punchLabels.afternoon}</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingOccurrenceFinalExit || report.occurrence_final_exit || false}
                          onChange={(e) => setEditingOccurrenceFinalExit(e.target.checked)}
                          className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-neutral-700">{punchLabels.final}</span>
                      </label>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500">
                      Marque as batidas onde a ocorrência deve aparecer
                    </p>
                  </div>
                );
              })()}

              {/* Botões */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-200">
                <button
                  onClick={() => {
                    if (isSavingOccurrence) return; // Prevenir fechamento durante salvamento
                    setEditingReport(null);
                    setEditingOccurrenceType('');
                    setEditingOccurrenceMorningEntry(false);
                    setEditingOccurrenceLunchExit(false);
                    setEditingOccurrenceAfternoonEntry(false);
                    setEditingOccurrenceFinalExit(false);
                  }}
                  disabled={isSavingOccurrence}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const finalType = editingOccurrenceType || report.occurrence_type || null;
                    const finalMorningEntry = editingOccurrenceMorningEntry !== undefined ? editingOccurrenceMorningEntry : (report.occurrence_morning_entry || false);
                    const finalLunchExit = editingOccurrenceLunchExit !== undefined ? editingOccurrenceLunchExit : (report.occurrence_lunch_exit || false);
                    const finalAfternoonEntry = editingOccurrenceAfternoonEntry !== undefined ? editingOccurrenceAfternoonEntry : (report.occurrence_afternoon_entry || false);
                    const finalFinalExit = editingOccurrenceFinalExit !== undefined ? editingOccurrenceFinalExit : (report.occurrence_final_exit || false);
                    
                    updateOccurrenceType(
                      report.id, 
                      finalType,
                      finalMorningEntry,
                      finalLunchExit,
                      finalAfternoonEntry,
                      finalFinalExit
                    );
                  }}
                  disabled={isSavingOccurrence}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSavingOccurrence && (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isSavingOccurrence ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal para corrigir batidas manualmente */}
      {editingManualPunch && (() => {
        const report = reports.find(r => r.id === editingManualPunch);
        if (!report) return null;

        // Detectar se é turno único (horista) para labels dinâmicos
        const isSingleShift = report.shift_type === 'MORNING_ONLY' || report.shift_type === 'AFTERNOON_ONLY';
        const punchLabels = isSingleShift ? {
          morning: 'Entrada',
          lunch: 'Saída Intervalo',
          afternoon: 'Entrada Pós-Intervalo',
          final: 'Saída Final'
        } : {
          morning: 'Entrada Manhã',
          lunch: 'Saída Almoço',
          afternoon: 'Entrada Tarde',
          final: 'Saída Final'
        };

        // Verificar se já existe correção manual
        const hasManualCorrection = report.is_manual_morning_entry || report.is_manual_lunch_exit || 
                                    report.is_manual_afternoon_entry || report.is_manual_final_exit;

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                if (isSavingManualPunch) return; // Prevenir fechamento durante salvamento
                setEditingManualPunch(null);
                setEditingManualMorningEntry('');
                setEditingManualLunchExit('');
                setEditingManualAfternoonEntry('');
                setEditingManualFinalExit('');
                setEditingManualReason('');
                setOriginalMorningEntry('');
                setOriginalLunchExit('');
                setOriginalAfternoonEntry('');
                setOriginalFinalExit('');
              }}
            />
            
            {/* Modal Content */}
            <div
              className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-neutral-900">
                  {hasManualCorrection ? 'Editar Correção Manual' : 'Corrigir Batidas Manualmente'}
                </h3>
                <button
                  onClick={() => {
                    if (isSavingManualPunch) return; // Prevenir fechamento durante salvamento
                    setEditingManualPunch(null);
                    setEditingManualMorningEntry('');
                    setEditingManualLunchExit('');
                    setEditingManualAfternoonEntry('');
                    setEditingManualFinalExit('');
                    setEditingManualReason('');
                    setOriginalMorningEntry('');
                    setOriginalLunchExit('');
                    setOriginalAfternoonEntry('');
                    setOriginalFinalExit('');
                  }}
                  disabled={isSavingManualPunch}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Informações do registro */}
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-neutral-600">
                  <span className="font-medium">Funcionário:</span> {report.employee_name}
                </p>
                <p className="text-sm text-neutral-600">
                  <span className="font-medium">Data:</span> {formatDate(report.date)}
                </p>
                {hasManualCorrection && (
                  <p className="text-xs text-orange-600 mt-2">
                    ⚠️ Este registro já possui correção manual. Ao salvar, a correção será atualizada.
                  </p>
                )}
              </div>

              {/* Batidas originais do relógio (somente leitura) */}
              {(originalMorningEntry || originalLunchExit || originalAfternoonEntry || originalFinalExit) && (
                <div className="mb-4 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-neutral-700 mb-3">
                    📋 Batidas Originais do Relógio
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-neutral-500">{punchLabels.morning}:</span>
                      <span className="ml-2 font-mono text-neutral-700">
                        {originalMorningEntry || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500">{punchLabels.lunch}:</span>
                      <span className="ml-2 font-mono text-neutral-700">
                        {originalLunchExit || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500">{punchLabels.afternoon}:</span>
                      <span className="ml-2 font-mono text-neutral-700">
                        {originalAfternoonEntry || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500">{punchLabels.final}:</span>
                      <span className="ml-2 font-mono text-neutral-700">
                        {originalFinalExit || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Campos de horário corrigidos */}
              <div className="space-y-4 mb-4">
                <h4 className="text-sm font-semibold text-orange-700 mb-3">
                  ✏️ Horários Corrigidos
                </h4>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    {punchLabels.morning}
                  </label>
                  <input
                    type="time"
                    value={editingManualMorningEntry}
                    onChange={(e) => setEditingManualMorningEntry(e.target.value)}
                    className="w-full text-sm border-2 border-orange-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    {punchLabels.lunch}
                  </label>
                  <input
                    type="time"
                    value={editingManualLunchExit}
                    onChange={(e) => setEditingManualLunchExit(e.target.value)}
                    className="w-full text-sm border-2 border-orange-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    {punchLabels.afternoon}
                  </label>
                  <input
                    type="time"
                    value={editingManualAfternoonEntry}
                    onChange={(e) => setEditingManualAfternoonEntry(e.target.value)}
                    className="w-full text-sm border-2 border-orange-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    {punchLabels.final}
                  </label>
                  <input
                    type="time"
                    value={editingManualFinalExit}
                    onChange={(e) => setEditingManualFinalExit(e.target.value)}
                    className="w-full text-sm border-2 border-orange-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Motivo da correção (opcional) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Motivo da Correção (opcional)
                </label>
                <textarea
                  value={editingManualReason}
                  onChange={(e) => setEditingManualReason(e.target.value)}
                  placeholder="Ex: Funcionária se enrolou e bateu o ponto errado"
                  rows={3}
                  className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Informação */}
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  💡 <strong>Importante:</strong> As batidas corrigidas manualmente terão prioridade sobre as batidas do arquivo. 
                  Mesmo que um novo arquivo seja carregado, as correções manuais serão preservadas.
                </p>
              </div>

              {/* Botões de ação */}
              <div className="flex items-center justify-between gap-3">
                {hasManualCorrection && (
                  <button
                    onClick={() => removeManualPunchCorrection(report)}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Remover Correção
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button
                    onClick={() => {
                      if (isSavingManualPunch) return; // Prevenir fechamento durante salvamento
                      setEditingManualPunch(null);
                      setEditingManualMorningEntry('');
                      setEditingManualLunchExit('');
                      setEditingManualAfternoonEntry('');
                      setEditingManualFinalExit('');
                      setEditingManualReason('');
                      setOriginalMorningEntry('');
                      setOriginalLunchExit('');
                      setOriginalAfternoonEntry('');
                      setOriginalFinalExit('');
                    }}
                    disabled={isSavingManualPunch}
                    className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => saveManualPunchCorrection(report)}
                    disabled={isSavingManualPunch}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSavingManualPunch && (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isSavingManualPunch ? 'Salvando...' : 'Salvar Correção'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

