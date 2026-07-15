// inject.js - Resilient Deep-Graph Sentry
(function() {
  // Deduplicated and aligned VIP list
  const HARDCODED_VIPS = [
    "66294766434", 
    "7388984805", 
    "61800015230", 
    "13093758657", 
    "62852593867", 
    "27990075937"
  ]; 
  
  const processedUsers = new Map(); 
  const processedStories = new Map(); 

  console.log("[InstaDigest] 🚀 Resilient main-world sentry deployed and scanning...");

  // ==========================================
  // DEEP TRAVERSAL SCANNER (Resilient to Schema Changes)
  // ==========================================
  function deepScanPayload(obj, keyContext = "") {
    if (!obj || typeof obj !== "object") return;

    const rawId = obj.pk ?? obj.id ?? obj.pk_id ?? obj.owner?.pk ?? obj.owner?.id;
    if (rawId) {
      const userId = String(rawId);
      
      if (HARDCODED_VIPS.includes(userId)) {
        const hasStoryKeys = ('latest_reel_media' in obj || 'expiring_at' in obj || 'seen' in obj);
        const isInStoryContext = keyContext.toLowerCase().includes('reel') || keyContext.toLowerCase().includes('tray') || keyContext.toLowerCase().includes('story');

        if (hasStoryKeys || isInStoryContext) {
          console.log(`🎯 [InstaDigest] Match Found! VIP "${userId}" detected in an active story/reel object.`);
          handleVipDetection(userId, obj);
        }
      }
    }

    if (obj.pk && obj.taken_at && (obj.media_type === 1 || obj.media_type === 2)) {
      const storyPk = String(obj.pk);
      if (!processedStories.has(storyPk)) {
        processedStories.set(storyPk, Date.now());
        console.log(`📸 [InstaDigest] Intercepted a raw story media item directly. PK: ${storyPk}`);
      }
    }

    if (Array.isArray(obj)) {
      obj.forEach(item => deepScanPayload(item, keyContext));
    } else {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          deepScanPayload(obj[key], key);
        }
      }
    }
  }

  function handleVipDetection(userId, userObj) {
    const lastSeen = processedUsers.get(userId) || 0;
    const now = Date.now();
    
    if (now - lastSeen > 3600000) { // 1-hour safety cooldown
      processedUsers.set(userId, now);
      
      const randomDelay = Math.floor(Math.random() * 2000) + 1500;
      console.log(`[InstaDigest] ⏳ Scheduling stealth pull for VIP ${userId} in ${randomDelay}ms...`);
      
      setTimeout(() => stealthFetchStory(userId, 1), randomDelay);
    } else {
      console.log(`[InstaDigest] ⏳ VIP ${userId} bypassed (recently checked within the hour).`);
    }
  }

  // ==========================================
  // FETCH / XHR INTERCEPTORS
  // ==========================================
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    
    // Resilient URL extraction
    let url = '';
    if (args[0]) {
      url = typeof args[0] === 'string' ? args[0] : (args[0].url || '');
    }

    if (url.includes("graphql") || url.includes("/api/v1/")) {
      try {
        const clone = response.clone();
        clone.json().then(data => {
          if (data && data.data) {
            console.log(`[InstaDigest] 🌐 Intercepted GraphQL. Sub-properties under data:`, Object.keys(data.data));
          }
          deepScanPayload(data);
        }).catch(() => {});
      } catch (e) {}
    }
    return response;
  };

  const XHR = XMLHttpRequest.prototype;
  const send = XHR.send;
  const open = XHR.open;

  XHR.open = function(method, url) {
    this._url = url;
    return open.apply(this, arguments);
  };

  XHR.send = function() {
    this.addEventListener('load', function() {
      if (this._url && (this._url.includes("graphql") || this._url.includes("/api/v1/"))) {
        try {
          let data;
          // Protect from Modern JSON response type crashes
          if (this.responseType === "json") {
            data = this.response;
          } else if (this.responseType === "" || this.responseType === "text") {
            data = JSON.parse(this.responseText);
          }
          
          if (data) {
            deepScanPayload(data);
          }
        } catch (e) {
          // Fail silently to keep Instagram functioning normally
        }
      }
    });
    return send.apply(this, arguments);
  };

  // ==========================================
  // STEALTH EXECUTIVE ENGINE
  // ==========================================
  async function stealthFetchStory(userId, attempt) {
    console.log(`[InstaDigest] 🤖 Executing background extraction query for VIP: ${userId}...`);
    try {
      const url = `https://www.instagram.com/api/v1/feed/reels_media/?reel_ids=${userId}`;
      const response = await originalFetch(url, {
        credentials: "include",
        headers: {
          'Accept': '*/*',
          'X-Requested-With': 'XMLHttpRequest',
          'X-IG-App-ID': '936619743392459', 
        }
      });
      
      if (response.ok) {
        const storyData = await response.json();
        console.log(`🎉 [InstaDigest] Stealth Fetch SUCCESS for ${userId}! Content payload:`, storyData);
        // Post message outwards to the content script bridge
        window.postMessage({ type: 'NETWORK_PACKET', endpoint: 'stealth_reels', payload: storyData }, '*');
      } else {
        throw new Error(`HTTP Status ${response.status}`);
      }
    } catch (err) {
      console.warn(`[InstaDigest] ⚠️ Stealth fetch failed (Attempt ${attempt}/3): ${err.message}`);
      if (attempt < 3) {
        setTimeout(() => stealthFetchStory(userId, attempt + 1), 3000 * attempt);
      }
    }
  }
})();