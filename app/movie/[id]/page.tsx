import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";

// Keep existing shared episode links working without a quality-selection stop.
export default async function EpisodeDetail({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ file?: string | string[] }>;
}) {
  const { id } = await params;
  const { file } = await searchParams;
  const selected = typeof file === "string" && /^\d+$/.test(file) ? `?file=${file}` : "";
  redirect(`/watch/${encodeURIComponent(id)}${selected}`);
}
