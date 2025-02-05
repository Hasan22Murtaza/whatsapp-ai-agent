const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const OpenAI = require("openai");
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPEN_AI_KEY;

// Initialize OpenAI client
const openAiClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// System Prompt with AI Behavior
const SYSTEM_PROMT = `
You are an AI Assistant with structured reasoning using START, PLAN, ACTION, OBSERVATION, and OUTPUT.
Follow the steps to fetch weather data using the provided function.

Available Tools:
- function getWeather(city: string): string
  - Retrieves the current weather for a given city.

Example Flow:
START 
{ "type" : "user", "user": "what is the sum of weather of multan and faisalabad"}
{ "type" : "plan", "plan": "I will call getWeather for multan"}
{ "type" : "action", "function": "getWeather", "input": "multan"}
{ "type" : "observation", "observation": "24°C"}
{ "type" : "plan", "plan": "I will call getWeather for faisalabad"}
{ "type" : "action", "function": "getWeather", "input": "faisalabad"}
{ "type" : "observation", "observation": "23°C"}
{ "type" : "output", "output": "The sum of weather of multan and faisalabad is 47°C"}
`;

// Function to simulate getting weather data for different cities
function getWeather(city) {
  const cityWeather = {
    islamabad: "18°C",
    karachi: "25°C",
    lahore: "22°C",
    peshawar: "20°C",
    quetta: "15°C",
    multan: "24°C",
    faisalabad: "23°C",
    rawalpindi: "19°C",
    hyderabad: "26°C",
    patiala: "10°C",
  };

  return cityWeather[city.toLowerCase()] || "Weather data not available for this city.";
}

// Mapping available tools
const tools = {
  getWeather: getWeather,
};

const clients = {};

function startClient(id) {
  clients[id] = new Client({
    authStrategy: new LocalAuth({
      clientId: id
    }),
    webVersionCache: {
      type: 'remote',
      remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2407.3.html`
    }
  });

  clients[id].initialize().catch(err => console.log(err));

  clients[id].on("qr", (qr) => {
    console.log(`Scan this QR for client ${id}:`);
    qrcode.generate(qr, { small: true });
  });

  clients[id].on("ready", () => console.log(`Client ${id} is ready!`));

  // Listen for incoming messages
  clients[id].on("message", async (msg) => {
    try {
      if (msg.from !== "status@broadcast") {
        const contact = await msg.getContact();
        console.log(`📩 New message from: ${contact.pushname} (${msg.from})`);
        console.log(`💬 Message: ${msg.body}`);

        // Append user message to OpenAI conversation
        const messages = [
          { role: "system", content: SYSTEM_PROMT },
          { role: "user", content: JSON.stringify({ type: "user", user: msg.body }) }
        ];

        while (true) {
          // Call OpenAI GPT model
          const chat = await openAiClient.chat.completions.create({
            model: "gpt-4o",
            messages: messages,
          });

          // Extract AI response
          const result = chat.choices[0].message.content;
          console.log(`\n\n---------------- AI Response ----------------\n${result}\n--------------------------------------------\n`);

          messages.push({ role: "assistant", content: result });

          // Parse AI response for action
          const call = JSON.parse(result);

          if (call.type === "output") {
            clients[id].sendMessage(msg.from, call.output);
            break;
          } else if (call.type === "action") {
            const fn = tools[call.function];
            const observation = fn(call.input);

            const obs = { type: "observation", observation: observation };
            messages.push({ role: "developer", content: JSON.stringify(obs) });
          }
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });
}

// Function to Send Messages
function sendMessage(phoneNumber, message, clientId, file) {
  if (file) {
    const messageFile = new MessageMedia(file.mimetype, file.buffer.toString("base64"));
    clients[clientId]?.sendMessage(phoneNumber, messageFile);
  } else {
    clients[clientId]?.sendMessage(phoneNumber, message);
  }
}

module.exports = { startClient, sendMessage };
