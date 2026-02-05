import { Injectable } from '@nestjs/common';

@Injectable()
export class TranscriptsService {
  private transcripts = new Map<string, string[]>();

  addCaption(meetingId: string, text: string) {
    if (!meetingId || !text) return;
    const list = this.transcripts.get(meetingId) ?? [];
    const last = list[list.length - 1];
    if (text !== last) {
      list.push(text);
      if (list.length > 5000) {
        list.shift();
      }
      this.transcripts.set(meetingId, list);
    }
  }

  getCaptions(meetingId: string): string[] {
    return this.transcripts.get(meetingId) ?? [];
  }

  clear(meetingId: string) {
    this.transcripts.delete(meetingId);
  }

  async summarize(meetingId: string): Promise<string> {
    const captions = this.getCaptions(meetingId);
    const text = this.buildTranscriptText(captions);
    const ollamaSummary = await this.tryOllamaSummary(text);
    if (ollamaSummary) return ollamaSummary;
    return this.summarizeCaptions(captions);
  }

  summarizeCaptions(captions: string[]): string {
    const text = captions.join(' ');
    if (!text.trim()) return 'No captions captured yet.';

    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (sentences.length <= 3) {
      return sentences.join(' ');
    }

    const stopwords = new Set([
      'the','a','an','and','or','but','if','then','so','because','as','of','to','in','on','for','with','at','by','from',
      'is','are','was','were','be','been','being','it','this','that','these','those','i','you','we','they','he','she','them',
      'my','your','our','their','his','her','its','not','do','does','did','will','would','can','could','should','about',
    ]);

    const wordFreq = new Map<string, number>();
    for (const sentence of sentences) {
      const words = sentence.toLowerCase().match(/[a-z0-9']+/g) ?? [];
      for (const word of words) {
        if (stopwords.has(word)) continue;
        wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
      }
    }

    const scored = sentences.map((sentence) => {
      const words = sentence.toLowerCase().match(/[a-z0-9']+/g) ?? [];
      let score = 0;
      for (const word of words) {
        if (!stopwords.has(word)) {
          score += wordFreq.get(word) ?? 0;
        }
      }
      return { sentence, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 3).map((s) => s.sentence);
    return top.join(' ');
  }

  private buildTranscriptText(captions: string[]): string {
    const joined = captions.join(' ');
    const maxChars = 12000;
    if (joined.length <= maxChars) return joined;
    return joined.slice(joined.length - maxChars);
  }

  private async tryOllamaSummary(text: string): Promise<string | null> {
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
            'Summarize the following transcript in 3-5 concise sentences. Focus on main points and decisions.\n\n' +
            text,
          stream: false,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const data = (await res.json()) as { response?: string };
      const summary = data?.response?.trim();
      return summary || null;
    } catch {
      return null;
    }
  }
}
