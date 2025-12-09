'use client';

import { useState, useEffect, useCallback } from 'react';

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
  occurrence_type?: 'FERIADO' | 'FALTA' | 'FOLGA' | 'ATESTADO' | 'DECLARACAO' | null;
  occurrence_hours_minutes?: number | null;
  occurrence_duration?: 'COMPLETA' | 'MEIO_PERIODO' | null;
}

export default function ReportsView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInternalMode, setShowInternalMode] = useState(false); // false = CLT (padrão), true = Controle Interno
  const [editingReport, setEditingReport] = useState<number | null>(null); // ID do registro sendo editado
  const [editingOccurrenceType, setEditingOccurrenceType] = useState<string>('');
  const [editingOccurrenceDuration, setEditingOccurrenceDuration] = useState<string>('');
  const [editingOccurrenceHours, setEditingOccurrenceHours] = useState<string>('');

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
    if (!startDate || !endDate) return;
    
    setLoading(true);
    try {
      let url = `/api/reports?startDate=${startDate}&endDate=${endDate}`;
      if (selectedEmployee) {
        url += `&employeeId=${selectedEmployee}`;
      }
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
    // Definir datas padrão (últimos 30 dias)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
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
    pageHeight: number,
    isFirstPage: boolean = false
  ) => {
    let yPos = 7; // Sempre começar do topo da página
    const lineHeight = 4.8;
    const margin = 7;
    const headerHeight = 20;

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

    // Tabela compacta - larguras ajustadas para caber na página A4 (210mm)
    // Colunas: Data, Dia, Ocorr, Entrada, Almoço, Retorno, Saída, Atraso, Extra, Saldo
    const colWidths = [18, 8, 10, 11, 11, 11, 11, 11, 11, 12];
    const totalTableWidth = colWidths.reduce((sum, w) => sum + w, 0); // Total: 116mm
    const tableMargin = Math.max(5, (pageWidth - totalTableWidth) / 2); // Centralizar
    const headers = ['Data', 'Dia', 'Ocorr.', 'Entrada', 'Almoço', 'Retorno', 'Saída', 'Atraso', 'Extra', 'Saldo'];
    
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
        pdf.rect(tableMargin, yPos - 4.5, totalTableWidth, lineHeight, 'F');
      }

      // Destaque para domingos e registros inconsistentes
      if (day.isSunday) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(tableMargin, yPos - 4.5, totalTableWidth, lineHeight, 'F');
      }
      if (day.status === 'INCONSISTENTE') {
        pdf.setFillColor(255, 249, 196); // Amarelo claro para inconsistente
        pdf.rect(tableMargin, yPos - 4.5, totalTableWidth, lineHeight, 'F');
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
      
      // Texto da ocorrência (abreviado para PDF)
      const occurrenceLabelsShort: Record<string, string> = {
        FERIADO: 'FER',
        FALTA: 'FAL',
        FOLGA: 'FOL',
        ATESTADO: 'ATE',
        DECLARACAO: 'DEC',
      };
      let occurrenceText = '-';
      if (day.occurrenceType) {
        const occType = String(day.occurrenceType).trim().toUpperCase();
        if (occurrenceLabelsShort[occType]) {
          occurrenceText = occurrenceLabelsShort[occType];
        }
      }

      // Garantir que fonte e cor estão corretas antes de renderizar linha
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(0, 0, 0);
      
      xPos = tableMargin;
      
      // Coluna 0: Data - garantir que não ultrapasse
      const finalDateText = String(dateText).substring(0, 12); // Limitar a 12 caracteres
      pdf.text(finalDateText, xPos + 0.5, yPos);
      xPos += colWidths[0];
      
      // Coluna 1: Dia - garantir que seja exatamente 3 caracteres
      const finalDayText = String(dayOfWeekText).substring(0, 3);
      pdf.text(finalDayText, xPos + 0.5, yPos);
      xPos += colWidths[1];
      
      // Coluna 2: Ocorrência
      pdf.setTextColor(0, 0, 0); // Sempre começar preto
      if (occurrenceText && occurrenceText !== '-') {
        pdf.setTextColor(52, 73, 94); // Cinza escuro apenas se tiver ocorrência válida
      }
      pdf.text(String(occurrenceText || '-'), xPos + 0.5, yPos);
      xPos += colWidths[2];
      pdf.setTextColor(0, 0, 0); // Resetar cor sempre
      
      // Coluna 3: Entrada
      pdf.text(String(day.morningEntry || '-'), xPos + 0.5, yPos);
      xPos += colWidths[3];
      
      // Coluna 4: Almoço
      pdf.text(String(day.lunchExit || '-'), xPos + 0.5, yPos);
      xPos += colWidths[4];
      
      // Coluna 5: Retorno
      pdf.text(String(day.afternoonEntry || '-'), xPos + 0.5, yPos);
      xPos += colWidths[5];
      
      // Coluna 6: Saída
      pdf.text(String(day.finalExit || '-'), xPos + 0.5, yPos);
      xPos += colWidths[6];
      
      // Coluna 7: Atraso
      pdf.setTextColor(0, 0, 0);
      const atrasoText = day.atrasoClt > 0 ? `${day.atrasoClt}min` : '-';
      if (day.atrasoClt > 0) {
        pdf.setTextColor(231, 76, 60);
      }
      pdf.text(String(atrasoText), xPos + 0.5, yPos);
      xPos += colWidths[7];
      pdf.setTextColor(0, 0, 0);
      
      // Coluna 8: Extra
      const extraText = day.extraClt > 0 ? `${day.extraClt}min` : '-';
      if (day.extraClt > 0) {
        pdf.setTextColor(52, 152, 219);
      }
      pdf.text(String(extraText), xPos + 0.5, yPos);
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
      pdf.text(String(saldoText), xPos + 0.5, yPos);
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
      renderEmployeePage(pdf, data, pageWidth, pageHeight, true);

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
    occurrenceHoursMinutes?: number | null,
    occurrenceDuration?: 'COMPLETA' | 'MEIO_PERIODO' | null
  ) => {
    try {
      const response = await fetch('/api/reports/update-occurrence', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: reportId,
          occurrence_type: occurrenceType || null,
          occurrence_hours_minutes: occurrenceHoursMinutes !== undefined ? occurrenceHoursMinutes : null,
          occurrence_duration: occurrenceDuration || null,
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
            occurrence_hours_minutes: result.data.occurrence_hours_minutes,
            occurrence_duration: result.data.occurrence_duration,
          } : r
        )
      );

      // Recarregar relatórios para refletir novos cálculos
      await loadReports();

      setEditingReport(null);
    } catch (error) {
      alert('Erro ao atualizar ocorrência. Tente novamente.');
    }
  };

  const getOccurrenceTypeLabel = (type: string | null | undefined): string => {
    const labels: Record<string, string> = {
      FERIADO: 'Feriado',
      FALTA: 'Falta',
      FOLGA: 'Folga',
      ATESTADO: 'Atestado',
      DECLARACAO: 'Declaração',
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
      
      let isFirstPage = true;
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
          
          // Se não for a primeira página, adicionar nova página
          if (!isFirstPage) {
            pdf.addPage();
          }
          
          // Renderizar página do funcionário
          renderEmployeePage(pdf, data, pageWidth, pageHeight, isFirstPage);
          isFirstPage = false;
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
        <button
          onClick={() => setShowInternalMode(!showInternalMode)}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
            showInternalMode
              ? 'bg-neutral-600 text-white hover:bg-neutral-700 shadow-sm'
              : 'btn-primary'
          }`}
          title={showInternalMode ? 'Mostrar dados CLT (legal)' : 'Mostrar dados de controle interno'}
        >
          {showInternalMode ? '📊 Modo CLT' : '⚙️ Controle Interno'}
        </button>
      </div>
      
      {showInternalMode && (
        <div className="p-4 bg-accent-50 border-2 border-accent-200 rounded-xl">
          <p className="text-sm text-accent-800 flex items-start space-x-2">
            <svg className="w-5 h-5 text-accent-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span><strong>Modo Controle Interno:</strong> Exibindo dados gerenciais (horas trabalhadas vs previstas). Para dados legais CLT, clique em &quot;📊 Modo CLT&quot;.</span>
          </p>
        </div>
      )}
      
      {!showInternalMode && (
        <div className="p-4 bg-primary-50 border-2 border-primary-200 rounded-xl">
          <p className="text-sm text-primary-800 flex items-start space-x-2">
            <svg className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span><strong>Modo CLT (Legal):</strong> Exibindo dados conforme art. 58 §1º CLT + Súmula 366 TST. Para dados de controle interno, clique em &quot;⚙️ Controle Interno&quot;.</span>
          </p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            Funcionário
          </label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value ? parseInt(e.target.value) : '')}
            className="input"
          >
            <option value="">Todos</option>
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

      {loading ? (
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
                {showInternalMode ? (
                  <>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                      H. Trab.
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                      H. Prev.
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Saldo
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
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                      ATRASO_CLT
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                      H.EXTRA_CLT
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      SALDO_CLT
                    </th>
                  </>
                )}
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
                return (
                  <tr key={report.id} className={`hover:bg-primary-50/30 transition-colors ${isInconsistent ? 'bg-accent-50' : ''}`}>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-neutral-900">
                      {formatDate(report.date)}
                      {isInconsistent && (
                        <span className="ml-1 text-yellow-600">⚠️</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs">
                      {report.occurrence_type ? (
                        <span className={`px-2 py-1 rounded text-[10px] font-medium border ${getOccurrenceTypeColor(report.occurrence_type)}`}>
                          {getOccurrenceTypeLabel(report.occurrence_type)}
                        </span>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingReport(report.id);
                          setEditingOccurrenceType(report.occurrence_type || '');
                          setEditingOccurrenceDuration(report.occurrence_duration || '');
                          setEditingOccurrenceHours(report.occurrence_hours_minutes?.toString() || '');
                        }}
                        className="text-primary-600 hover:text-primary-800 transition-colors p-1 rounded hover:bg-primary-50"
                        title="Editar ocorrência"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-3 py-3 text-xs text-neutral-900">
                      <div className="font-medium truncate">{report.employee_name}</div>
                      <div className="text-[10px] text-neutral-500 truncate">{report.department}</div>
                    </td>
                    {showInternalMode ? (
                      <>
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-neutral-900 font-medium">
                          {report.worked_hours}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-neutral-700">
                          {report.expected_hours || '-'}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs">
                          <div className={`font-semibold ${balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-neutral-600'}`}>
                            {formatMinutes(Math.abs(balance), true)}
                            {balance > 0 ? '+' : balance < 0 ? '-' : ''}
                          </div>
                          <div className="text-[10px] text-neutral-500">
                            {workedMinutes}-{expectedMinutes}
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-neutral-900">
                          {formatTime(report.morning_entry)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-neutral-900">
                          {formatTime(report.lunch_exit)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-neutral-900">
                          {formatTime(report.afternoon_entry)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-neutral-900">
                          {formatTime(report.final_exit)}
                        </td>
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
                      </>
                    )}
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
                {showInternalMode ? (
                  <>
                    <td className="px-3 py-3 text-xs text-neutral-900 font-semibold">
                      {formatWorkedHours(reports.reduce((sum, r) => sum + (r.worked_minutes || 0), 0))}
                    </td>
                    <td className="px-3 py-3 text-xs text-neutral-700 font-semibold">
                      {formatWorkedHours(reports.reduce((sum, r) => sum + (r.expected_minutes || 0), 0))}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {(() => {
                        const totalBalance = reports.reduce(
                          (sum, r) => {
                            const worked = r.worked_minutes || 0;
                            const expected = r.expected_minutes || 0;
                            return sum + (worked - expected);
                          },
                          0
                        );
                        return (
                          <span className={`font-semibold ${totalBalance > 0 ? 'text-green-600' : totalBalance < 0 ? 'text-red-600' : 'text-neutral-600'}`}>
                            {formatMinutes(Math.abs(totalBalance), true)}
                            {totalBalance > 0 ? '+' : totalBalance < 0 ? '-' : ''}
                          </span>
                        );
                      })()}
                    </td>
                  </>
                ) : (
                  <>
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
                  </>
                )}
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
                setEditingReport(null);
                setEditingOccurrenceType('');
                setEditingOccurrenceDuration('');
                setEditingOccurrenceHours('');
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
                    setEditingReport(null);
                    setEditingOccurrenceType('');
                    setEditingOccurrenceDuration('');
                    setEditingOccurrenceHours('');
                  }}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
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
                      setEditingOccurrenceDuration('');
                      setEditingOccurrenceHours('');
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
                </select>
              </div>

              {/* Duração/Horas (apenas se houver tipo selecionado) */}
              {(editingOccurrenceType || report.occurrence_type) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Duração
                  </label>
                  <select
                    value={editingOccurrenceDuration || report.occurrence_duration || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEditingOccurrenceDuration(value);
                      if (value === 'COMPLETA' || value === 'MEIO_PERIODO') {
                        setEditingOccurrenceHours(''); // Limpar horas se selecionar duração pré-definida
                      }
                    }}
                    className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Horas específicas</option>
                    <option value="COMPLETA">Folga Completa</option>
                    <option value="MEIO_PERIODO">Meio Período</option>
                  </select>
                  
                  {/* Campo de horas (apenas se não for COMPLETA ou MEIO_PERIODO) */}
                  {(editingOccurrenceDuration === '' || (editingOccurrenceDuration !== 'COMPLETA' && editingOccurrenceDuration !== 'MEIO_PERIODO')) && (!report.occurrence_duration || (report.occurrence_duration !== 'COMPLETA' && report.occurrence_duration !== 'MEIO_PERIODO')) && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Horas (em minutos)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editingOccurrenceHours || report.occurrence_hours_minutes || ''}
                        onChange={(e) => setEditingOccurrenceHours(e.target.value)}
                        placeholder="Ex: 240 (4 horas)"
                        className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-neutral-500">
                        Digite a quantidade de minutos que devem ser considerados
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Botões */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-200">
                <button
                  onClick={() => {
                    setEditingReport(null);
                    setEditingOccurrenceType('');
                    setEditingOccurrenceDuration('');
                    setEditingOccurrenceHours('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const finalType = editingOccurrenceType || report.occurrence_type || null;
                    const finalDuration = editingOccurrenceDuration || report.occurrence_duration || null;
                    const finalHours = editingOccurrenceHours 
                      ? parseInt(editingOccurrenceHours, 10) 
                      : (report.occurrence_hours_minutes !== undefined ? report.occurrence_hours_minutes : null);
                    
                    updateOccurrenceType(
                      report.id, 
                      finalType,
                      finalHours,
                      finalDuration as 'COMPLETA' | 'MEIO_PERIODO' | null
                    );
                    setEditingOccurrenceType('');
                    setEditingOccurrenceDuration('');
                    setEditingOccurrenceHours('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

