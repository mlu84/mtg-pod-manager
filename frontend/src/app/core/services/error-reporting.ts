export type ErrorReport = {
  error: unknown;
  context: string;
  timestamp: string;
};

const ERROR_QUEUE_KEY = '__APP_ERROR_QUEUE__';

type ErrorQueue = ErrorReport[];

export function queueErrorReport(error: unknown, context: string): void {
  const queue = (globalThis as unknown as { [key: string]: ErrorQueue | undefined })[ERROR_QUEUE_KEY] ?? [];
  queue.push({
    error,
    context,
    timestamp: new Date().toISOString(),
  });
  (globalThis as unknown as { [key: string]: ErrorQueue })[ERROR_QUEUE_KEY] = queue;
}

export function consumeErrorQueue(): ErrorReport[] {
  const queue = (globalThis as unknown as { [key: string]: ErrorQueue | undefined })[ERROR_QUEUE_KEY] ?? [];
  (globalThis as unknown as { [key: string]: ErrorQueue })[ERROR_QUEUE_KEY] = [];
  return [...queue];
}
