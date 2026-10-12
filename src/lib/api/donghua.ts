/**
 * Isolated Donghua Resolution Layer
 * Maps Chinese, English, Romanized, and verified alternate titles to canonical AniList & MAL IDs.
 * Zero impact on standard anime pipeline.
 */

export interface DonghuaCanonicalEntry {
  canonicalTitle: string;
  englishTitle: string;
  romajiTitle: string;
  nativeTitle: string;
  anilistId: number;
  malId?: number;
  kitsuId?: number;
  season?: number;
  format: "ONA" | "TV" | "MOVIE" | "SPECIAL";
  totalEpisodes?: number;
  synonyms: string[];
}

export const VERIFIED_DONGHUA_CATALOG: DonghuaCanonicalEntry[] = [
  // 1. Link Click (时光代理人)
  {
    canonicalTitle: "Link Click",
    englishTitle: "Link Click",
    romajiTitle: "Shiguang Dailiren",
    nativeTitle: "时光代理人",
    anilistId: 126403,
    malId: 44074,
    kitsuId: 44503,
    season: 1,
    format: "ONA",
    totalEpisodes: 11,
    synonyms: ["Time Agent", "CLICK", "Shiguang Daili Ren", "时光代理人 第一季"],
  },
  {
    canonicalTitle: "Link Click Season 2",
    englishTitle: "Link Click Season 2",
    romajiTitle: "Shiguang Dailiren II",
    nativeTitle: "时光代理人 第二季",
    anilistId: 139194,
    malId: 49796,
    kitsuId: 45041,
    season: 2,
    format: "ONA",
    totalEpisodes: 12,
    synonyms: ["Link Click 2", "Shiguang Dailiren 2", "Time Agent 2", "时光代理人2"],
  },

  // 2. Soul Land (斗罗大陆)
  {
    canonicalTitle: "Soul Land",
    englishTitle: "Soul Land",
    romajiTitle: "Douluo Dalu",
    nativeTitle: "斗罗大陆",
    anilistId: 101920,
    malId: 37150,
    kitsuId: 41004,
    season: 1,
    format: "ONA",
    totalEpisodes: 26,
    synonyms: ["Combat Continent", "Dunia Roh", "Dou Luo Da Lu"],
  },
  {
    canonicalTitle: "Soul Land 2",
    englishTitle: "Soul Land 2: The Peerless Tang Clan",
    romajiTitle: "Douluo Dalu II: Jueshi Tangmen",
    nativeTitle: "斗罗大陆2 绝世唐门",
    anilistId: 153406,
    malId: 53198,
    season: 2,
    format: "ONA",
    synonyms: ["Soul Land Season 2", "The Peerless Tang Clan", "斗罗大陆 第二季"],
  },

  // 3. Battle Through the Heavens (斗破苍穹)
  {
    canonicalTitle: "Battle Through the Heavens",
    englishTitle: "Fights Break Sphere",
    romajiTitle: "Dou Po Cangqiong",
    nativeTitle: "斗破苍穹",
    anilistId: 102464,
    malId: 36491,
    kitsuId: 14116,
    season: 1,
    format: "ONA",
    totalEpisodes: 12,
    synonyms: ["Fights Break Sphere S1", "Battle Through the Heavens 1", "Doupo Cangqiong"],
  },
  {
    canonicalTitle: "Battle Through the Heavens Season 2",
    englishTitle: "Fights Break Sphere S2",
    romajiTitle: "Dou Po Cangqiong 2",
    nativeTitle: "斗破苍穹 第二季",
    anilistId: 102463,
    malId: 37176,
    kitsuId: 41007,
    season: 2,
    format: "ONA",
    totalEpisodes: 12,
    synonyms: ["Battle Through the Heavens 2", "Fights Break Sphere 2", "Doupo Cangqiong 2"],
  },
  {
    canonicalTitle: "Battle Through the Heavens Season 3",
    englishTitle: "Fights Break Sphere S3",
    romajiTitle: "Dou Po Cangqiong 3",
    nativeTitle: "斗破苍穹 第3季",
    anilistId: 104922,
    malId: 38436,
    kitsuId: 41846,
    season: 3,
    format: "ONA",
    totalEpisodes: 12,
    synonyms: ["Battle Through the Heavens 3", "Fights Break Sphere 3", "Doupo Cangqiong 3"],
  },

  // 4. A Will Eternal (一念永恒)
  {
    canonicalTitle: "A Will Eternal",
    englishTitle: "A Will Eternal",
    romajiTitle: "Yi Nian Yongheng",
    nativeTitle: "一念永恒",
    anilistId: 110595,
    malId: 41923,
    kitsuId: 43278,
    season: 1,
    format: "ONA",
    totalEpisodes: 52,
    synonyms: ["Yi Nian Yong Heng", "A Will Eternal Season 1", "一念永恒 第一季"],
  },
  {
    canonicalTitle: "A Will Eternal Season 2",
    englishTitle: "A Will Eternal 2",
    romajiTitle: "Yi Nian Yongheng: Chuancheng Pian",
    nativeTitle: "一念永恒 传承篇",
    anilistId: 137742,
    malId: 49574,
    season: 2,
    format: "ONA",
    totalEpisodes: 20,
    synonyms: ["A Will Eternal Season 2", "Yi Nian Yongheng 2", "一念永恒 第二季"],
  },

  // 5. Perfect World (完美世界)
  {
    canonicalTitle: "Perfect World",
    englishTitle: "Perfect World",
    romajiTitle: "Wanmei Shijie",
    nativeTitle: "完美世界",
    anilistId: 120218,
    malId: 47405,
    kitsuId: 44400,
    season: 1,
    format: "ONA",
    totalEpisodes: 26,
    synonyms: ["Wan Mei Shi Jie", "Dunia Sempurna", "完美世界 第一季"],
  },

  // 6. The King's Avatar (全职高手)
  {
    canonicalTitle: "The King's Avatar",
    englishTitle: "The King's Avatar",
    romajiTitle: "Quanzhi Gaoshou",
    nativeTitle: "全职高手",
    anilistId: 98861,
    malId: 33926,
    kitsuId: 12845,
    season: 1,
    format: "ONA",
    totalEpisodes: 12,
    synonyms: ["Full-Time Expert", "Master of Skills", "Quan Zhi Gao Shou", "全职高手 第一季"],
  },
  {
    canonicalTitle: "The King's Avatar Season 2",
    englishTitle: "The King's Avatar S2",
    romajiTitle: "Quanzhi Gaoshou 2",
    nativeTitle: "全职高手2",
    anilistId: 102997,
    malId: 37932,
    season: 2,
    format: "ONA",
    totalEpisodes: 12,
    synonyms: ["The King's Avatar 2", "Full-Time Expert 2", "Quanzhi Gaoshou Season 2"],
  },

  // 7. Swallowed Star (吞噬星空)
  {
    canonicalTitle: "Swallowed Star",
    englishTitle: "Swallowed Star",
    romajiTitle: "Tunshi Xingkong",
    nativeTitle: "吞噬星空",
    anilistId: 117012,
    malId: 42617,
    format: "ONA",
    synonyms: ["Tun Shi Xing Kong", "吞噬星空 第一季"],
  },

  // 8. Renegade Immortal (仙逆)
  {
    canonicalTitle: "Renegade Immortal",
    englishTitle: "Renegade Immortal",
    romajiTitle: "Xian Ni",
    nativeTitle: "仙逆",
    anilistId: 137653,
    malId: 54930,
    format: "ONA",
    synonyms: ["Xian Ni", "Tie Xue Ni Tian"],
  },

  // 9. Throne of Seal (神印王座)
  {
    canonicalTitle: "Throne of Seal",
    englishTitle: "Throne of Seal",
    romajiTitle: "Shen Yin Wangzuo",
    nativeTitle: "神印王座",
    anilistId: 146409,
    malId: 51745,
    format: "ONA",
    synonyms: ["Sealed Divine Throne", "Shen Yin Wang Zuo"],
  },

  // 10. Record of a Mortal's Journey to Immortality (凡人修仙传)
  {
    canonicalTitle: "A Record of a Mortal's Journey to Immortality",
    englishTitle: "A Record of a Mortal's Journey to Immortality",
    romajiTitle: "Fanren Xiu Xian Zhuan",
    nativeTitle: "凡人修仙传",
    anilistId: 115844,
    malId: 42080,
    format: "ONA",
    synonyms: ["Mortal's Journey", "Fanren Xiu Xian Chuan"],
  },

  // 11. Grandmaster of Demonic Cultivation (魔道祖师)
  {
    canonicalTitle: "The Founder of Diabolism",
    englishTitle: "Grandmaster of Demonic Cultivation",
    romajiTitle: "Mo Dao Zu Shi",
    nativeTitle: "魔道祖师",
    anilistId: 101972,
    malId: 37208,
    season: 1,
    format: "ONA",
    totalEpisodes: 15,
    synonyms: ["Mo Dao Zu Shi", "The Untamed Animation", "魔道祖师 第一季"],
  },

  // 12. Heaven Official's Blessing (天官赐福)
  {
    canonicalTitle: "Heaven Official's Blessing",
    englishTitle: "Heaven Official's Blessing",
    romajiTitle: "Tian Guan Ci Fu",
    nativeTitle: "天官赐福",
    anilistId: 113265,
    malId: 40269,
    season: 1,
    format: "ONA",
    totalEpisodes: 11,
    synonyms: ["TGCF", "Heaven Officials Blessing", "天官赐福 第一季"],
  },
  {
    canonicalTitle: "Heaven Official's Blessing Season 2",
    englishTitle: "Heaven Official's Blessing S2",
    romajiTitle: "Tian Guan Ci Fu Er",
    nativeTitle: "天官赐福 贰",
    anilistId: 128549,
    malId: 44265,
    season: 2,
    format: "ONA",
    totalEpisodes: 12,
    synonyms: ["Heaven Official's Blessing 2", "TGCF 2", "天官赐福 第二季"],
  },

  // 13. Scissor Seven (刺客伍六七)
  {
    canonicalTitle: "Scissor Seven",
    englishTitle: "Scissor Seven",
    romajiTitle: "Cike Wu Liuqi",
    nativeTitle: "刺客伍六七",
    anilistId: 107912,
    malId: 38409,
    season: 1,
    format: "ONA",
    totalEpisodes: 14,
    synonyms: ["Killer 7", "Assassin Seven"],
  },

  // 14. Daily Life of the Immortal King (仙王的日常生活)
  {
    canonicalTitle: "The Daily Life of the Immortal King",
    englishTitle: "The Daily Life of the Immortal King",
    romajiTitle: "Xian Wang de Richang Shenghuo",
    nativeTitle: "仙王的日常生活",
    anilistId: 114121,
    malId: 41094,
    season: 1,
    format: "ONA",
    totalEpisodes: 15,
    synonyms: ["Immortal King", "Xian Wang de Richang Shenghuo"],
  },
  {
    canonicalTitle: "The Daily Life of the Immortal King Season 2",
    englishTitle: "The Daily Life of the Immortal King 2",
    romajiTitle: "Xian Wang de Richang Shenghuo 2",
    nativeTitle: "仙王的日常生活 第二季",
    anilistId: 124157,
    malId: 44234,
    season: 2,
    format: "ONA",
    totalEpisodes: 12,
    synonyms: ["Immortal King 2", "The Daily Life of the Immortal King Season 2"],
  },

  // 15. Martial Universe (武动乾坤)
  {
    canonicalTitle: "Martial Universe",
    englishTitle: "Martial Universe",
    romajiTitle: "Wu Dong Qian Kun",
    nativeTitle: "武动乾坤",
    anilistId: 107419,
    malId: 39158,
    season: 1,
    format: "ONA",
    totalEpisodes: 12,
    synonyms: ["Wu Dong Qiankun"],
  },

  // 16. Fog Hill of Five Elements (雾山五行)
  {
    canonicalTitle: "Fog Hill of Five Elements",
    englishTitle: "Fog Hill of Five Elements",
    romajiTitle: "Wu Shan Wu Xing",
    nativeTitle: "雾山五行",
    anilistId: 106139,
    malId: 39393,
    season: 1,
    format: "ONA",
    totalEpisodes: 3,
    synonyms: ["Five Elements Fog Hill"],
  },
];

function normalizeMatchText(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * High-precision Donghua matcher.
 * Matches by exact AniList ID, MAL ID, Kitsu ID, Chinese characters, English, Pinyin, or verified synonyms.
 */
export function matchDonghua(input: {
  animeId?: string;
  anilistId?: number | string;
  malId?: number | string;
  title?: string;
}): DonghuaCanonicalEntry | null {
  const numAnilist = input.anilistId ? parseInt(String(input.anilistId).replace(/^anilist-/, ""), 10) : undefined;
  const numMal = input.malId ? parseInt(String(input.malId).replace(/^mal-/, ""), 10) : undefined;

  // 1. Direct AniList ID match
  if (numAnilist && !isNaN(numAnilist)) {
    const found = VERIFIED_DONGHUA_CATALOG.find((d) => d.anilistId === numAnilist);
    if (found) return found;
  }

  // 2. Direct MAL ID match
  if (numMal && !isNaN(numMal)) {
    const found = VERIFIED_DONGHUA_CATALOG.find((d) => d.malId === numMal);
    if (found) return found;
  }

  // 3. String animeId matching
  if (input.animeId) {
    if (input.animeId.startsWith("anilist-")) {
      const aId = parseInt(input.animeId.replace("anilist-", ""), 10);
      const found = VERIFIED_DONGHUA_CATALOG.find((d) => d.anilistId === aId);
      if (found) return found;
    } else if (input.animeId.startsWith("mal-")) {
      const mId = parseInt(input.animeId.replace("mal-", ""), 10);
      const found = VERIFIED_DONGHUA_CATALOG.find((d) => d.malId === mId);
      if (found) return found;
    } else if (input.animeId.startsWith("kitsu-")) {
      const kId = parseInt(input.animeId.replace("kitsu-", ""), 10);
      const found = VERIFIED_DONGHUA_CATALOG.find((d) => d.kitsuId === kId);
      if (found) return found;
    }
  }

  // 4. Title / Synonym matching
  if (input.title) {
    const rawClean = input.title.trim();
    const norm = normalizeMatchText(rawClean);

    // Exact check on native Chinese title (substring or equality)
    for (const entry of VERIFIED_DONGHUA_CATALOG) {
      if (rawClean.includes(entry.nativeTitle) || entry.nativeTitle.includes(rawClean)) {
        return entry;
      }
    }

    // Normalized match on English, Romaji, and Synonyms
    for (const entry of VERIFIED_DONGHUA_CATALOG) {
      const candidates = [
        entry.canonicalTitle,
        entry.englishTitle,
        entry.romajiTitle,
        ...entry.synonyms,
      ].map(normalizeMatchText);

      if (candidates.some((c) => c === norm || norm.includes(c) || c.includes(norm))) {
        return entry;
      }
    }
  }

  return null;
}

/**
 * Searches AniList dynamically with optimized parameters for Donghua.
 * Prioritizes ONA/TV formats, Popularity descending, and Chinese origin.
 */
export async function dynamicSearchDonghuaOnAniList(query: string): Promise<number | null> {
  const clean = query.trim();
  if (!clean) return null;

  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query ($search: String) {
          Page(page: 1, perPage: 5) {
            media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
              id
              idMal
              format
              countryOfOrigin
              status
              episodes
              title {
                romaji
                english
                native
              }
            }
          }
        }`,
        variables: { search: clean },
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const list = json?.data?.Page?.media;
    if (!Array.isArray(list) || list.length === 0) return null;

    // Prefer entries with countryOfOrigin === "CN" or non-short formats
    const cnMatch = list.find((m) => m.countryOfOrigin === "CN" && m.format !== "MUSIC");
    if (cnMatch) return cnMatch.id;

    const mainMatch = list.find((m) => m.format === "ONA" || m.format === "TV");
    if (mainMatch) return mainMatch.id;

    return list[0].id;
  } catch {
    return null;
  }
}
