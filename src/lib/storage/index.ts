export interface D1Adapter {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface R2Adapter {
  put(key: string, value: ReadableStream | ArrayBuffer): Promise<void>;
  get(key: string): Promise<ReadableStream | null>;
}
