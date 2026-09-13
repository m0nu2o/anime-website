"use server";

import { searchAnime } from "@/lib/api";

export async function searchAnimeAction(query: string) {
  if (!query || query.trim().length < 2) return [];
  return await searchAnime(query, 8);
}
