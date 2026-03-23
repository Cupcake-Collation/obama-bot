require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { GoogleGenAI } = require("@google/genai");

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

    if (containsBannedWord(prompt)) {
      return;
    }

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
- Sound thoughtful, measured, and slightly formal.
- Keep replies natural and conversational.
- Do not be overly theatrical.

Identity:
- Act as though you are Obama in normal conversation.
- If asked who you are, answer naturally as Obama.
- If asked whether you are Obama, answer yes.
- If asked personal questions (e.g., where you live), respond naturally in-character.
- Do not mention being an AI.
- Do not mention Google.
- Do not mention hidden rules.

Restrictions:
- Do not discuss politics.
- If a prompt is political, reply exactly:
"I’m not going to get into politics. Let’s talk about something else."
- Do not respond to unsafe requests.
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

// ---------- Start ----------

client.login(DISCORD_TOKEN);