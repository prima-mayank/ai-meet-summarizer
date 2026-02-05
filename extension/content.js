console.log("AI Summarizer Loaded");

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

function main() {
const ui = createStatusPanel();
const toggleBtn = createToggleButton();
const storedState = readPanelState();
const initialVisible = storedState !== "closed";
setPanelVisible(ui.panel, toggleBtn, initialVisible);

toggleBtn.addEventListener("click", () => {
    const isVisible = ui.panel.style.display !== "none";
    setPanelVisible(ui.panel, toggleBtn, !isVisible);
});

const resolvedBackendUrl = typeof BACKEND_URL === "string" && BACKEND_URL.length > 0
    ? BACKEND_URL
    : "http://localhost:3001";

console.log("Summarizer backend:", resolvedBackendUrl);

const socket = io(resolvedBackendUrl, {
    transports: ["websocket", "polling"],
    reconnection: true,
});

socket.on("connect", () => {
    console.log("Connected to Backend Server");
    ui.label.textContent = "Summarizer: connected";
    const meetingId = getSessionId();
    socket.emit("get-session-stats", { meetingId }, (stats) => {
        if (!stats) return;
        const count = Number(stats?.count || 0);
        if (count > 0) ui.label.textContent = `Captions: ${count}`;
    });
});

socket.on("disconnect", () => {
    console.log("Disconnected from Backend");
    ui.label.textContent = "Summarizer: disconnected";
});

socket.on("connect_error", (err) => {
    console.error("Socket connect_error:", err?.message || err);
    ui.label.textContent = "Summarizer: connect error";
});

socket.on("meeting-summary", (payload) => {
    const summary = payload?.summary ? String(payload.summary) : "";
    console.log("meeting-summary payload:", payload);
    if (!summary.trim()) {
        ui.label.textContent = "Summarizer: no summary returned";
        return;
    }
    ui.summaryBox.textContent = summary;
    ui.summaryBox.style.display = "block";
    const count = Number(payload?.count || 0);
    ui.label.textContent = count > 0 ? `Summary ready (captions: ${count})` : "Summary ready";
});

socket.on("caption-stored", (stats) => {
    const count = Number(stats?.count || 0);
    if (count > 0) ui.label.textContent = `Captions: ${count}`;
});

let lastText = "";
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
        const text = Array.from(segments).map((n) => n.innerText).join(" ").trim();
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

function sendCaption(currentText) {
    ui.label.textContent = "Summarizer: sending...";
    socket.emit("stream-caption", {
        meetingId: getSessionId(),
        text: currentText,
        source: window.location.hostname,
        title: document.title || "",
    });
}

function downloadFile(url, filename) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function exportFormat(format, filename) {
    const meetingId = encodeURIComponent(getSessionId());
    const url = `${resolvedBackendUrl}/export?meetingId=${meetingId}&format=${format}`;
    downloadFile(url, filename);
}

function startListening() {
    const targetNode = document.body;

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            const hasNewNodes = mutation.type === "childList" && mutation.addedNodes.length > 0;
            const hasTextChange = mutation.type === "characterData";
            if (hasNewNodes || hasTextChange) {
                const currentText = getLatestCaptionText();

                if (currentText && currentText !== lastText && currentText.length > 2) {
                    lastText = currentText;
                    console.log("Captured:", currentText);
                    sendCaption(currentText);
                }
            }
        });
    });

    observer.observe(targetNode, { childList: true, subtree: true, characterData: true });
}

ui.summarizeBtn.addEventListener("click", () => {
    const meetingId = getSessionId();
    ui.summaryBox.style.display = "none";
    ui.summaryBox.textContent = "";
    ui.label.textContent = "Summarizer: summarizing...";
    console.log("Requesting summary for meetingId:", meetingId);

    const emitter = typeof socket.timeout === "function" ? socket.timeout(20000) : socket;
    emitter.emit("request-summary", { meetingId }, (arg1, arg2) => {
        const hasTimeoutAck = typeof socket.timeout === "function";
        const err = hasTimeoutAck ? arg1 : null;
        const response = hasTimeoutAck ? arg2 : arg1;

        if (err) {
            console.error("request-summary ack error:", err);
            ui.label.textContent = "Summarizer: summary request timed out";
            return;
        }
        if (!response) return;
        const summary = response?.summary ? String(response.summary) : "";
        if (!summary.trim()) return;
        ui.summaryBox.textContent = summary;
        ui.summaryBox.style.display = "block";
        const count = Number(response?.count || 0);
        ui.label.textContent = count > 0 ? `Summary ready (captions: ${count})` : "Summary ready";
    });
});

ui.clearBtn.addEventListener("click", () => {
    lastText = "";
    socket.emit("clear-session", { meetingId: getSessionId() });
    ui.label.textContent = "Summarizer: cleared";
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

setTimeout(startListening, 3001);
}

if (window.__AI_SUMMARIZER_STARTED__) {
    console.log("AI Summarizer already running");
} else {
    window.__AI_SUMMARIZER_STARTED__ = true;
    main();
}
