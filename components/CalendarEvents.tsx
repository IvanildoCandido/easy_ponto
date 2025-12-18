'use client';

import { useState, useEffect } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import type { CalendarEvent } from '@/lib/types';

export default function CalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formData, setFormData] = useState<Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    event_type: 'FERIADO',
    description: '',
    applies_to_all_employees: true,
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    const initializeMonth = async () => {
      // Primeiro criar DSRs automaticamente para domingos
      try {
        const monthDate = parseISO(selectedMonth + '-01');
        const startDate = startOfMonth(monthDate);
        const endDate = endOfMonth(monthDate);
        
        // Buscar domingos do mês
        const sundays: string[] = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          if (currentDate.getDay() === 0) { // 0 = Domingo
            sundays.push(format(currentDate, 'yyyy-MM-dd'));
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Para cada domingo, criar DSR se não existir
        for (const sunday of sundays) {
          try {
            const response = await fetch('/api/calendar-events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                date: sunday,
                event_type: 'DSR',
                description: 'DSR - Descanso Semanal Remunerado',
                applies_to_all_employees: true,
              }),
            });

            // Ignorar erro 409 (já existe)
            if (!response.ok && response.status !== 409) {
              const error = await response.json();
              console.warn(`Erro ao criar DSR para ${sunday}:`, error.error);
            }
          } catch (error) {
            // Silenciar erros de rede
          }
        }
      } catch (error) {
        // Silenciar erros
      }

      // Depois carregar eventos
      loadEvents();
    };

    initializeMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const startDate = format(startOfMonth(parseISO(selectedMonth + '-01')), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(parseISO(selectedMonth + '-01')), 'yyyy-MM-dd');
      
      const response = await fetch(`/api/calendar-events?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error('Erro ao carregar eventos');
      
      const data = await response.json();
      setEvents(data);
    } catch (error: any) {
      console.error('Erro ao carregar eventos:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar eventos do calendário' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      event_type: 'FERIADO',
      description: '',
      applies_to_all_employees: true,
    });
    setEditingEvent(null);
    setShowForm(true);
  };

  const handleEdit = (event: CalendarEvent) => {
    setFormData({
      date: event.date,
      event_type: event.event_type,
      description: event.description || '',
      applies_to_all_employees: event.applies_to_all_employees !== false,
    });
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover este evento?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/calendar-events?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao remover evento');
      }

      setMessage({ type: 'success', text: 'Evento removido com sucesso!' });
      loadEvents();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao remover evento' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      
      // Apenas feriados podem ser adicionados manualmente (DSRs são automáticos)
      if (formData.event_type !== 'FERIADO') {
        throw new Error('Apenas feriados podem ser adicionados manualmente. DSRs são criados automaticamente para domingos.');
      }

      // Se está editando, incluir o ID no body
      const body: any = { ...formData };
      if (editingEvent?.id) {
        body.id = editingEvent.id;
      }

      const response = await fetch('/api/calendar-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar evento');
      }

      setMessage({
        type: 'success',
        text: editingEvent ? 'Evento atualizado!' : 'Evento criado com sucesso!',
      });
      setShowForm(false);
      setEditingEvent(null);
      loadEvents();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar evento' });
    } finally {
      setLoading(false);
    }
  };

  // Agrupar eventos por tipo
  const feriados = events.filter(e => e.event_type === 'FERIADO');
  const dsrs = events.filter(e => e.event_type === 'DSR');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Feriados e DSR</h2>
        <p className="text-neutral-600">
          Configure feriados do mês e DSR (Descanso Semanal Remunerado) que se aplicam a todos os funcionários
        </p>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <label className="block text-sm font-semibold text-neutral-700">
          Mês:
        </label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="input"
        />
        <button
          onClick={() => setSelectedMonth(format(new Date(), 'yyyy-MM'))}
          className="btn-secondary text-sm"
        >
          Mês Atual
        </button>
      </div>

      {!showForm && (
        <>
          <div className="flex justify-end">
            <button onClick={handleAddNew} className="btn-primary">
              + Adicionar Feriado
            </button>
          </div>

          <div className="space-y-6">
            {/* Feriados */}
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Feriados ({feriados.length})</h3>

              {loading && feriados.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">Carregando...</div>
              ) : feriados.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  Nenhum feriado configurado para este mês.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-neutral-200 rounded-lg">
                    <thead className="bg-gradient-to-r from-primary-500 to-primary-600 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Data</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Descrição</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {feriados.map((event) => {
                        const dateObj = parseISO(event.date);
                        const formattedDate = format(dateObj, "dd/MM/yyyy (EEEE)", { locale: ptBR });

                        return (
                          <tr key={event.id} className="hover:bg-neutral-50">
                            <td className="px-4 py-3 text-sm text-neutral-900 font-medium">
                              {formattedDate}
                            </td>
                            <td className="px-4 py-3 text-sm text-neutral-600">
                              {event.description || 'Feriado'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEdit(event)}
                                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => event.id && handleDelete(event.id)}
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

            {/* DSR */}
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">DSR - Descanso Semanal Remunerado ({dsrs.length})</h3>

              {loading && dsrs.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">Carregando...</div>
              ) : dsrs.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  Nenhum DSR configurado para este mês.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-neutral-200 rounded-lg">
                    <thead className="bg-gradient-to-r from-primary-500 to-primary-600 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Data (Domingo)</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Descrição</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {dsrs.map((event) => {
                        const dateObj = parseISO(event.date);
                        const formattedDate = format(dateObj, "dd/MM/yyyy (EEEE)", { locale: ptBR });

                        return (
                          <tr key={event.id} className="hover:bg-neutral-50">
                            <td className="px-4 py-3 text-sm text-neutral-900 font-medium">
                              {formattedDate}
                            </td>
                            <td className="px-4 py-3 text-sm text-neutral-600">
                              {event.description || 'DSR'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="text-xs text-neutral-400 italic">
                                Automático (apenas visualização)
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showForm && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            {editingEvent ? 'Editar Feriado' : 'Adicionar Feriado'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">Tipo de Evento</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="FERIADO"
                    checked={formData.event_type === 'FERIADO'}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value as 'FERIADO' | 'DSR' })}
                    className="mr-2"
                  />
                  Feriado
                </label>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                Nota: DSRs são criados automaticamente para todos os domingos do mês
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">Data</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">Descrição</label>
              <input
                type="text"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
                className="input"
                placeholder={formData.event_type === 'FERIADO' ? 'Ex: Natal, Ano Novo...' : 'Ex: DSR - Domingo'}
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingEvent(null);
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
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
  );
}

