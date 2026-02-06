(() => {
  globalThis.AISummarizer = globalThis.AISummarizer || {};

  const PANEL_STATE_KEY = "ai-summarizer-panel-state";

  function readPanelState() {
    try {
      return localStorage.getItem(PANEL_STATE_KEY);
    } catch {
      return null;
    }
  }

  function writePanelState(value) {
    try {
      localStorage.setItem(PANEL_STATE_KEY, value);
    } catch {
      // Ignore storage failures (private mode, blocked storage, etc.)
    }
  }

  function createToggleButton() {
    const existing = document.getElementById("ai-summarizer-toggle");
    if (existing) return existing;

    const toggle = document.createElement("button");
    toggle.id = "ai-summarizer-toggle";
    toggle.type = "button";
    toggle.style.position = "fixed";
    toggle.style.right = "0";
    toggle.style.top = "45%";
    toggle.style.transform = "translateY(-50%)";
    toggle.style.zIndex = "999999";
    toggle.style.border = "1px solid #374151";
    toggle.style.borderRight = "none";
    toggle.style.background = "#111827";
    toggle.style.color = "#e5e7eb";
    toggle.style.borderRadius = "8px 0 0 8px";
    toggle.style.padding = "6px 10px";
    toggle.style.cursor = "pointer";
    toggle.style.font = "12px/1.2 Arial, sans-serif";
    toggle.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";

    document.documentElement.appendChild(toggle);
    return toggle;
  }

  function setPanelVisible(panel, toggle, visible) {
    panel.style.display = visible ? "flex" : "none";
    toggle.textContent = visible ? "Hide Summarizer" : "Show Summarizer";
    toggle.setAttribute("aria-pressed", visible ? "true" : "false");
    writePanelState(visible ? "open" : "closed");
  }

  function createStatusPanel() {
    const existing = document.getElementById("ai-summarizer-status");
    if (existing) {
      const label = existing.querySelector("#ai-summarizer-label");
      const summarizeBtn = existing.querySelector("#ai-summarizer-summarize");
      const clearBtn = existing.querySelector("#ai-summarizer-clear");
      const exportSelect = existing.querySelector("#ai-summarizer-export-select");
      const exportBtn = existing.querySelector("#ai-summarizer-export-btn");
      const summaryBox = existing.querySelector("#ai-summarizer-summary");

      if (label && summarizeBtn && clearBtn && exportSelect && exportBtn && summaryBox) {
        return {
          panel: existing,
          label,
          summarizeBtn,
          clearBtn,
          exportSelect,
          exportBtn,
          summaryBox,
        };
      }

      existing.remove();
    }

    const panel = document.createElement("div");
    panel.id = "ai-summarizer-status";
    panel.style.position = "fixed";
    panel.style.right = "12px";
    panel.style.bottom = "12px";
    panel.style.zIndex = "999999";
    panel.style.padding = "10px";
    panel.style.borderRadius = "10px";
    panel.style.font = "12px/1.3 Arial, sans-serif";
    panel.style.background = "#1f2937";
    panel.style.color = "#f9fafb";
    panel.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
    panel.style.display = "flex";
    panel.style.gap = "6px";
    panel.style.alignItems = "center";
    panel.style.flexWrap = "wrap";
    panel.style.maxWidth = "340px";

    const label = document.createElement("span");
    label.id = "ai-summarizer-label";
    label.textContent = "Summarizer: starting...";

    const summarizeBtn = document.createElement("button");
    summarizeBtn.id = "ai-summarizer-summarize";
    summarizeBtn.textContent = "Summarize";

    const clearBtn = document.createElement("button");
    clearBtn.id = "ai-summarizer-clear";
    clearBtn.textContent = "Clear";

    const exportSelect = document.createElement("select");
    exportSelect.id = "ai-summarizer-export-select";
    const exportOptions = [
      { value: "txt", label: "TXT" },
      { value: "md", label: "MD" },
      { value: "pdf", label: "PDF" },
      { value: "notion", label: "Notion JSON" },
    ];
    for (const opt of exportOptions) {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.label;
      exportSelect.appendChild(option);
    }
    exportSelect.style.border = "1px solid #374151";
    exportSelect.style.background = "#111827";
    exportSelect.style.color = "#e5e7eb";
    exportSelect.style.borderRadius = "8px";
    exportSelect.style.padding = "4px 8px";

    const exportBtn = document.createElement("button");
    exportBtn.id = "ai-summarizer-export-btn";
    exportBtn.textContent = "Export";

    const summaryBox = document.createElement("pre");
    summaryBox.id = "ai-summarizer-summary";
    summaryBox.style.margin = "6px 0 0 0";
    summaryBox.style.padding = "8px";
    summaryBox.style.border = "1px solid #374151";
    summaryBox.style.background = "#0b1220";
    summaryBox.style.color = "#e5e7eb";
    summaryBox.style.borderRadius = "8px";
    summaryBox.style.whiteSpace = "pre-wrap";
    summaryBox.style.maxHeight = "220px";
    summaryBox.style.overflow = "auto";
    summaryBox.style.width = "100%";
    summaryBox.style.display = "none";

    const buttons = [summarizeBtn, clearBtn, exportBtn];
    for (const btn of buttons) {
      btn.style.cursor = "pointer";
      btn.style.border = "1px solid #374151";
      btn.style.background = "#111827";
      btn.style.color = "#e5e7eb";
      btn.style.borderRadius = "8px";
      btn.style.padding = "4px 8px";
    }

    panel.appendChild(label);
    panel.appendChild(summarizeBtn);
    panel.appendChild(clearBtn);
    panel.appendChild(exportSelect);
    panel.appendChild(exportBtn);
    panel.appendChild(summaryBox);
    document.documentElement.appendChild(panel);

    return {
      panel,
      label,
      summarizeBtn,
      clearBtn,
      exportSelect,
      exportBtn,
      summaryBox,
    };
  }

  function createUI() {
    const ui = createStatusPanel();
    const toggleBtn = createToggleButton();
    const storedState = readPanelState();
    const initialVisible = storedState !== "closed";
    setPanelVisible(ui.panel, toggleBtn, initialVisible);

    toggleBtn.addEventListener("click", () => {
      const isVisible = ui.panel.style.display !== "none";
      setPanelVisible(ui.panel, toggleBtn, !isVisible);
    });

    return {
      ...ui,
      setStatus(text) {
        ui.label.textContent = text;
      },
      clearSummary() {
        ui.summaryBox.style.display = "none";
        ui.summaryBox.textContent = "";
      },
      showSummary(text) {
        ui.summaryBox.textContent = text;
        ui.summaryBox.style.display = "block";
      },
    };
  }

  globalThis.AISummarizer.ui = { createUI };
})();

