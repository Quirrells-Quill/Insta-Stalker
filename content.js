// content.js - Runs in the Isolated World
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
(document.head || document.documentElement).appendChild(script);
script.onload = () => script.remove();

// content.js - The Extension Bridge
window.addEventListener("message", (event) => {
  // Only accept messages from the current page window
  if (event.source !== window) return;

  if (event.data && event.data.type === 'NETWORK_PACKET') {
    // Relay the ENTIRE packet unmodified so background.js can read the endpoint/url
    chrome.runtime.sendMessage(event.data);
  }
});