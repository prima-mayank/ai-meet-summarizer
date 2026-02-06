export function buildTranscriptText(captions: string[]): string {
  const joined = captions.join('\n');
  const maxChars = 12000;
  if (joined.length <= maxChars) return joined;
  return joined.slice(joined.length - maxChars);
}
