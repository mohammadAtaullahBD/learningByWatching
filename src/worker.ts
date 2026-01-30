// @ts-ignore - OpenNext worker file is generated at build time.
import openNextWorker, { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "../.open-next/worker.js";
import { handleSubtitleQueue } from "./lib/subtitles/queue";
import type { SubtitleUploadJob } from "./lib/subtitles/queue";

export { BucketCachePurge, DOQueueHandler, DOShardedTagCache };

export default {
  fetch: openNextWorker.fetch,
  async queue(batch: MessageBatch, env: CloudflareEnv, ctx: ExecutionContext) {
    ctx.waitUntil(
      handleSubtitleQueue(
        batch as MessageBatch<SubtitleUploadJob>,
        env as CloudflareEnv & {
          SUBTITLE_BUCKET: R2Bucket;
          VOCAB_DB: D1Database;
        },
      ),
    );
  },
};
