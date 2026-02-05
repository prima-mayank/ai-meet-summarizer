console.log("AI Summarizer Loaded");

function createStatusPanel() {
    const existing = document.getElementById("ai-summarizer-status");
    if (existing) return existing;

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
    summarizeBtn.textContent = "Summarize";
    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear";

    const exportSelect = document.createElement("select");
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
    exportBtn.textContent = "Export";

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
    document.documentElement.appendChild(panel);

    return {
        panel,
        label,
        summarizeBtn,
        clearBtn,
        exportSelect,
        exportBtn,
    };
}

const ui = createStatusPanel();

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
    if (!payload?.summary) return;
    console.log("Summary:", payload.summary);
    ui.label.textContent = "Summary ready (see console)";
    alert(payload.summary);
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
        return text;
    }
    const text = nodes[nodes.length - 1].innerText?.trim();
    return text || "";
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
    ui.label.textContent = "Summarizer: summarizing...";
    socket.emit("request-summary", { meetingId: getSessionId() });
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
