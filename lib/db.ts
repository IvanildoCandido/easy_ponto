/**
 * Arquivo de compatibilidade - reexporta do novo local
 * @deprecated Use '@/infrastructure/database' diretamente
 */
export { query, queryOne, pool, default } from '../infrastructure/database';
