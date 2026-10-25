import { NextResponse } from "next/server";
import { access, constants } from "node:fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function executable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Report local media-tool availability without exposing secrets or invoking FFmpeg. */
export async function GET() {
  const [ffmpeg, ffprobe] = await Promise.all([
    executable("/usr/bin/ffmpeg"),
    executable("/usr/bin/ffprobe"),
  ]);
  const enabled = process.env.ENABLE_MKV_HLS === "true";
  return NextResponse.json(
    {
      ffmpegBundled: ffmpeg,
      ffprobeBundled: ffprobe,
      mkvHlsEnabled: enabled,
      readyForMkvProcessing: ffmpeg && ffprobe && enabled,
      note: "Checks installed tools and configuration only, not remote playback.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
