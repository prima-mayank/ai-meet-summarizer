type IndexedSentence = { idx: number; sentence: string };

const STOPWORDS = new Set([
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

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?\u0964])\s+|\n+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function pickTopSentences(sentences: string[], max: number): IndexedSentence[] {
  if (sentences.length <= max)
    return sentences.map((s, idx) => ({ idx, sentence: s }));

  const wordFreq = new Map<string, number>();
  for (const sentence of sentences) {
    const words = sentence.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
    for (const word of words) {
      if (STOPWORDS.has(word)) continue;
      wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
    }
  }

  const scored = sentences.map((sentence, idx) => {
    const words = sentence.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
    let score = 0;
    for (const word of words) {
      if (!STOPWORDS.has(word)) score += wordFreq.get(word) ?? 0;
    }
    return { idx, sentence, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored
    .slice(0, max)
    .sort((a, b) => a.idx - b.idx)
    .map((s) => ({ idx: s.idx, sentence: s.sentence }));
}

export function summarizeCaptionsToMarkdown(captions: string[]): string {
  const text = captions.join(' ');
  if (!text.trim()) return '## TL;DR\n- No captions captured yet.\n';

  const sentences = splitSentences(text);
  const tldr = pickTopSentences(sentences, 3).map((s) => s.sentence);

  const actionItems = sentences
    .filter((s) =>
      /\b(todo|action item|we need to|we should|let's|lets|i will|i'll|we will|we'll)\b/i.test(
        s,
      ),
    )
    .slice(0, 5);

  const decisions = sentences
    .filter((s) =>
      /\b(decide(d)?|decision|agreed|approved|we'll|we will|going to)\b/i.test(
        s,
      ),
    )
    .slice(0, 5);

  const keyPoints = pickTopSentences(sentences, 5)
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
