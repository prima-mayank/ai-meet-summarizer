console.log("AI Summarizer Loaded on Google Meet");

const socket = io("http://localhost:3001");

socket.on("connect", () => {
    console.log("Connected to Backend Server");
});

socket.on("disconnect", () => {
    console.log("Disconnected from Backend");
});

let lastText = "";

function startListening() {
    const targetNode = document.body; 

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                const captionDivs = document.querySelectorAll('.iTTPOb, .VbkSUe, .a4cQT'); 

                if (captionDivs.length > 0) {
                    const currentText = captionDivs[captionDivs.length - 1].innerText;

                    if (currentText && currentText !== lastText && currentText.length > 5) {
                        lastText = currentText;
                        
                        console.log("🎙️ Captured:", currentText);
                        
                        socket.emit('stream-caption', { 
                            meetingId: 'google-meet-live', 
                            text: currentText 
                        });
                    }
                }
            }
        });
    });

    observer.observe(targetNode, { childList: true, subtree: true });
}

setTimeout(startListening, 3001);