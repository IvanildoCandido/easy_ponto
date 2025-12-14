'use client';

import { useState, useEffect } from 'react';

interface Employee {
  id: number;
  en_no: number;
  name: string;
  department: string;
}

interface Schedule {
  id?: number;
  employee_id: number;
  day_of_week: number;
  morning_start: string | null;
  morning_end: string | null;
  afternoon_start: string | null;
  afternoon_end: string | null;
  shift_type?: 'FULL_DAY' | 'MORNING_ONLY' | 'AFTERNOON_ONLY' | null;
  break_minutes?: number | null;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

/**
 * Calcula horas trabalhadas em minutos para um dia específico
 */
function calculateDayHours(schedule: Schedule | undefined): number {
  if (!schedule) return 0;
  
  let totalMinutes = 0;
  const shiftType = schedule.shift_type || 'FULL_DAY';
  const breakMinutes = schedule.break_minutes || 0;
  
  if (shiftType === 'MORNING_ONLY') {
    // Turno único manhã: entrada (morning_start) até saída final (afternoon_end), menos intervalo
    if (schedule.morning_start && schedule.afternoon_end) {
      const [startH, startM] = schedule.morning_start.split(':').map(Number);
      const [endH, endM] = schedule.afternoon_end.split(':').map(Number);
      const startTotalMinutes = startH * 60 + startM;
      const endTotalMinutes = endH * 60 + endM;
      totalMinutes = endTotalMinutes - startTotalMinutes - breakMinutes;
    }
  } else if (shiftType === 'AFTERNOON_ONLY') {
    // Turno único tarde: entrada (afternoon_start) até saída final (afternoon_end), menos intervalo
    if (schedule.afternoon_start && schedule.afternoon_end) {
      const [startH, startM] = schedule.afternoon_start.split(':').map(Number);
      const [endH, endM] = schedule.afternoon_end.split(':').map(Number);
      const startTotalMinutes = startH * 60 + startM;
      const endTotalMinutes = endH * 60 + endM;
      totalMinutes = endTotalMinutes - startTotalMinutes - breakMinutes;
    }
  } else {
    // Jornada completa (FULL_DAY): manhã + tarde
    // Horas da manhã
    if (schedule.morning_start && schedule.morning_end) {
      const [startH, startM] = schedule.morning_start.split(':').map(Number);
      const [endH, endM] = schedule.morning_end.split(':').map(Number);
      const startTotalMinutes = startH * 60 + startM;
      const endTotalMinutes = endH * 60 + endM;
      totalMinutes += endTotalMinutes - startTotalMinutes;
    }
    
    // Horas da tarde
    if (schedule.afternoon_start && schedule.afternoon_end) {
      const [startH, startM] = schedule.afternoon_start.split(':').map(Number);
      const [endH, endM] = schedule.afternoon_end.split(':').map(Number);
      const startTotalMinutes = startH * 60 + startM;
      const endTotalMinutes = endH * 60 + endM;
      totalMinutes += endTotalMinutes - startTotalMinutes;
    }
  }
  
  return Math.max(0, totalMinutes); // Garantir que não seja negativo
}

/**
 * Formata minutos em formato HH:MM
 */
function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export default function ScheduleConfig() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | ''>('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadSchedules(selectedEmployee);
    } else {
      setSchedules([]);
    }
  }, [selectedEmployee]);

  const loadEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      // Erro silencioso - usuário verá lista vazia
    }
  };

  const loadSchedules = async (employeeId: number) => {
    try {
      const response = await fetch(`/api/schedules?employeeId=${employeeId}`);
      const data = await response.json();
      
      // Inicializar com todos os dias da semana (segunda a sábado)
      const allSchedules: Schedule[] = DAYS_OF_WEEK.map(day => {
        const existing = data.find((s: Schedule) => s.day_of_week === day.value);
        return existing || {
          employee_id: employeeId,
          day_of_week: day.value,
          morning_start: '08:00',
          morning_end: '12:00',
          afternoon_start: '13:00',
          afternoon_end: '17:00',
          shift_type: 'FULL_DAY',
          break_minutes: null,
        };
      });
      
      setSchedules(allSchedules);
    } catch (error) {
      // Erro silencioso - usuário verá horários padrão
    }
  };

  const handleScheduleChange = (dayOfWeek: number, field: keyof Schedule, value: string | number | null) => {
    setSchedules(prev =>
      prev.map(s =>
        s.day_of_week === dayOfWeek ? { ...s, [field]: value } : s
      )
    );
  };

  const handleSave = async () => {
    if (!selectedEmployee) {
      setMessage({ type: 'error', text: 'Selecione um funcionário' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const results = await Promise.all(
        schedules.map(async schedule => {
          // Normalizar valores vazios para null antes de enviar
          const normalizedSchedule = {
            ...schedule,
            morning_start: schedule.morning_start || null,
            morning_end: schedule.morning_end || null,
            afternoon_start: schedule.afternoon_start || null,
            afternoon_end: schedule.afternoon_end || null,
            shift_type: schedule.shift_type || 'FULL_DAY',
            break_minutes: schedule.break_minutes || null,
          };
          
          const response = await fetch('/api/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(normalizedSchedule),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Erro ao salvar horário: ${response.statusText}`);
          }
          
          return response.json();
        })
      );

      setMessage({ type: 'success', text: 'Horários salvos com sucesso!' });
      loadSchedules(selectedEmployee);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar horários' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Configuração de Horários de Trabalho</h2>
        <p className="text-neutral-600">Configure os horários de trabalho para cada funcionário</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            Selecione o funcionário
          </label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value ? parseInt(e.target.value) : '')}
            className="input"
          >
            <option value="">-- Selecione um funcionário --</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.department})
              </option>
            ))}
          </select>
        </div>

        {selectedEmployee && (
          <>
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Horários por dia da semana</h3>
              <div className="space-y-4">
                {DAYS_OF_WEEK.map(day => {
                  const schedule = schedules.find(s => s.day_of_week === day.value);
                  const shiftType = schedule?.shift_type || 'FULL_DAY';
                  const hasMorning = !!(schedule?.morning_start && schedule?.morning_end);
                  const hasAfternoon = !!(schedule?.afternoon_start && schedule?.afternoon_end);
                  const dayHours = calculateDayHours(schedule);
                  const isMorningOnly = shiftType === 'MORNING_ONLY';
                  const isAfternoonOnly = shiftType === 'AFTERNOON_ONLY';
                  const isFullDay = shiftType === 'FULL_DAY';
                  
                  return (
                    <div
                      key={day.value}
                      className="card-hover p-5"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="font-semibold text-neutral-800">{day.label}</div>
                          {dayHours > 0 && (
                            <div className="badge-success">
                              {formatHours(dayHours)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Tipo de Turno */}
                      <div className="mb-4">
                        <label className="block text-xs font-semibold text-neutral-700 mb-2">
                          Tipo de Turno
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`shift_type_${day.value}`}
                              value="FULL_DAY"
                              checked={isFullDay}
                              onChange={(e) => {
                                handleScheduleChange(day.value, 'shift_type', e.target.value);
                                if (!hasMorning && !hasAfternoon) {
                                  // Inicializar valores padrão se não houver nada
                                  handleScheduleChange(day.value, 'morning_start', '08:00');
                                  handleScheduleChange(day.value, 'morning_end', '12:00');
                                  handleScheduleChange(day.value, 'afternoon_start', '13:00');
                                  handleScheduleChange(day.value, 'afternoon_end', '17:00');
                                }
                              }}
                              className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-neutral-300"
                            />
                            <span className="text-sm text-neutral-700">Jornada Completa</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`shift_type_${day.value}`}
                              value="MORNING_ONLY"
                              checked={isMorningOnly}
                              onChange={(e) => {
                                handleScheduleChange(day.value, 'shift_type', e.target.value);
                                // Limpar campos de tarde e inicializar manhã
                                handleScheduleChange(day.value, 'afternoon_start', null);
                                handleScheduleChange(day.value, 'afternoon_end', null);
                                if (!schedule?.morning_start) {
                                  handleScheduleChange(day.value, 'morning_start', '06:00');
                                }
                                if (!schedule?.afternoon_end) {
                                  // afternoon_end será usado como saída final do turno
                                  handleScheduleChange(day.value, 'afternoon_end', '14:00');
                                }
                                handleScheduleChange(day.value, 'morning_end', null);
                              }}
                              className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-neutral-300"
                            />
                            <span className="text-sm text-neutral-700">Turno Único Manhã</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`shift_type_${day.value}`}
                              value="AFTERNOON_ONLY"
                              checked={isAfternoonOnly}
                              onChange={(e) => {
                                handleScheduleChange(day.value, 'shift_type', e.target.value);
                                // Limpar campos de manhã e inicializar tarde
                                handleScheduleChange(day.value, 'morning_start', null);
                                handleScheduleChange(day.value, 'morning_end', null);
                                if (!schedule?.afternoon_start) {
                                  handleScheduleChange(day.value, 'afternoon_start', '14:00');
                                }
                                if (!schedule?.afternoon_end) {
                                  handleScheduleChange(day.value, 'afternoon_end', '22:00');
                                }
                              }}
                              className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-neutral-300"
                            />
                            <span className="text-sm text-neutral-700">Turno Único Tarde</span>
                          </label>
                        </div>
                      </div>

                      {/* Intervalo (Break) - apenas para turnos únicos */}
                      {(isMorningOnly || isAfternoonOnly) && (
                        <div className="mb-4">
                          <label className="block text-xs font-semibold text-neutral-700 mb-2">
                            Intervalo (minutos) - Direito do funcionário
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="120"
                            value={schedule?.break_minutes || 20}
                            onChange={(e) =>
                              handleScheduleChange(day.value, 'break_minutes', e.target.value ? parseInt(e.target.value) : 20)
                            }
                            className="input text-sm py-2 w-32"
                            placeholder="20"
                          />
                          <p className="text-xs text-neutral-500 mt-1">
                            Minutos do intervalo obrigatório (padrão: 20 minutos)
                          </p>
                        </div>
                      )}

                      {/* Campos de horário */}
                      {isFullDay && (
                        <>
                          <div className="flex gap-3 text-xs mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={hasMorning}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleScheduleChange(day.value, 'morning_start', '08:00');
                                    handleScheduleChange(day.value, 'morning_end', '12:00');
                                  } else {
                                    handleScheduleChange(day.value, 'morning_start', null);
                                    handleScheduleChange(day.value, 'morning_end', null);
                                  }
                                }}
                                className="rounded w-4 h-4 text-primary-600 focus:ring-primary-500 border-neutral-300"
                              />
                              <span className="text-neutral-700 font-medium">Trabalha Manhã</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={hasAfternoon}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleScheduleChange(day.value, 'afternoon_start', '13:00');
                                    handleScheduleChange(day.value, 'afternoon_end', '17:00');
                                  } else {
                                    handleScheduleChange(day.value, 'afternoon_start', null);
                                    handleScheduleChange(day.value, 'afternoon_end', null);
                                  }
                                }}
                                className="rounded w-4 h-4 text-primary-600 focus:ring-primary-500 border-neutral-300"
                              />
                              <span className="text-neutral-700 font-medium">Trabalha Tarde</span>
                            </label>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-neutral-700 mb-2">Entrada Manhã</label>
                              <input
                                type="time"
                                value={schedule?.morning_start || ''}
                                onChange={(e) =>
                                  handleScheduleChange(day.value, 'morning_start', e.target.value || null)
                                }
                                disabled={!hasMorning}
                                className="input text-sm py-2 disabled:bg-neutral-100 disabled:cursor-not-allowed"
                                placeholder="--:--"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-neutral-700 mb-2">Saída Manhã (Almoço)</label>
                              <input
                                type="time"
                                value={schedule?.morning_end || ''}
                                onChange={(e) =>
                                  handleScheduleChange(day.value, 'morning_end', e.target.value || null)
                                }
                                disabled={!hasMorning}
                                className="input text-sm py-2 disabled:bg-neutral-100 disabled:cursor-not-allowed"
                                placeholder="--:--"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-neutral-700 mb-2">Entrada Tarde</label>
                              <input
                                type="time"
                                value={schedule?.afternoon_start || ''}
                                onChange={(e) =>
                                  handleScheduleChange(day.value, 'afternoon_start', e.target.value || null)
                                }
                                disabled={!hasAfternoon}
                                className="input text-sm py-2 disabled:bg-neutral-100 disabled:cursor-not-allowed"
                                placeholder="--:--"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-neutral-700 mb-2">Saída Tarde</label>
                              <input
                                type="time"
                                value={schedule?.afternoon_end || ''}
                                onChange={(e) =>
                                  handleScheduleChange(day.value, 'afternoon_end', e.target.value || null)
                                }
                                disabled={!hasAfternoon}
                                className="input text-sm py-2 disabled:bg-neutral-100 disabled:cursor-not-allowed"
                                placeholder="--:--"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {/* Campos para Turno Único Manhã */}
                      {isMorningOnly && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-neutral-700 mb-2">Entrada</label>
                            <input
                              type="time"
                              value={schedule?.morning_start || ''}
                              onChange={(e) =>
                                handleScheduleChange(day.value, 'morning_start', e.target.value || null)
                              }
                              className="input text-sm py-2"
                              placeholder="--:--"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-neutral-700 mb-2">Saída Final</label>
                            <input
                              type="time"
                              value={schedule?.afternoon_end || ''}
                              onChange={(e) =>
                                handleScheduleChange(day.value, 'afternoon_end', e.target.value || null)
                              }
                              className="input text-sm py-2"
                              placeholder="--:--"
                            />
                            <p className="text-xs text-neutral-500 mt-1">
                              Funcionário deve bater 4 vezes: Entrada, Saída Intervalo, Entrada pós-intervalo, Saída Final
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Campos para Turno Único Tarde */}
                      {isAfternoonOnly && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-neutral-700 mb-2">Entrada</label>
                            <input
                              type="time"
                              value={schedule?.afternoon_start || ''}
                              onChange={(e) =>
                                handleScheduleChange(day.value, 'afternoon_start', e.target.value || null)
                              }
                              className="input text-sm py-2"
                              placeholder="--:--"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-neutral-700 mb-2">Saída Final</label>
                            <input
                              type="time"
                              value={schedule?.afternoon_end || ''}
                              onChange={(e) =>
                                handleScheduleChange(day.value, 'afternoon_end', e.target.value || null)
                              }
                              className="input text-sm py-2"
                              placeholder="--:--"
                            />
                            <p className="text-xs text-neutral-500 mt-1">
                              Funcionário deve bater 4 vezes: Entrada, Saída Intervalo, Entrada pós-intervalo, Saída Final
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Resumo semanal */}
              <div className="mt-6 p-6 bg-gradient-to-br from-primary-50 to-accent-50/30 rounded-2xl border-2 border-primary-200">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-neutral-800">Total Semanal:</div>
                  <div className="text-2xl font-bold text-gradient">
                    {formatHours(
                      schedules.reduce((total, schedule) => total + calculateDayHours(schedule), 0)
                    )}
                  </div>
                </div>
                <div className="mt-3 text-sm text-neutral-600 font-medium">
                  {schedules.reduce((total, schedule) => total + calculateDayHours(schedule), 0)} minutos / semana
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={loading}
              className="mt-6 w-full btn-primary disabled:bg-neutral-400 disabled:cursor-not-allowed disabled:hover:bg-neutral-400"
            >
              {loading ? 'Salvando...' : 'Salvar Horários'}
            </button>
          </>
        )}

        {message && (
          <div
            className={`p-4 rounded-md ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}

