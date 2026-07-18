/* eslint-disable no-console --
 * This module is the single sanctioned wrapper around `console`. The rest of
 * the codebase must use `logger` instead of `console.*` (enforced by the
 * `no-console` ESLint rule), so all logging flows through one place.
 */

type LogMeta = Record<string, unknown>;
type LogLevel = 'info' | 'warn' | 'error';

function emit(level: LogLevel, message: string, meta?: LogMeta): void {
  const entry = { level, message, ...(meta ? { meta } : {}) };
  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export const logger = {
  info: (message: string, meta?: LogMeta): void => emit('info', message, meta),
  warn: (message: string, meta?: LogMeta): void => emit('warn', message, meta),
  error: (message: string, meta?: LogMeta): void => emit('error', message, meta),
};
