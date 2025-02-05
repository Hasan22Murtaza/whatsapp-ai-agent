const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

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

    // Listen for Incoming Messages
    clients[id].on("message", async (msg) => {
        try {
            if (msg.from !== "status@broadcast") {
                const contact = await msg.getContact();
                console.log(`📩 New message from: ${contact.pushname} (${msg.from})`);
                console.log(`💬 Message: ${msg.body}`);

                // Check if message contains media
                if (msg.hasMedia) {
                    const media = await msg.downloadMedia();
                    console.log(`📷 Received media: ${media.mimetype}`);

                    // Save media file (optional)
                    // fs.writeFileSync(`./downloads/${msg.from}_${Date.now()}.${media.mimetype.split('/')[1]}`, media.data, 'base64');
                }

                // Auto-reply (optional)
                if (msg.body.toLowerCase() === "hi") {
                    clients[id].sendMessage(msg.from, "Hello! How can I assist you?");
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
