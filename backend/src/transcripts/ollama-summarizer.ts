type OllamaGenerateResponse = { response?: string };

export async function tryOllamaMarkdownSummary(
  text: string,
): Promise<string | null> {
  if (process.env.OLLAMA_DISABLE === '1') return null;

  const model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
  const baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  if (!text.trim()) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt:
          'You are a meeting notes assistant.\n' +
          'The transcript comes from live captions and may contain duplicates or partial repeats; ignore those.\n' +
          'Return Markdown with these sections:\n' +
          '## TL;DR (3-5 bullets)\n' +
          '## Key Points (bullets)\n' +
          '## Decisions (bullets, if any)\n' +
          '## Action Items (bullets with owner if mentioned)\n' +
          'Keep it concise. Do not invent facts.\n\n' +
          'Transcript:\n' +
          text,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = (await res.json()) as OllamaGenerateResponse;
    const summary = data?.response?.trim();
    return summary || null;
  } catch {
    return null;
  }
}
