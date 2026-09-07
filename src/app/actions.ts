"use server";

import { searchAnime } from "@/lib/api";

export async function searchAnimeAction(query: string) {
  if (!query || query.trim().length < 2) return [];
  try {
    return await searchAnime(query, 8);
  } catch (error) {
    console.error("Search action failed", error);
    return [];
  }
}
