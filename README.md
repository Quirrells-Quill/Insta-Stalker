Here is a highly professional, technically dense, and recruiter-optimized `README.md` for your GitHub repository. It perfectly frames the complex engineering challenges you solved throughout this build, presenting you as a developer who deeply understands web architecture, reverse-engineering, memory management, and AI integration.

---

# 🕵️‍♂️ InstaDigest: Stealth OSINT & AI Summary Engine

**InstaDigest** is an advanced, stealth-focused Chrome Extension (Manifest V3) and Node.js backend pipeline. It silently intercepts, extracts, and compiles ephemeral social media data (Reels, Stories, Feed Posts) from targeted VIP accounts, funneling raw binary media and text telemetry into a Local AI Server. The AI then processes this unstructured data to generate highly stylized, tabloid-style daily digests.

This project was built to solve complex challenges in modern web scraping, specifically bypassing React 18 hydration constraints, mitigating memory limits during massive binary conversions, and handling transient AI API failures.

---

## ✨ Core Features & Technical Achievements

### 1. Advanced Network Interception (Main-World Monkey Patching)

Modern Single Page Applications (SPAs) do not expose raw data in the DOM. To extract data without brittle HTML parsing, this extension injects a sentry script directly into the page's execution environment.

* **XHR & Fetch Hooking:** Safely intercepts and clones asynchronous network streams (`window.fetch` and `XMLHttpRequest.prototype`) without disrupting the application's native state.
* **Resilient Data Traversal:** Utilizes a recursive, schema-agnostic Deep-Graph Scanner to hunt for targeted User IDs (PKs) across unpredictable, deeply nested GraphQL and REST API JSON payloads.

### 2. React 18 Hydration Compatibility & DOM Isolation

A major challenge in injecting scripts into Server-Side Rendered (SSR) React applications is **Error #418 (Hydration Mismatch)**.

* **Seamless Co-existence:** Engineered the extension to operate entirely outside of the host application's Virtual DOM. By cloning HTTP response streams (`.clone()`) rather than mutating them, the native React engine receives the pristine data it expects, preventing hard client-side fallback crashes.
* **UI Shielding:** Implemented DOM-less background extraction and UI isolation techniques (leveraging Shadow DOM where necessary) to ensure the extension never poisons the host's HTML node tree before hydration completes.

### 3. High-Performance Memory Management

Extracting high-resolution images and videos required converting massive binary files into Base64 for the AI pipeline, which traditionally crashes the browser's V8 engine (`Maximum call stack size exceeded`).

* **Chunk-Safe Buffer Allocation:** Engineered a high-performance, DOM-less Base64 converter. By chunking `Uint8Array` buffers into controlled 8KB segments (`chunkSize = 8192`) and incrementally building the string, the extension safely processes massive HD video blobs without overflowing the call stack.

### 4. Anti-Bot Evasion & Human Jitter

To prevent triggering automated rate-limiting or behavioral bans:

* **Stealth Executive Engine:** Implemented randomized human-like execution delays (1.5s - 3.5s jitter) for background extraction queries.
* **Stateful Cooldowns:** Built a 1-hour caching mechanism (`Map()`) to prevent redundant XHR requests when a user rapidly navigates or refreshes the DOM.

### 5. Manifest V3 Inter-Process Communication (IPC)

Chrome's Manifest V3 enforces strict boundary contexts.

* **Bridge Architecture:** Built a secure message-passing relay that routes intercepted raw packets from the unsecured Main World (`inject.js`), through an isolated Content Script Bridge (`content.js`), and securely into the Ephemeral Service Worker (`background.js`) for persistent local storage and processing.

### 6. Resilient LLM Backend (Node.js & Gemini AI)

The local Node server acts as the AI processing layer, converting massive Base64 payloads and text metrics into stylized summaries.

* **Network Resilience:** Engineered robust error handling for external LLM API limitations. Implemented an **Exponential Backoff** retry algorithm to catch and dynamically delay requests when encountering `503 Service Unavailable` server-side congestion, ensuring the pipeline pauses and recovers gracefully instead of failing.

---

## 🏗️ Architecture Flow Diagram

1. **Target Identification:** User scrolls feed. Sentry script (`inject.js`) detects VIP telemetry in encrypted JSON responses.
2. **Stealth Extraction:** Script waits for a randomized human interval, then triggers an invisible `XMLHttpRequest` for the target's raw media (Reels/Stories).
3. **IPC Relay:** Data is shuttled via `window.postMessage` to the Content Script, which utilizes `chrome.runtime.sendMessage` to wake the Service Worker.
4. **Binary Processing:** Service worker (`background.js`) downloads media from the CDN, chunks it into Base64, and dynamically maps Carousel arrays to distinct entities.
5. **AI Synthesis:** Payload is POSTed to the Node.js localhost, where Google Gemini analyzes the visual/textual data and writes a journalistic summary.
6. **Frontend Delivery:** Output is formatted and served directly to the user in a specialized UI vault.

---

## 🚀 Installation & Local Setup

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/InstaDigest.git
cd InstaDigest

```


2. **Install Backend Dependencies:**
```bash
npm install @google/generative-ai dotenvx express cors

```


3. **Configure Environment:**
* Create a `.env` file in the root directory.
* Add your Google Gemini API Key: `GEMINI_API_KEY=your_key_here`


4. **Start the Node Server:**
```bash
node server.js

```


5. **Load the Extension:**
* Open Chrome and navigate to `chrome://extensions/`
* Enable **Developer Mode** (top right).
* Click **Load unpacked** and select the `/extension` directory from this repository.


6. **Navigate to Instagram:** Let the sentry deploy and monitor the network seamlessly.

---

## ⚠️ Disclaimer

*This project was engineered strictly for educational purposes to demonstrate advanced concepts in network interception, extension architecture, memory chunking, and AI pipeline integration. It is not intended for malicious scraping, unauthorized data extraction, or violating the Terms of Service of any platform.*
