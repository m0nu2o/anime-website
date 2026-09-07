import { redirect } from "next/navigation";

export default async function WatchAnimeDefaultPage({
  params,
}: {
  params: Promise<{ animeId: string }>;
}) {
  const resolved = await params;
  redirect(`/watch/${resolved.animeId}/1`);
}
