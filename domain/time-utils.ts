/**
 * Utilitários puros para manipulação de tempo
 * Funções sem dependências externas, apenas lógica de domínio
 */

/**
 * Converte segundos para minutos usando floor (despreza segundos)
 * POLÍTICA ÚNICA: Sempre usar esta função para converter segundos para minutos
 */
export function toMinutesFloor(seconds: number): number {
  return Math.floor(seconds / 60);
}

/**
 * Calcula diferença em segundos entre duas datas
 * IMPORTANTE: Ignora segundos das batidas, calcula apenas com horas e minutos
 * Isso garante que 06:55:24 e 06:55:00 sejam tratados como 06:55
 */
export function calculateSecondsDifference(start: Date, end: Date): number {
  // Extrair apenas horas e minutos (ignorar segundos)
  const startHours = start.getHours();
  const startMinutes = start.getMinutes();
  const endHours = end.getHours();
  const endMinutes = end.getMinutes();
  
  // Calcular diferença em minutos
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;
  const diffMinutes = endTotalMinutes - startTotalMinutes;
  
  // Converter para segundos (multiplicar por 60)
  return diffMinutes * 60;
}

/**
 * Calcula diferença em minutos entre duas datas
 * Usa apenas horas e minutos (ignora segundos completamente)
 */
export function calculateMinutesDifference(start: Date, end: Date): number {
  const startHour = start.getHours();
  const startMinute = start.getMinutes();
  const endHour = end.getHours();
  const endMinute = end.getMinutes();
  
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  
  return endTotalMinutes - startTotalMinutes;
}

/**
 * Converte HH:mm para segundos do dia
 */
export function timeToSeconds(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 3600 + minutes * 60;
}














