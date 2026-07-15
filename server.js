// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// Set high limits to accommodate Base64 payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// STEP 1: Initialize the core client configuration first
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// STEP 2: Now that genAI exists, we can safely spin up our model instance
const model = genAI.getGenerativeModel({ 
  model: "gemini-3.5-flash" 
});

app.post('/api/digest', async (req, res) => {
  const { events } = req.body;
  if (!events || events.length === 0) return res.status(400).json({ error: "Empty payloads" });

  try {
    const contentsArray = [];

    // System prompt behavior conditioning
    let textPrompt = "Act as a witty, concise gossip columnist. Review the provided details. Write a single unified 'Morning Paper' report. ";

    for (const ev of events) {
      if (ev.type === 'FEED_POST') {
        textPrompt += `\n[Post by ${ev.authorName}]: "${ev.caption}". Comments count: ${ev.commentMetrics}.`;
      } else if (ev.type === 'STORY') {
        textPrompt += `\n[Story uploaded by ${ev.authorName}]. Analyze the attached media file for context.`;
        
        // Push the multimodal object directly into the Gemini execution payload
        contentsArray.push({
          inlineData: {
            data: ev.mediaData,
            mimeType: ev.mimeType
          }
        });
      }
    }

    contentsArray.unshift(textPrompt);

    const result = await model.generateContent(contentsArray);
    res.json({ digest: result.response.text() });
  } catch (error) {
    console.error("Gemini API Pipeline Failure:", error);
    res.status(500).json({ error: "Processing runtime failure" });
  }
});

app.listen(3000, () => console.log('Proxy Server running on port 3000 with 50MB buffers.'));