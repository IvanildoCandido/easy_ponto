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
  
  return totalMinutes;
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
      console.error('Erro ao carregar funcionários:', error);
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
        };
      });
      
      setSchedules(allSchedules);
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
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
      console.error('Erro ao salvar horários:', error);
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar horários' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Configuração de Horários de Trabalho</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione o funcionário
          </label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value ? parseInt(e.target.value) : '')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  const hasMorning = !!(schedule?.morning_start && schedule?.morning_end);
                  const hasAfternoon = !!(schedule?.afternoon_start && schedule?.afternoon_end);
                  const dayHours = calculateDayHours(schedule);
                  
                  return (
                    <div
                      key={day.value}
                      className="border border-gray-200 rounded-md p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="font-medium text-gray-700">{day.label}</div>
                          {dayHours > 0 && (
                            <div className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              {formatHours(dayHours)}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 text-xs">
                          <label className="flex items-center gap-1">
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
                              className="rounded"
                            />
                            <span className="text-gray-600">Trabalha Manhã</span>
                          </label>
                          <label className="flex items-center gap-1">
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
                              className="rounded"
                            />
                            <span className="text-gray-600">Trabalha Tarde</span>
                          </label>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Entrada Manhã</label>
                          <input
                            type="time"
                            value={schedule?.morning_start || ''}
                            onChange={(e) =>
                              handleScheduleChange(day.value, 'morning_start', e.target.value || null)
                            }
                            disabled={!hasMorning}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="--:--"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Saída Manhã (Almoço)</label>
                          <input
                            type="time"
                            value={schedule?.morning_end || ''}
                            onChange={(e) =>
                              handleScheduleChange(day.value, 'morning_end', e.target.value || null)
                            }
                            disabled={!hasMorning}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="--:--"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Entrada Tarde</label>
                          <input
                            type="time"
                            value={schedule?.afternoon_start || ''}
                            onChange={(e) =>
                              handleScheduleChange(day.value, 'afternoon_start', e.target.value || null)
                            }
                            disabled={!hasAfternoon}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="--:--"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Saída Tarde</label>
                          <input
                            type="time"
                            value={schedule?.afternoon_end || ''}
                            onChange={(e) =>
                              handleScheduleChange(day.value, 'afternoon_end', e.target.value || null)
                            }
                            disabled={!hasAfternoon}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="--:--"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Resumo semanal */}
              <div className="mt-6 p-4 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-700">Total Semanal:</div>
                  <div className="text-xl font-bold text-blue-600">
                    {formatHours(
                      schedules.reduce((total, schedule) => total + calculateDayHours(schedule), 0)
                    )}
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {schedules.reduce((total, schedule) => total + calculateDayHours(schedule), 0)} minutos / semana
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={loading}
              className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700
                disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
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

