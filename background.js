// background.js - Ephemeral Service Worker

// Target VIPs active in your scraping session (Synchronized list)
const HARDCODED_VIPS = [
  "66294766434", 
  "7388984805", 
  "61800015230", 
  "13093758657", 
  "62852593867", 
  "27990075937"
]; 

// --- 1. UNIFIED NETWORK MESSAGE INTERCEPTOR ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const actionType = message.action || message.type;
  
  if (actionType === 'PROCESS_RAW_PACKET' || actionType === 'RAW_NETWORK_DATA' || actionType === 'NETWORK_PACKET') {
    const endpoint = message.endpoint || '';
    const url = message.url || '';
    const data = message.payload;

    if (!data) {
      sendResponse({ status: "skipped", reason: "empty_payload" });
      return;
    }

    // Route to Feed Pipelines (Text Metrics + Binary Media Extraction)
    if (
      endpoint === 'FEED' || 
      url.includes("feed/timeline") || 
      url.includes("feed/user") || 
      url.includes("xdt_api__v1__feed__user")
    ) {
      handleFeedPayload(data);
      handleTimelinePayload(data);
    }
    
    // Route to Story/Reels Pipeline
    if (
      endpoint === 'STORIES' || 
      endpoint === 'stealth_reels' ||
      url.includes("feed/reels_media") || 
      url.includes("reels_list")
    ) {
      handleStoryPayload(data);
    }

    sendResponse({ status: "acknowledged", routing: true });
  }
});

// --- 2. FLEXIBLE TIMELINE & PROFILE GRID ROUTINE (TEXT METRICS) ---
async function handleFeedPayload(data) {
  const feedItems = data?.data?.xdt_api__v1__feed__timeline?.items || 
                    data?.data?.xdt_api__v1__feed__user?.items || 
                    data?.items || [];
                    
  if (feedItems.length === 0) return;
  
  const storage = await chrome.storage.local.get(['historicalState', 'accumulationQueue']);
  const state = storage.historicalState || {};
  const currentQueue = storage.accumulationQueue || [];
  let operationalDelta = [];

  for (const item of feedItems) {
    const authorId = String(item.user?.pk || '');
    const authorName = item.user?.username || '';
    
    if (!HARDCODED_VIPS.includes(authorId) && !HARDCODED_VIPS.includes(authorName)) continue;

    const postId = item.pk;
    const currentCaption = item.caption?.text || '';
    const commentCount = item.comment_count || 0;

    if (!state[postId] || state[postId].caption !== currentCaption || state[postId].comments < commentCount) {
      operationalDelta.push({
        type: 'FEED_METRICS',
        postId,
        authorName: authorName,
        caption: currentCaption,
        commentMetrics: commentCount,
        timestamp: item.taken_at || Math.floor(Date.now() / 1000)
      });
      
      state[postId] = { caption: currentCaption, comments: commentCount, type: 'FEED' };
    }
  }

  if (operationalDelta.length > 0) {
    const updatedQueue = [...currentQueue, ...operationalDelta];
    await chrome.storage.local.set({ historicalState: state, accumulationQueue: updatedQueue });
    console.log(`[Feed Metrics Engine] Staged ${operationalDelta.length} new target metric events.`);
    await dispatchToAILayer(operationalDelta);
  }
}

// --- 3. TIMELINE FEED POST PIPELINE (BINARY MEDIA ACQUISITION WITH CAROUSEL SUPPORT) ---
async function handleTimelinePayload(data) {
  if (!data) return;

  const items = data?.items || data?.feed_items || data?.data?.xdt_api__v1__feed__timeline?.items || [];
  if (!items.length) return;

  const storage = await chrome.storage.local.get(['historicalState', 'accumulationQueue']);
  const state = storage.historicalState || {};
  const currentQueue = storage.accumulationQueue || [];
  let postDelta = [];

  for (const item of items) {
    const mediaItem = item.media_or_ad || item; 
    const authorId = String(mediaItem?.user?.pk || '');
    const authorName = mediaItem?.user?.username || '';

    if (!HARDCODED_VIPS.includes(authorId) && !HARDCODED_VIPS.includes(authorName)) continue;

    const postId = mediaItem.pk || mediaItem.id;
    if (!postId || (state[postId] && state[postId].type === 'FEED_POST')) continue;

    // Upgrade: Build a list of all asset CDN URLs in this post (Handles single image/video AND carousels)
    let cdnUrls = [];
    if (mediaItem.carousel_media?.length > 0) {
      for (const subItem of mediaItem.carousel_media) {
        let subUrl = subItem.video_versions?.[0]?.url || subItem.image_versions2?.candidates?.[0]?.url;
        if (subUrl) cdnUrls.push(subUrl);
      }
    } else {
      let singleUrl = mediaItem.video_versions?.[0]?.url || mediaItem.image_versions2?.candidates?.[0]?.url;
      if (singleUrl) cdnUrls.push(singleUrl);
    }

    if (cdnUrls.length === 0) continue;

    // Process each slide dynamically
    for (let index = 0; index < cdnUrls.length; index++) {
      const cdnUrl = cdnUrls[index];
      const sliceId = cdnUrls.length > 1 ? `${postId}_slide_${index}` : postId;

      try {
        let response = await fetch(cdnUrl);
        let rawBlob = await response.blob();
        let base64String = await blobToBase64(rawBlob);

        postDelta.push({
          type: 'FEED_POST',
          storyId: sliceId, 
          authorName: authorName || 'Target VIP',
          mimeType: rawBlob.type,
          mediaData: base64String,
          cdnUrl: cdnUrl,
          timestamp: mediaItem.taken_at || Math.floor(Date.now() / 1000)
        });
      } catch (err) {
        console.error(`Asset pipeline crash on post ${postId} slide ${index}:`, err);
      }
    }

    // Mark the entire parent post as processed
    state[postId] = { seen: true, type: 'FEED_POST', localCdns: cdnUrls };
  }

  if (postDelta.length > 0) {
    const updatedQueue = [...currentQueue, ...postDelta];
    await chrome.storage.local.set({ 
      historicalState: state,
      accumulationQueue: updatedQueue
    });
    console.log(`🎉 [Post Media Engine] SUCCESS! Staged ${postDelta.length} new feed post/carousel payloads.`);
    await dispatchToAILayer(postDelta);
  }
}

// --- 4. SEQUENTIAL STORY PIPELINE ---
async function handleStoryPayload(data) {
  if (!data) return;
  
  let reelsArray = [];
  if (data.reels_media && Array.isArray(data.reels_media)) {
    reelsArray = [...reelsArray, ...data.reels_media];
  }
  if (data.reels) {
    const rawReels = Array.isArray(data.reels) ? data.reels : Object.values(data.reels);
    reelsArray = [...reelsArray, ...rawReels];
  }
  
  if (reelsArray.length === 0) return;
  
  const storage = await chrome.storage.local.get(['historicalState', 'accumulationQueue']);
  const state = storage.historicalState || {};
  const currentQueue = storage.accumulationQueue || [];
  let storyDelta = [];

  for (const reel of reelsArray) {
    const authorId = String(reel?.user?.pk || reel?.owner?.pk || reel?.id || '');
    const authorName = reel?.user?.username || 'Target User';

    if (!HARDCODED_VIPS.includes(authorId) && !HARDCODED_VIPS.includes(authorName)) continue;

    const items = reel.items || [];
    for (const item of items) {
      const storyId = item.pk;
      if (state[storyId]) continue;

      let cdnUrl = item.video_versions?.[0]?.url || item.image_versions2?.candidates?.[0]?.url;
      if (!cdnUrl) continue;

      try {
        let response = await fetch(cdnUrl);
        let rawBlob = await response.blob();
        let base64String = await blobToBase64(rawBlob);

        storyDelta.push({
          type: 'STORY',
          storyId,
          authorName: authorName,
          mimeType: rawBlob.type,
          mediaData: base64String, 
          cdnUrl: cdnUrl,
          timestamp: item.taken_at || Math.floor(Date.now() / 1000)
        });

        state[storyId] = { seen: true, type: 'STORY', localCdn: cdnUrl };
      } catch (err) {
        console.error(`Asset pipeline crash on story ${storyId}:`, err);
      }
    }
  }

  if (storyDelta.length > 0) {
    const updatedQueue = [...currentQueue, ...storyDelta];
    await chrome.storage.local.set({ 
      historicalState: state,
      accumulationQueue: updatedQueue
    });
    console.log(`🎉 [Story Engine] SUCCESS! Staged ${storyDelta.length} new binary payloads.`);
    await dispatchToAILayer(storyDelta);
  }
}

// --- 5. HIGH-PERFORMANCE DOM-LESS BASE64 CONVERTER ---
async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192; 

  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  
  return btoa(binary);
}

// --- 6. LOCAL TELEMETRY SYNC INTERFACE ---
async function dispatchToAILayer(delta) {
  try {
    await fetch('http://localhost:3000/api/digest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: delta })
    });
    console.log("[Sync] Successfully updated backend AI pipeline.");
  } catch (err) {
    console.error("[Sync] Local server execution offline or rejected transmission:", err);
  }
}