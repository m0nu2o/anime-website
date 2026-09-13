import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const targetUrl = "https://reanime.to/api/flix/178789/1";
  const workerUrl = `https://nextgen-anime-proxy.bold-microraptor.workers.dev?url=${encodeURIComponent(targetUrl)}`;

  const diagnostics: Record<string, unknown> = {};

  try {
    const start = Date.now();
    const res = await fetch(workerUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    diagnostics.worker = {
      status: res.status,
      statusText: res.statusText,
      durationMs: Date.now() - start,
      contentType: res.headers.get("content-type"),
    };
    const text = await res.text();
    diagnostics.workerBodySample = text.slice(0, 300);
    try {
      diagnostics.workerJson = JSON.parse(text);
    } catch {
      diagnostics.workerJsonError = "Failed to parse JSON";
    }
  } catch (err: unknown) {
    diagnostics.workerError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(diagnostics);
}
