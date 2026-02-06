import { cleanCaptionText } from './caption-cleaner';

export function addCaptionToList(list: string[], rawText: string): string[] {
  const cleaned = cleanCaptionText(rawText);
  if (!cleaned) return list;

  const next = list.slice();
  const last = next[next.length - 1];

  // Live captions often "grow" as the same caption line updates. In that case, replace the last entry
  // instead of appending to avoid duplicated phrases in downstream summaries.
  if (last) {
    if (cleaned === last) return next;
    if (cleaned.startsWith(last) && cleaned.length > last.length) {
      next[next.length - 1] = cleaned;
      return next;
    }
    if (last.startsWith(cleaned)) return next;
    if (cleaned.includes(last) && cleaned.length > last.length) {
      next[next.length - 1] = cleaned;
      return next;
    }
  }

  if (cleaned !== last) next.push(cleaned);
  if (next.length > 5000) next.shift();
  return next;
}
