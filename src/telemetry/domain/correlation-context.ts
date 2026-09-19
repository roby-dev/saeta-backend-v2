import { AsyncLocalStorage } from 'node:async_hooks';

export interface CorrelationData {
  traceId: string;
  userId?: string;
}

const storage = new AsyncLocalStorage<CorrelationData>();

export const CorrelationContext = {
  get(): CorrelationData | undefined {
    return storage.getStore();
  },

  getTraceId(): string | undefined {
    return storage.getStore()?.traceId;
  },

  run<T>(data: CorrelationData, callback: () => T): T {
    return storage.run(data, callback);
  },
};
