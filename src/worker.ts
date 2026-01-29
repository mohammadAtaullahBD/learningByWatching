// @ts-expect-error - Generated at build time by OpenNext.
import openNextWorker, {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
} from "../.open-next/worker.js";
import { handleSubtitleQueue } from "./lib/subtitles/queue";

export { BucketCachePurge, DOQueueHandler, DOShardedTagCache };

export default {
  fetch: openNextWorker.fetch,
  async queue(batch: MessageBatch, env: CloudflareEnv, ctx: ExecutionContext) {
    ctx.waitUntil(handleSubtitleQueue(batch as MessageBatch, env));
  },
};
