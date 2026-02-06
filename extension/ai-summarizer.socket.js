(() => {
  globalThis.AISummarizer = globalThis.AISummarizer || {};

  function createSocketClient(backendUrl, handlers = {}) {
    const socket = io(backendUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socket.on("connect", () => handlers.onConnect?.(socket));
    socket.on("disconnect", () => handlers.onDisconnect?.());
    socket.on("connect_error", (err) => handlers.onConnectError?.(err));
    socket.on("meeting-summary", (payload) => handlers.onMeetingSummary?.(payload));
    socket.on("caption-stored", (payload) => handlers.onCaptionStored?.(payload));

    function emitWithTimeout(event, data, timeoutMs, cb) {
      const supportsTimeout = typeof socket.timeout === "function";
      const emitter = supportsTimeout ? socket.timeout(timeoutMs) : socket;
      emitter.emit(event, data, (arg1, arg2) => {
        const err = supportsTimeout ? arg1 : null;
        const response = supportsTimeout ? arg2 : arg1;
        cb?.(err, response);
      });
    }

    return {
      socket,
      emitWithTimeout,
      sendCaption(data) {
        socket.emit("stream-caption", data);
      },
      clearSession(meetingId) {
        socket.emit("clear-session", { meetingId });
      },
      getSessionStats(meetingId, cb) {
        socket.emit("get-session-stats", { meetingId }, cb);
      },
      requestSummary(meetingId, timeoutMs, cb) {
        emitWithTimeout("request-summary", { meetingId }, timeoutMs, cb);
      },
    };
  }

  globalThis.AISummarizer.socket = { createSocketClient };
})();

