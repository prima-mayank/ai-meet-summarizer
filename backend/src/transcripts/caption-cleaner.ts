export function cleanCaptionText(text: string): string {
  const normalized = String(text).replace(/\s+/g, ' ').trim();
  if (!normalized) return '';

  // Tokenize into words/numbers and standalone punctuation.
  const tokens =
    normalized.match(/[\p{L}\p{N}]+(?:['\u2019][\p{L}\p{N}]+)?|[^\s]/gu) ?? [];
  if (tokens.length === 0) return '';

  // 1) Collapse immediate repeated tokens: "too too too" -> "too too"
  const collapsedRuns: string[] = [];
  for (const token of tokens) {
    const prev = collapsedRuns[collapsedRuns.length - 1];
    const prevPrev = collapsedRuns[collapsedRuns.length - 2];
    if (token === prev && token === prevPrev) continue;
    collapsedRuns.push(token);
  }

  // 2) Collapse repeated short n-grams: "with some friends with some friends" -> "with some friends"
  const out: string[] = [];
  let i = 0;
  const maxN = 6;
  while (i < collapsedRuns.length) {
    let skipped = false;
    for (let n = maxN; n >= 2; n--) {
      if (i + 2 * n > collapsedRuns.length) continue;
      let same = true;
      for (let j = 0; j < n; j++) {
        if (collapsedRuns[i + j] !== collapsedRuns[i + n + j]) {
          same = false;
          break;
        }
      }
      if (!same) continue;

      for (let j = 0; j < n; j++) out.push(collapsedRuns[i + j]);
      i += n;

      while (i + n <= collapsedRuns.length) {
        let again = true;
        for (let j = 0; j < n; j++) {
          if (collapsedRuns[i + j] !== out[out.length - n + j]) {
            again = false;
            break;
          }
        }
        if (!again) break;
        i += n;
      }

      skipped = true;
      break;
    }
    if (skipped) continue;
    out.push(collapsedRuns[i]);
    i += 1;
  }

  // Join tokens back with sane spacing (avoid spaces before punctuation).
  const noSpaceBefore = new Set([
    ',',
    '.',
    '!',
    '?',
    ':',
    ';',
    ')',
    ']',
    '}',
    '\u2019',
    "'",
  ]);
  const noSpaceAfter = new Set(['(', '[', '{']);
  let rebuilt = '';
  for (const token of out) {
    if (!rebuilt) {
      rebuilt = token;
      continue;
    }
    const prevChar = rebuilt[rebuilt.length - 1];
    if (noSpaceBefore.has(token) || noSpaceAfter.has(prevChar)) {
      rebuilt += token;
    } else {
      rebuilt += ` ${token}`;
    }
  }

  return rebuilt.replace(/\s+/g, ' ').trim();
}
