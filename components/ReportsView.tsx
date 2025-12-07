'use client';

import { useState, useEffect } from 'react';

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
}

export default function ReportsView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInternalMode, setShowInternalMode] = useState(false); // false = CLT (padrão), true = Controle Interno

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
    if (startDate && endDate) {
      loadReports();
    }
  }, [selectedEmployee, startDate, endDate]);

  const loadEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
    }
  };

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

  const loadReports = async () => {
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
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };


  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return new Date(time).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
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

    // Tabela compacta - centralizar na página (campos CLT)
    const colWidths = [16, 10, 14, 14, 14, 14, 14, 14, 14];
    const totalTableWidth = colWidths.reduce((sum, w) => sum + w, 0);
    const tableMargin = (pageWidth - totalTableWidth) / 2; // Centralizar tabela
    const headers = ['Data', 'Dia', 'Entrada', 'Almoço', 'Retorno', 'Saída', 'Atraso', 'Extra', 'Saldo'];
    
    // Cabeçalho da tabela com fundo
    pdf.setFillColor(52, 152, 219); // Azul mais claro
    pdf.rect(tableMargin, yPos - 5, totalTableWidth, 8, 'F');
    
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255); // Texto branco no cabeçalho
    let xPos = tableMargin + 1;
    headers.forEach((header, idx) => {
      pdf.text(String(header), xPos, yPos);
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
    pdf.setFontSize(7.5);
    let rowIndex = 0;
    
    data.days.forEach((day: any) => {
      // Verificar se precisa de nova página
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        yPos = 7;
        
        // Redesenhar cabeçalho da tabela na nova página
        pdf.setFillColor(52, 152, 219);
        pdf.rect(tableMargin, yPos - 5, totalTableWidth, 8, 'F');
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        xPos = tableMargin + 1;
        headers.forEach((header, idx) => {
          pdf.text(String(header), xPos, yPos);
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

      xPos = tableMargin + 1;
      const rowData = [
        day.date + (day.status === 'INCONSISTENTE' ? ' ⚠' : ''),
        day.dayOfWeek.substring(0, 3),
        day.morningEntry,
        day.lunchExit,
        day.afternoonEntry,
        day.finalExit,
        day.atrasoClt > 0 ? `${day.atrasoClt}min` : '-',
        day.extraClt > 0 ? `${day.extraClt}min` : '-',
        day.saldoClt !== 0 ? `${formatBalance(day.saldoClt)}${day.saldoClt > 0 ? '+' : '-'}` : '0min'
      ];
      rowData.forEach((cell, idx) => {
        // Cores para valores importantes (campos CLT)
        if (idx === 6 && day.atrasoClt > 0) {
          pdf.setTextColor(231, 76, 60); // Vermelho para atraso CLT
        } else if (idx === 7 && day.extraClt > 0) {
          pdf.setTextColor(52, 152, 219); // Azul para hora extra CLT
        } else if (idx === 8) {
          if (day.saldoClt > 0) {
            pdf.setTextColor(39, 174, 96); // Verde para saldo CLT positivo
          } else if (day.saldoClt < 0) {
            pdf.setTextColor(231, 76, 60); // Vermelho para saldo CLT negativo
          } else {
            pdf.setTextColor(127, 140, 141); // Cinza para zero
          }
        } else {
          pdf.setTextColor(0, 0, 0); // Preto para o resto
        }
        
        pdf.text(cell, xPos, yPos);
        xPos += colWidths[idx];
      });

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
      
      // Log temporário para debug
      console.log('[PDF Frontend] Dados recebidos da API:', {
        employee: data.employee,
        month: data.month,
        totalDays: data.days?.length,
        firstDay: data.days?.[0],
        daysWithData: data.days?.filter((d: any) => 
          d.morningEntry !== '-' || d.lunchExit !== '-' || 
          d.afternoonEntry !== '-' || d.finalExit !== '-'
        ).length
      });
      
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
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    }
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
            console.warn(`Erro ao buscar dados para ${employee.name}:`, data.error);
            continue;
          }
          
          if (!data.days || data.days.length === 0) {
            console.warn(`Nenhum dado encontrado para ${employee.name}`);
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
          console.error(`Erro ao processar funcionário ${employee.name}:`, error);
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
      console.error('Erro ao gerar PDF de todos os funcionários:', error);
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
                <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider min-w-[120px]">
                  Funcionário
                </th>
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
                {showInternalMode ? (
                  <>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                      H. Trab.
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                      H. Prev.
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Saldo (Gestão)
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Atraso
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                      Cheg. Ant.
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                      H. Extra
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                      Exc. Int.
                    </th>
                  </>
                ) : (
                  <>
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
                    <td className="px-3 py-3 text-xs text-neutral-900">
                      <div className="font-medium truncate">{report.employee_name}</div>
                      <div className="text-[10px] text-neutral-500 truncate">{report.department}</div>
                    </td>
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
                        <td className="px-3 py-3 whitespace-nowrap text-xs">
                          {report.delay_minutes > 0 ? (
                            <span className="text-red-600 font-medium" title="Indicador informativo">
                              {formatMinutes(report.delay_minutes)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs">
                          {report.early_arrival_minutes > 0 ? (
                            <span className="text-green-600 font-medium" title="Indicador informativo">
                              {formatMinutes(report.early_arrival_minutes)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs">
                          {report.overtime_minutes > 0 ? (
                            <span className="text-blue-600 font-medium" title="Indicador informativo">
                              {formatMinutes(report.overtime_minutes)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs">
                          {report.interval_excess_minutes && report.interval_excess_minutes > 0 ? (
                            <span className="text-orange-600 font-medium" title="Excesso de intervalo">
                              {formatMinutes(report.interval_excess_minutes)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </>
                    ) : (
                      <>
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
                <td colSpan={6} className="px-3 py-3 text-right text-xs text-neutral-700">
                  Totais:
                </td>
                {showInternalMode ? (
                  <>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-neutral-900">
                      {formatWorkedHours(reports.reduce((sum, r) => sum + (r.worked_minutes || 0), 0))}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-neutral-700">
                      {formatWorkedHours(reports.reduce((sum, r) => sum + (r.expected_minutes || 0), 0))}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs">
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
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-red-600">
                      {formatMinutes(reports.reduce((sum, r) => sum + r.delay_minutes, 0))}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-green-600">
                      {formatMinutes(reports.reduce((sum, r) => sum + r.early_arrival_minutes, 0))}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-blue-600">
                      {formatMinutes(reports.reduce((sum, r) => sum + r.overtime_minutes, 0))}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-orange-600">
                      {formatMinutes(reports.reduce((sum, r) => sum + (r.interval_excess_minutes || 0), 0))}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-red-600">
                      {formatMinutes(reports.reduce((sum, r) => sum + (r.atraso_clt_minutes || 0), 0))}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-blue-600">
                      {formatMinutes(reports.reduce((sum, r) => sum + (r.extra_clt_minutes || 0), 0))}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs">
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
    </div>
  );
}

