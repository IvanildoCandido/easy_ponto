'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

interface Employee {
  id: number;
  en_no: number;
  name: string;
  department: string;
}

interface ScheduleOverride {
  id?: number;
  employee_id: number;
  date: string; // yyyy-MM-dd
  morning_start: string | null;
  morning_end: string | null;
  afternoon_start: string | null;
  afternoon_end: string | null;
  shift_type?: 'FULL_DAY' | 'MORNING_ONLY' | 'AFTERNOON_ONLY' | null;
  break_minutes?: number | null;
  interval_tolerance_minutes?: number | null;
  employee_name?: string;
}

export default function ScheduleOverrides() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | ''>('');
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOverride, setEditingOverride] = useState<ScheduleOverride | null>(null);
  const [formData, setFormData] = useState<ScheduleOverride>({
    employee_id: 0,
    date: '',
    morning_start: null,
    morning_end: null,
    afternoon_start: null,
    afternoon_end: null,
    shift_type: 'FULL_DAY',
    break_minutes: null,
    interval_tolerance_minutes: null,
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadOverrides(selectedEmployee);
    } else {
      setOverrides([]);
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

  const loadOverrides = async (employeeId: number) => {
    try {
      setLoading(true);
      // Buscar overrides do mês atual e próximo mês
      const startDate = format(new Date(), 'yyyy-MM-01');
      const endDate = format(new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0), 'yyyy-MM-dd');
      
      const response = await fetch(
        `/api/schedule-overrides?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();
      // Garantir que as datas sejam sempre strings no formato yyyy-MM-dd
      const normalizedData = data.map((override: ScheduleOverride) => {
        let dateStr: string;
        if (override.date instanceof Date) {
          // Se por algum motivo vier como Date, converter para yyyy-MM-dd
          const year = override.date.getFullYear();
          const month = String(override.date.getMonth() + 1).padStart(2, '0');
          const day = String(override.date.getDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        } else if (typeof override.date === 'string') {
          // Garantir formato yyyy-MM-dd (remover hora se houver)
          dateStr = override.date.split('T')[0];
        } else {
          dateStr = String(override.date).split('T')[0];
        }
        return {
          ...override,
          date: dateStr,
        };
      });
      setOverrides(normalizedData);
    } catch (error) {
      console.error('Erro ao carregar horários excepcionais:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar horários excepcionais' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    if (!selectedEmployee) {
      setMessage({ type: 'error', text: 'Selecione um funcionário primeiro' });
      return;
    }
    setFormData({
      employee_id: typeof selectedEmployee === 'number' ? selectedEmployee : parseInt(selectedEmployee),
      date: format(new Date(), 'yyyy-MM-dd'),
      morning_start: null,
      morning_end: null,
      afternoon_start: null,
      afternoon_end: null,
      shift_type: 'FULL_DAY',
      break_minutes: null,
      interval_tolerance_minutes: null,
    });
    setEditingOverride(null);
    setShowForm(true);
  };

  const handleEdit = (override: ScheduleOverride) => {
    // Normalizar data para garantir formato yyyy-MM-dd
    let dateStr = override.date;
    if (override.date instanceof Date) {
      const year = override.date.getFullYear();
      const month = String(override.date.getMonth() + 1).padStart(2, '0');
      const day = String(override.date.getDate()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
    } else if (typeof override.date !== 'string') {
      dateStr = String(override.date).split('T')[0];
    } else {
      dateStr = override.date.split('T')[0]; // Garantir formato yyyy-MM-dd
    }
    
    setFormData({
      ...override,
      date: dateStr,
    });
    setEditingOverride({
      ...override,
      date: dateStr,
    });
    setShowForm(true);
  };

  const handleDelete = async (employeeId: number, date: string) => {
    if (!confirm('Tem certeza que deseja remover este horário excepcional?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/schedule-overrides?employeeId=${employeeId}&date=${date}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Erro ao remover horário excepcional');
      }

      setMessage({ type: 'success', text: 'Horário excepcional removido com sucesso!' });
      if (selectedEmployee) {
        loadOverrides(typeof selectedEmployee === 'number' ? selectedEmployee : parseInt(selectedEmployee));
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao remover horário excepcional' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      const response = await fetch('/api/schedule-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar horário excepcional');
      }

      setMessage({
        type: 'success',
        text: editingOverride ? 'Horário excepcional atualizado!' : 'Horário excepcional criado com sucesso!',
      });
      setShowForm(false);
      setEditingOverride(null);
      if (selectedEmployee) {
        loadOverrides(typeof selectedEmployee === 'number' ? selectedEmployee : parseInt(selectedEmployee));
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar horário excepcional' });
    } finally {
      setLoading(false);
    }
  };

  const isFullDay = formData.shift_type === 'FULL_DAY';
  const isMorningOnly = formData.shift_type === 'MORNING_ONLY';
  const isAfternoonOnly = formData.shift_type === 'AFTERNOON_ONLY';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Horários Excepcionais por Data</h2>
        <p className="text-neutral-600">
          Configure horários diferentes para datas específicas (ex: sábado completo em uma semana, meio expediente em outra)
        </p>
      </div>

      <div className="space-y-4">
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
            <button
              onClick={handleAddNew}
              className="btn-primary"
              disabled={loading}
            >
              + Adicionar Horário Excepcional
            </button>

            {showForm && (
              <div className="p-6 bg-white rounded-lg border-2 border-primary-200 shadow-lg">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                  {editingOverride ? 'Editar' : 'Novo'} Horário Excepcional
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">
                      Data *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">
                      Tipo de Turno
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="FULL_DAY"
                          checked={formData.shift_type === 'FULL_DAY'}
                          onChange={(e) => setFormData({ ...formData, shift_type: e.target.value as any })}
                          className="mr-2"
                        />
                        Jornada Completa
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="MORNING_ONLY"
                          checked={formData.shift_type === 'MORNING_ONLY'}
                          onChange={(e) => setFormData({ ...formData, shift_type: e.target.value as any })}
                          className="mr-2"
                        />
                        Turno Único Manhã
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="AFTERNOON_ONLY"
                          checked={formData.shift_type === 'AFTERNOON_ONLY'}
                          onChange={(e) => setFormData({ ...formData, shift_type: e.target.value as any })}
                          className="mr-2"
                        />
                        Turno Único Tarde
                      </label>
                    </div>
                  </div>

                  {isFullDay && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-2">Entrada Manhã</label>
                        <input
                          type="time"
                          value={formData.morning_start || ''}
                          onChange={(e) => setFormData({ ...formData, morning_start: e.target.value || null })}
                          className="input text-sm py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-2">Saída Manhã (Almoço)</label>
                        <input
                          type="time"
                          value={formData.morning_end || ''}
                          onChange={(e) => setFormData({ ...formData, morning_end: e.target.value || null })}
                          className="input text-sm py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-2">Entrada Tarde</label>
                        <input
                          type="time"
                          value={formData.afternoon_start || ''}
                          onChange={(e) => setFormData({ ...formData, afternoon_start: e.target.value || null })}
                          className="input text-sm py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-2">Saída Tarde</label>
                        <input
                          type="time"
                          value={formData.afternoon_end || ''}
                          onChange={(e) => setFormData({ ...formData, afternoon_end: e.target.value || null })}
                          className="input text-sm py-2"
                        />
                      </div>
                    </div>
                  )}

                  {isMorningOnly && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-2">Entrada</label>
                        <input
                          type="time"
                          value={formData.morning_start || ''}
                          onChange={(e) => setFormData({ ...formData, morning_start: e.target.value || null })}
                          className="input text-sm py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-2">Saída Final</label>
                        <input
                          type="time"
                          value={formData.afternoon_end || ''}
                          onChange={(e) => setFormData({ ...formData, afternoon_end: e.target.value || null })}
                          className="input text-sm py-2"
                        />
                      </div>
                    </div>
                  )}

                  {isAfternoonOnly && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-2">Entrada</label>
                        <input
                          type="time"
                          value={formData.afternoon_start || ''}
                          onChange={(e) => setFormData({ ...formData, afternoon_start: e.target.value || null })}
                          className="input text-sm py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-2">Saída Final</label>
                        <input
                          type="time"
                          value={formData.afternoon_end || ''}
                          onChange={(e) => setFormData({ ...formData, afternoon_end: e.target.value || null })}
                          className="input text-sm py-2"
                        />
                      </div>
                    </div>
                  )}

                  {(isMorningOnly || isAfternoonOnly) && (
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-2">
                        Intervalo (minutos)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="120"
                        value={formData.break_minutes || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, break_minutes: e.target.value ? parseInt(e.target.value) : null })
                        }
                        className="input text-sm py-2 w-32"
                        placeholder="20"
                      />
                    </div>
                  )}

                  {isFullDay && (
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-2">
                        Tolerância de Intervalo (minutos)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="120"
                        value={formData.interval_tolerance_minutes || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            interval_tolerance_minutes: e.target.value ? parseInt(e.target.value) : null,
                          })
                        }
                        className="input text-sm py-2 w-32"
                        placeholder="0"
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingOverride(null);
                      }}
                      className="btn-secondary"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Horários Excepcionais Configurados</h3>

              {loading && overrides.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">Carregando...</div>
              ) : overrides.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  Nenhum horário excepcional configurado para este funcionário.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-neutral-200 rounded-lg">
                    <thead className="bg-gradient-to-r from-primary-500 to-primary-600 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Data</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Horários</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {overrides.map((override) => {
                        // Garantir que a data seja uma string válida antes de fazer parse
                        let dateStr = override.date;
                        if (override.date instanceof Date) {
                          const year = override.date.getFullYear();
                          const month = String(override.date.getMonth() + 1).padStart(2, '0');
                          const day = String(override.date.getDate()).padStart(2, '0');
                          dateStr = `${year}-${month}-${day}`;
                        } else if (typeof override.date !== 'string') {
                          dateStr = String(override.date).split('T')[0];
                        } else {
                          dateStr = override.date.split('T')[0]; // Garantir formato yyyy-MM-dd
                        }
                        
                        const dateObj = parseISO(dateStr);
                        const formattedDate = format(dateObj, "dd/MM/yyyy (EEEE)", { locale: ptBR });

                        let scheduleText = '';
                        if (override.shift_type === 'FULL_DAY') {
                          scheduleText = `${override.morning_start || '--'} - ${override.morning_end || '--'} / ${override.afternoon_start || '--'} - ${override.afternoon_end || '--'}`;
                        } else if (override.shift_type === 'MORNING_ONLY') {
                          scheduleText = `${override.morning_start || '--'} - ${override.afternoon_end || '--'}`;
                        } else if (override.shift_type === 'AFTERNOON_ONLY') {
                          scheduleText = `${override.afternoon_start || '--'} - ${override.afternoon_end || '--'}`;
                        }

                        return (
                          <tr key={override.id} className="hover:bg-neutral-50">
                            <td className="px-4 py-3 text-sm text-neutral-900 font-medium">
                              {formattedDate}
                            </td>
                            <td className="px-4 py-3 text-sm text-neutral-600">
                              {override.shift_type === 'FULL_DAY'
                                ? 'Jornada Completa'
                                : override.shift_type === 'MORNING_ONLY'
                                ? 'Turno Único Manhã'
                                : 'Turno Único Tarde'}
                            </td>
                            <td className="px-4 py-3 text-sm text-neutral-600">{scheduleText}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEdit(override)}
                                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDelete(override.employee_id, override.date)}
                                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                                >
                                  Remover
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

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
  );
}

