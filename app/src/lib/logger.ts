interface LogContext {
  requestId?: string;
  route?: string;
  method?: string;
}
function details(cause: unknown) {
  if (!(cause instanceof Error)) return undefined;
  const code =
    'code' in cause && typeof cause.code === 'string' ? cause.code : undefined;
  const message =
    cause.name === 'ZodError'
      ? 'Request validation failed'
      : 'type' in cause && cause.type === 'entity.parse.failed'
        ? 'Malformed JSON body'
        : cause.message
            .replace(/['"][^'"]*['"]/g, '[redacted]')
            .replace(/[\w.+-]+@[\w.-]+/g, '[email]')
            .replace(/https?:\/\/\S+/g, '[url]')
            .replace(
              /((?:password|token|secret|authorization|cookie)\s*[:=]\s*)\S+/gi,
              '$1[redacted]',
            )
            .slice(0, 200);
  return {
    name: cause.name,
    code,
    message,
    stack: cause.stack
      ?.split('\n')
      .filter((line) => /^\s+at /.test(line))
      .join('\n'),
  };
}
function write(
  level: string,
  event: string,
  cause?: unknown,
  context?: LogContext,
) {
  process.stderr.write(
    JSON.stringify({
      level,
      event,
      time: new Date().toISOString(),
      ...context,
      error: details(cause),
    }) + '\n',
  );
}
export const logger = {
  info(event: string) {
    write('info', event);
  },
  error(event: string, cause?: unknown, context?: LogContext) {
    write('error', event, cause, context);
  },
};
