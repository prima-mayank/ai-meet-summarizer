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

  getStats(meetingId: string): { meetingId: string; count: number; lastCaption: string } {
    const captions = this.getCaptions(meetingId);
    return {
      meetingId,
      count: captions.length,
      lastCaption: captions.length > 0 ? captions[captions.length - 1] : '',
    };
  }

  clear(meetingId: string) {
    this.transcripts.delete(meetingId);
  }

  async summarize(meetingId: string): Promise<string> {
    const captions = this.getCaptions(meetingId);
    const text = this.buildTranscriptText(captions);
    const ollamaSummary = await this.tryOllamaSummary(text);
    if (ollamaSummary) return ollamaSummary;
    return this.summarizeCaptionsMarkdown(captions);
  }

  private summarizeCaptionsMarkdown(captions: string[]): string {
    const text = captions.join(' ');
    if (!text.trim()) return '## TL;DR\n- No captions captured yet.\n';

    const sentences = text
      .split(/(?<=[.!?\u0964])\s+|\n+/u)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const pickTopSentences = (max: number) => {
      if (sentences.length <= max) return sentences.map((s, idx) => ({ idx, sentence: s }));

      const stopwords = new Set([
        'the',
        'a',
        'an',
        'and',
        'or',
        'but',
        'if',
        'then',
        'so',
        'because',
        'as',
        'of',
        'to',
        'in',
        'on',
        'for',
        'with',
        'at',
        'by',
        'from',
        'is',
        'are',
        'was',
        'were',
        'be',
        'been',
        'being',
        'it',
        'this',
        'that',
        'these',
        'those',
        'i',
        'you',
        'we',
        'they',
        'he',
        'she',
        'them',
        'my',
        'your',
        'our',
        'their',
        'his',
        'her',
        'its',
        'not',
        'do',
        'does',
        'did',
        'will',
        'would',
        'can',
        'could',
        'should',
        'about',
      ]);

      const wordFreq = new Map<string, number>();
      for (const sentence of sentences) {
        const words = sentence.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
        for (const word of words) {
          if (stopwords.has(word)) continue;
          wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
        }
      }

      const scored = sentences.map((sentence, idx) => {
        const words = sentence.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
        let score = 0;
        for (const word of words) {
          if (!stopwords.has(word)) {
            score += wordFreq.get(word) ?? 0;
          }
        }
        return { idx, sentence, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const picked = scored.slice(0, max).sort((a, b) => a.idx - b.idx);
      return picked.map((p) => ({ idx: p.idx, sentence: p.sentence }));
    };

    const tldr = pickTopSentences(3).map((s) => s.sentence);

    const actionItems = sentences
      .filter((s) => /\b(todo|action item|we need to|we should|let's|lets|i will|i'll|we will|we'll)\b/i.test(s))
      .slice(0, 5);

    const decisions = sentences
      .filter((s) => /\b(decide(d)?|decision|agreed|approved|we'll|we will|going to)\b/i.test(s))
      .slice(0, 5);

    const keyPoints = pickTopSentences(5)
      .map((s) => s.sentence)
      .filter((s) => !tldr.includes(s))
      .slice(0, 5);

    const lines: string[] = [];
    lines.push('## TL;DR');
    for (const s of tldr) lines.push(`- ${s}`);

    if (keyPoints.length > 0) {
      lines.push('\n## Key Points');
      for (const s of keyPoints) lines.push(`- ${s}`);
    }

    if (decisions.length > 0) {
      lines.push('\n## Decisions');
      for (const s of decisions) lines.push(`- ${s}`);
    }

    if (actionItems.length > 0) {
      lines.push('\n## Action Items');
      for (const s of actionItems) lines.push(`- ${s}`);
    }

    return lines.join('\n') + '\n';
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
            'You are a meeting notes assistant.\n' +
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
      const data = (await res.json()) as { response?: string };
      const summary = data?.response?.trim();
      return summary || null;
    } catch {
      return null;
    }
  }
}
