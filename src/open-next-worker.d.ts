declare module "../.open-next/worker.js" {
  const worker: {
    fetch: (
      request: Request,
      env: CloudflareEnv,
      ctx: ExecutionContext
    ) => Promise<Response>;
  };

  export const BucketCachePurge: unknown;
  export const DOQueueHandler: unknown;
  export const DOShardedTagCache: unknown;

  export default worker;
}
