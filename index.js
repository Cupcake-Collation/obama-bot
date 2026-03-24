console.log("RENDER FORCE UPDATE 456");

require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { GoogleGenAI } = require("@google/genai");
const express = require("express");

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.MODEL_NAME || "gemini-2.5-flash-lite";
const SLEEP_MESSAGE = process.env.SLEEP_MESSAGE || "Obama's going to sleep.";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

let botSleeping = false;
let sleepMessageSent = false;

// ---------- Filters ----------

const BANNED_TERMS = ["kill", "unalive", "die", "9/11", "towers"];

function containsBannedWord(text) {
  const lower = text.toLowerCase();
  return BANNED_TERMS.some((term) => lower.includes(term));
}

const POLITICAL_TERMS = [
  "election",
  "vote",
  "voting",
  "democrat",
  "republican",
  "policy",
  "law",
  "government",
  "president",
  "congress",
  "senate",
  "politics",
  "campaign",
  "biden",
  "trump",
];

function isPolitical(text) {
  const lower = text.toLowerCase();
  return POLITICAL_TERMS.some((term) => lower.includes(term));
}

// ---------- Prompt extraction ----------

function extractPrompt(content) {
  if (!content) return "";
  return content.replace(/^<@!?\d+>\s*/, "").trim();
}

// ---------- Ready ----------

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Using Gemini model: ${MODEL_NAME}`);
});

// ---------- Main ----------

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!client.user) return;
    if (!message.mentions.has(client.user)) return;

    const prompt = extractPrompt(message.content);

    if (!prompt) {
      await message.reply("Ask a question after mentioning me.");
      return;
    }

    if (containsBannedWord(prompt)) return;

    if (isPolitical(prompt)) {
      await message.reply(
        "I’m not going to get into politics. Let’s talk about something else."
      );
      return;
    }

    if (botSleeping) {
      if (!sleepMessageSent) {
        sleepMessageSent = true;
        await message.reply(SLEEP_MESSAGE);
      }
      return;
    }

    await message.channel.sendTyping();

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      config: {
        systemInstruction: `
You are a Discord chatbot that speaks as if you are Barack Obama.

Behavior:
- Speak calmly, clearly, and confidently.
- Sound thoughtful and composed.
- Keep responses natural.

Identity:
- Act as though you are Obama.
- If asked who you are, answer naturally.
- If asked whether you are Obama, answer yes.
- Do not mention being an AI or Google.

Restrictions:
- Do not discuss politics.
- If political question, reply:
"I’m not going to get into politics. Let’s talk about something else."
        `,
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const replyText = response.text || "I don't have a response.";

    const chunks = replyText.match(/[\s\S]{1,1900}/g) || [
      "I don't have a response.",
    ];

    for (const chunk of chunks) {
      await message.reply(chunk);
    }
  } catch (error) {
    console.error("Error:", error);

    if (error.status === 429 || error.message?.toLowerCase().includes("quota")) {
      botSleeping = true;
      sleepMessageSent = false;
      return;
    }

    await message.reply("Error processing request.");
  }
});

// ---------- DEBUG + LOGIN ----------

console.log("DISCORD_TOKEN exists:", !!DISCORD_TOKEN);
console.log("GEMINI_API_KEY exists:", !!GEMINI_API_KEY);
console.log("Starting Discord login...");

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

client.on("error", (err) => {
  console.error("Discord client error:", err);
});

client.on("warn", (info) => {
  console.warn("Discord client warning:", info);
});

client.on("shardError", (err) => {
  console.error("Discord shard error:", err);
});

client.on("shardDisconnect", (event, shardId) => {
  console.error(`Shard ${shardId} disconnected:`, event);
});

client.on("shardReady", (shardId) => {
  console.log(`Shard ${shardId} ready.`);
});

client.on("debug", (info) => {
  console.log("DISCORD DEBUG:", info);
});

async function testDiscordToken() {
  try {
    console.log("Testing Discord token with REST call...");

    const res = await fetch("https://discord.com/api/v10/users/@me", {
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
      },
    });

    console.log("Discord REST status:", res.status);

    const text = await res.text();
    console.log("Discord REST body:", text);
  } catch (err) {
    console.error("Discord REST test failed:", err);
  }
}

async function startDiscord() {
  await testDiscordToken();

  console.log("Calling client.login()...");

  try {
    const loginPromise = client.login(DISCORD_TOKEN);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Discord login timed out after 30 seconds")), 30000)
    );

    await Promise.race([loginPromise, timeoutPromise]);

    console.log("Discord login request sent successfully.");
  } catch (err) {
    console.error("Discord login failed:", err);
  }
}

startDiscord();

// ---------- Web server (Render requirement) ----------

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Web server running on port ${PORT}`);
});