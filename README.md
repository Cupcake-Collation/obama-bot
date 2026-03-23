# Obama Gemini Discord Bot

A Discord bot that:
- replies when mentioned
- answers in an Obama-like style
- refuses political questions
- ignores messages containing banned terms
- if the Gemini free-tier limit is hit, sends a sleep message once and stops answering further questions until restarted

## Requirements
- Node.js 18+
- A Discord bot token
- A Gemini API key

## Setup
1. Install dependencies:
   npm install
2. Copy `.env.example` to `.env`
3. Fill in your Discord token and Gemini API key
4. Start the bot:
   npm start

## Discord setup
In the Discord Developer Portal:
- create a bot
- copy the bot token
- enable **Message Content Intent**
- invite the bot to your server

## Notes
- Trigger is an actual mention of the bot, not plain text `@obama`
- Once Gemini returns a rate-limit / quota exhaustion error, the bot posts the configured sleep message and ignores future prompts until you restart the process
