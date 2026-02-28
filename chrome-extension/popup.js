document.addEventListener('DOMContentLoaded', () => {
    // In MV3, UI state is better retrieved from background service worker, but we can't directly access variables.
    // So we'll communicate using chrome.runtime messages or just assume from badge state.

    // Basic trick: get badge text
    chrome.action.getBadgeText({}, (text) => {
        const badge = document.getElementById('status-badge');
        if (text === "ON") {
            badge.textContent = "CONNECTED TO LOCAL HOST";
            badge.className = "status connected";
        } else {
            badge.textContent = "DISCONNECTED";
            badge.className = "status disconnected";
        }
    });

    // We can poll it periodically if the popup stays open
    setInterval(() => {
        chrome.action.getBadgeText({}, (text) => {
            const badge = document.getElementById('status-badge');
            if (text === "ON") {
                badge.textContent = "CONNECTED TO LOCAL HOST";
                badge.className = "status connected";
            } else {
                badge.textContent = "DISCONNECTED";
                badge.className = "status disconnected";
            }
        });
    }, 1000);
});
