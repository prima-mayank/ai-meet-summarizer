(() => {
  if (window.__AI_SUMMARIZER_STARTED__) {
    console.log("AI Summarizer already running");
    return;
  }
  window.__AI_SUMMARIZER_STARTED__ = true;

  const ui = globalThis.AISummarizer?.ui?.createUI?.();
  if (!ui) {
    console.error("AI Summarizer UI failed to initialize");
    return;
  }

  const resolvedBackendUrl =
    typeof BACKEND_URL === "string" && BACKEND_URL.length > 0 ? BACKEND_URL : "http://localhost:3001";

  const meetingId = globalThis.AISummarizer.captions.getSessionId();

  const client = globalThis.AISummarizer.socket.createSocketClient(resolvedBackendUrl, {
    onConnect() {
      ui.setStatus("Summarizer: connected");
      client.getSessionStats(meetingId, (stats) => {
        const count = Number(stats?.count || 0);
        if (count > 0) ui.setStatus(`Captions: ${count}`);
      });
    },
    onDisconnect() {
      ui.setStatus("Summarizer: disconnected");
    },
    onConnectError(err) {
      console.error("Socket connect_error:", err?.message || err);
      ui.setStatus("Summarizer: connect error");
    },
    onMeetingSummary(payload) {
      const summary = payload?.summary ? String(payload.summary) : "";
      if (!summary.trim()) {
        ui.setStatus("Summarizer: no summary returned");
        return;
      }
      ui.showSummary(summary);
      const count = Number(payload?.count || 0);
      ui.setStatus(count > 0 ? `Summary ready (captions: ${count})` : "Summary ready");
    },
    onCaptionStored(stats) {
      const count = Number(stats?.count || 0);
      if (count > 0) ui.setStatus(`Captions: ${count}`);
    },
  });

  function downloadFile(url, filename) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function exportFormat(format, filename) {
    const encodedMeetingId = encodeURIComponent(meetingId);
    const url = `${resolvedBackendUrl}/export?meetingId=${encodedMeetingId}&format=${format}`;
    downloadFile(url, filename);
  }

  const captions = globalThis.AISummarizer.captions.createCaptionObserver({
    onCaptured(text) {
      console.log("Captured:", text);
    },
    onSend(text) {
      client.sendCaption({
        meetingId,
        text,
        source: window.location.hostname,
        title: document.title || "",
      });
    },
  });

  ui.summarizeBtn.addEventListener("click", () => {
    ui.clearSummary();
    ui.setStatus("Summarizer: summarizing...");
    client.requestSummary(meetingId, 20000, (err, response) => {
      if (err) {
        console.error("request-summary ack error:", err);
        ui.setStatus("Summarizer: summary request timed out");
        return;
      }
      const summary = response?.summary ? String(response.summary) : "";
      if (!summary.trim()) {
        ui.setStatus("Summarizer: no summary returned");
        return;
      }
      ui.showSummary(summary);
      const count = Number(response?.count || 0);
      ui.setStatus(count > 0 ? `Summary ready (captions: ${count})` : "Summary ready");
    });
  });

  ui.clearBtn.addEventListener("click", () => {
    captions.reset();
    client.clearSession(meetingId);
    ui.clearSummary();
    ui.setStatus("Summarizer: cleared");
  });

  ui.exportBtn.addEventListener("click", () => {
    const format = ui.exportSelect.value || "txt";
    const filenameMap = {
      txt: "summary.txt",
      md: "summary.md",
      pdf: "summary.pdf",
      notion: "notion.json",
    };
    exportFormat(format, filenameMap[format] || "summary.txt");
  });

  setTimeout(() => captions.start(), 3001);
})();

