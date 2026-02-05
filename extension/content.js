console.log("AI Summarizer Loaded on Google Meet");

function createStatusBadge() {
    const existing = document.getElementById("ai-summarizer-status");
    if (existing) return existing;
    const badge = document.createElement("div");
    badge.id = "ai-summarizer-status";
    badge.style.position = "fixed";
    badge.style.right = "12px";
    badge.style.bottom = "12px";
    badge.style.zIndex = "999999";
    badge.style.padding = "8px 10px";
    badge.style.borderRadius = "10px";
    badge.style.font = "12px/1.2 Arial, sans-serif";
    badge.style.background = "#1f2937";
    badge.style.color = "#f9fafb";
    badge.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
    badge.textContent = "Summarizer: starting...";
    document.documentElement.appendChild(badge);
    return badge;
}

const statusBadge = createStatusBadge();

const socket = io("http://localhost:3001", {
    transports: ["websocket", "polling"],
    reconnection: true,
});

socket.on("connect", () => {
    console.log("Connected to Backend Server");
    statusBadge.textContent = "Summarizer: connected";
});

socket.on("disconnect", () => {
    console.log("Disconnected from Backend");
    statusBadge.textContent = "Summarizer: disconnected";
});

socket.on("connect_error", (err) => {
    console.error("Socket connect_error:", err?.message || err);
    statusBadge.textContent = "Summarizer: connect error";
});

let lastText = "";
const CAPTION_SELECTORS = [
    ".iTTPOb",
    ".VbkSUe",
    ".a4cQT",
    "div[aria-live='polite'] span",
    "div[aria-live='assertive'] span",
    "div[role='log'] span",
];

function getLatestCaptionText() {
    for (const selector of CAPTION_SELECTORS) {
        const nodes = document.querySelectorAll(selector);
        if (nodes.length > 0) {
            const text = nodes[nodes.length - 1].innerText?.trim();
            if (text) {
                return text;
            }
        }
    }
    return "";
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
                    statusBadge.textContent = "Summarizer: sending...";

                    socket.emit("stream-caption", {
                        meetingId: "google-meet-live",
                        text: currentText,
                    });
                }
            }
        });
    });

    observer.observe(targetNode, { childList: true, subtree: true, characterData: true });
}

setTimeout(startListening, 3001);
