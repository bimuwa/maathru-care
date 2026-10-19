export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogFields = Record<string, unknown>;

const levelRank: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const configuredLevel = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')).toLowerCase() as LogLevel;
const minimumLevel = levelRank[configuredLevel] ? configuredLevel : 'debug';

function errorFields(error: unknown) {
  if (!(error instanceof Error)) return { errorMessage: String(error) };
  return {
    errorName: error.name,
    errorMessage: error.message,
    ...(process.env.NODE_ENV !== 'production' && error.stack ? { stack: error.stack } : {}),
  };
}

function write(level: LogLevel, event: string, fields: LogFields = {}) {
  if (levelRank[level] < levelRank[minimumLevel]) return;
  const entry = { timestamp: new Date().toISOString(), level, event, ...fields };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (event: string, fields?: LogFields) => write('debug', event, fields),
  info: (event: string, fields?: LogFields) => write('info', event, fields),
  warn: (event: string, fields?: LogFields) => write('warn', event, fields),
  error: (event: string, error?: unknown, fields: LogFields = {}) => write('error', event, { ...fields, ...(error === undefined ? {} : errorFields(error)) }),
};
