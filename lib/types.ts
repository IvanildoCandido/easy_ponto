export interface TimeRecord {
  No: number;
  TMNo: number;
  EnNo: number;
  Name: string;
  GMNo: number;
  Mode: number;
  'In/Out': number;
  VM: string;
  Department: string;
  DateTime: string;
}

export interface Employee {
  id: number;
  en_no: number;
  name: string;
  department: string;
  compensation_type?: 'BANCO_DE_HORAS' | 'PAGAMENTO_FOLHA' | null; // Tipo de compensação: Banco de Horas ou Pagamento em Folha
  created_at: string;
}

export interface WorkSchedule {
  id: number;
  employee_id: number;
  day_of_week: number; // 1 = Segunda, 2 = Terça, ..., 6 = Sábado (sem domingo)
  morning_start: string | null; // HH:mm - Entrada manhã (null se não trabalha de manhã)
  morning_end: string | null; // HH:mm - Saída almoço (null se não trabalha de manhã)
  afternoon_start: string | null; // HH:mm - Entrada tarde (null se não trabalha de tarde)
  afternoon_end: string | null; // HH:mm - Saída tarde (null se não trabalha de tarde)
  shift_type?: 'FULL_DAY' | 'MORNING_ONLY' | 'AFTERNOON_ONLY' | null; // Tipo de turno (FULL_DAY = padrão)
  break_minutes?: number | null; // Minutos do intervalo obrigatório (ex: 20 para horistas)
  interval_tolerance_minutes?: number | null; // Tolerância de intervalo em minutos (ex: 20 para permitir até 20min a mais no intervalo sem considerar excesso)
}

export interface ScheduleOverride {
  id?: number;
  employee_id: number;
  date: string; // Data no formato 'yyyy-MM-dd' - data específica para este horário
  morning_start: string | null;
  morning_end: string | null;
  afternoon_start: string | null;
  afternoon_end: string | null;
  shift_type?: 'FULL_DAY' | 'MORNING_ONLY' | 'AFTERNOON_ONLY' | null;
  break_minutes?: number | null;
  interval_tolerance_minutes?: number | null;
  created_at?: string;
  updated_at?: string;
}

// Manter compatibilidade com código antigo (deprecated)
/** @deprecated Use ScheduleOverride instead */
export interface WorkScheduleException extends ScheduleOverride {}

export interface ProcessedRecord {
  id: number;
  employee_id: number;
  date: string;
  first_entry: string | null;
  last_exit: string | null;
  expected_start: string | null;
  expected_end: string | null;
  delay_minutes: number;
  early_arrival_minutes: number;
  overtime_minutes: number;
  early_exit_minutes?: number; // Saída antecipada (novo campo)
  worked_minutes: number;
  status?: 'OK' | 'INCONSISTENTE';
  balance_minutes?: number; // Saldo do dia
}

export interface DailyReport {
  employee: Employee;
  date: string;
  first_entry: string | null;
  last_exit: string | null;
  expected_start: string | null;
  expected_end: string | null;
  delay_minutes: number;
  early_arrival_minutes: number;
  overtime_minutes: number;
  worked_minutes: number;
  worked_hours: string;
}

