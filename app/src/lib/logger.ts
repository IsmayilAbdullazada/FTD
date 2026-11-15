function write(level: string, event: string): void {
  process.stderr.write(
    JSON.stringify({ level, event, time: new Date().toISOString() }) + '\n',
  );
}
export const logger = {
  info(event: string): void {
    write('info', event);
  },
  error(event: string, _cause?: unknown): void {
    write('error', event);
  },
};
