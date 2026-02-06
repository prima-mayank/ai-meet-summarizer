(() => {
  globalThis.AISummarizer = globalThis.AISummarizer || {};

  const CAPTION_SELECTORS = [
    ".iTTPOb",
    ".VbkSUe",
    ".a4cQT",
    ".ytp-caption-segment",
    ".ytp-caption-window-container",
    "div[aria-live='polite'] span",
    "div[aria-live='assertive'] span",
    "div[role='log'] span",
  ];

  function getCaptionTextFromSelector(selector) {
    const nodes = document.querySelectorAll(selector);
    if (nodes.length === 0) return "";
    if (selector === ".ytp-caption-window-container") {
      const segments = nodes[nodes.length - 1].querySelectorAll(".ytp-caption-segment");
      const text = Array.from(segments)
        .map((n) => n.innerText)
        .join(" ")
        .trim();
      return text ? text.normalize("NFC") : "";
    }
    const text = nodes[nodes.length - 1].innerText?.replace(/\s+/g, " ").trim();
    return text ? text.normalize("NFC") : "";
  }

  function getLatestCaptionText() {
    for (const selector of CAPTION_SELECTORS) {
      const text = getCaptionTextFromSelector(selector);
      if (text) return text;
    }
    return "";
  }

  function getSessionId() {
    const host = window.location.hostname || "unknown-host";
    const path = window.location.pathname || "/";
    return `${host}${path}`;
  }

  function normalizeCaptionForSend(text) {
    if (!text) return "";
    return String(text)
      .replace(/^\s*>>\s*/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function createCaptionObserver({ onSend, onCaptured, sendDebounceMs = 800, forceSendMs = 2500 }) {
    let lastText = "";
    let lastSentText = "";
    let debounceTimer = null;
    let pendingStartedAt = 0;
    let observer = null;

    function reset() {
      lastText = "";
      lastSentText = "";
      pendingStartedAt = 0;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    function flushCaptionSend() {
      debounceTimer = null;
      pendingStartedAt = 0;

      const normalized = normalizeCaptionForSend(lastText);
      if (!normalized) return;
      if (normalized === lastSentText) return;

      const wordCount = (normalized.match(/[\p{L}\p{N}']+/gu) || []).length;
      if (wordCount < 3 && normalized.length < 12) return;

      lastSentText = normalized;
      onSend(normalized);
    }

    function start() {
      const targetNode = document.body;
      if (!targetNode) return;

      observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          const hasNewNodes = mutation.type === "childList" && mutation.addedNodes.length > 0;
          const hasTextChange = mutation.type === "characterData";
          if (!hasNewNodes && !hasTextChange) return;

          const currentText = getLatestCaptionText();
          if (!currentText || currentText === lastText || currentText.length <= 2) return;

          lastText = currentText;
          if (typeof onCaptured === "function") onCaptured(currentText);

          if (!pendingStartedAt) pendingStartedAt = Date.now();
          if (debounceTimer) clearTimeout(debounceTimer);

          const force = Date.now() - pendingStartedAt > forceSendMs;
          if (force) {
            flushCaptionSend();
            return;
          }

          const looksFinal = /[.!?…]\s*$/.test(currentText) || /\]\s*$/.test(currentText);
          debounceTimer = setTimeout(flushCaptionSend, looksFinal ? 150 : sendDebounceMs);
        });
      });

      observer.observe(targetNode, { childList: true, subtree: true, characterData: true });
    }

    function stop() {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = null;
      pendingStartedAt = 0;
      if (observer) observer.disconnect();
      observer = null;
    }

    return { start, stop, reset };
  }

  globalThis.AISummarizer.captions = { createCaptionObserver, getSessionId };
})();

