import { getCloudflareContext } from "@opennextjs/cloudflare";

const allowedExtensions = new Set(["vtt", "srt", "txt"]);

const getExtension = (fileName: string): string | null => {
  const parts = fileName.split(".");
  if (parts.length < 2) return null;
  return parts.at(-1)?.toLowerCase() ?? null;
};

const contentTypeForExtension = (extension: string): string => {
  switch (extension) {
    case "vtt":
      return "text/vtt";
    case "srt":
      return "application/x-subrip";
    default:
      return "text/plain";
  }
};

type SubtitleUploadJob = {
  key: string;
  contentId: string;
  episodeId: string;
  fileName: string;
  contentType: string;
};

type SubtitleEnv = CloudflareEnv & {
  SUBTITLE_BUCKET: R2Bucket;
  SUBTITLE_QUEUE: Queue<SubtitleUploadJob>;
  VOCAB_DB?: D1Database;
};

export async function POST(request: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true });
  const { SUBTITLE_BUCKET, SUBTITLE_QUEUE, VOCAB_DB } = env as SubtitleEnv;

  if (!SUBTITLE_BUCKET || !SUBTITLE_QUEUE) {
    return Response.json({ error: "Subtitle storage not configured" }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const contentId = formData.get("contentId");
  const episodeId = formData.get("episodeId");

  if (!(file instanceof File)) {
    return Response.json({ error: "Missing subtitle file" }, { status: 400 });
  }

  if (typeof contentId !== "string" || typeof episodeId !== "string") {
    return Response.json({ error: "Missing contentId or episodeId" }, { status: 400 });
  }

  const extension = getExtension(file.name);
  if (!extension || !allowedExtensions.has(extension)) {
    return Response.json(
      { error: "Only .vtt, .srt, or .txt subtitle files are supported" },
      { status: 400 },
    );
  }

  const contentType = file.type || contentTypeForExtension(extension);
  const storageKey = `subtitles/${contentId}/${episodeId}.${extension}`;

  await SUBTITLE_BUCKET.put(storageKey, await file.arrayBuffer(), {
    httpMetadata: {
      contentType,
    },
  });

  const job: SubtitleUploadJob = {
    key: storageKey,
    contentId,
    episodeId,
    fileName: file.name,
    contentType,
  };

  if (VOCAB_DB) {
    const now = new Date().toISOString();
    await VOCAB_DB.prepare(
      `INSERT INTO subtitle_files (
        content_id,
        episode_id,
        r2_key,
        file_name,
        file_type,
        status,
        uploaded_at,
        processed_at,
        sentence_count,
        term_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(content_id, episode_id) DO UPDATE SET
        r2_key = excluded.r2_key,
        file_name = excluded.file_name,
        file_type = excluded.file_type,
        status = excluded.status,
        uploaded_at = excluded.uploaded_at`,
    )
      .bind(
        contentId,
        episodeId,
        storageKey,
        file.name,
        contentType,
        "queued",
        now,
        null,
        0,
        0,
      )
      .run();
  }

  await SUBTITLE_QUEUE.send(job);

  return Response.json({ ok: true, key: storageKey });
}
