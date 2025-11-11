const { makeid } = require('./gen-id');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");
const path = require('path');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    const authPath = path.join(__dirname, 'temp', id); // Use path.join for consistency
    
    async function GIFTED_MD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState(authPath);
        
        try {
            let sock = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                logger: pino({ level: "silent" }),
                browser: Browsers.macOS("Desktop"),
            });

            let qrSent = false; // Flag to prevent sending QR multiple times

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect, qr } = s;

                // --- QR Sending Logic ---
                if (qr && !qrSent) {
                    try {
                        const qrBuffer = await QRCode.toBuffer(qr);
                        res.contentType('image/png'); // Tell browser it's an image
                        res.end(qrBuffer);
                        qrSent = true; // Mark as sent
                    } catch (e) {
                        console.error("Failed to send QR buffer:", e);
                    }
                }

                // --- Connection Open Logic ---
                if (connection === "open") {
                    await delay(5000); // Give time for creds to save
                    
                    try {
                        const credsData = fs.readFileSync(path.join(authPath, 'creds.json'), 'utf-8');
                        const base64Session = Buffer.from(credsData).toString('base64');
                        let md = "QADEER-AI~" + base64Session;
                        let code = await sock.sendMessage(sock.user.id, { text: md });
                        
                        let cap = `
🔐 *𝙳𝙾 𝙽𝙾𝚃 𝚂𝙷𝙰𝚁𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙳𝙴 𝚆𝙸𝚃𝙷 𝙰𝙽𝚈𝙾𝙽𝙴!!*

Use this code to create your own *𝚀𝙰𝙳𝙴𝙴𝚁-𝙰𝙸* WhatsApp User Bot. 🤖

🛠️ *To add your SESSION_ID:* 1. Open the \`session.js\` file in the repo.  
2. Paste your session like this:  
\`\`\`js
module.exports = {
  SESSION_ID: 'PASTE_YOUR_SESSION_ID_HERE'
}
\`\`\`  
3. Save the file and run the bot. ✅

⚠️ *NEVER SHARE YOUR SESSION ID WITH ANYONE!*
`;
                        await sock.sendMessage(sock.user.id, {
                            text: cap,
                            contextInfo: {
                                externalAdReply: {
                                    title: "QADEER AI",
                                    thumbnailUrl: "https://qu.ax/yyTAH.jpg",
                                    sourceUrl: "https://whatsapp.com/channel/0029VajWxSZ96H4SyQLurV1H",
                                    mediaType: 2,
                                    renderLargerThumbnail: true,
                                    showAdAttribution: true,
                                },
                            },
                        }, { quoted: code });

                    } catch (e) {
                        console.error("Error sending session data:", e);
                        // Try sending error to user
                        try {
                            await sock.sendMessage(sock.user.id, { text: e.toString() });
                        } catch (err) {
                            console.error("Failed to send error message to user:", err);
                        }
                    } finally {
                        // --- IMPORTANT: Clean up THIS session only ---
                        await sock.ws.close();
                        removeFile(authPath);
                        console.log(`👤 ${sock.user.id} 𝗖𝗼𝗻𝗻𝗲𝗰𝘁𝗲𝗱 ✅ Session files removed.`);
                        // --- NO process.exit() ---
                    }
                } 
                
                // --- Connection Close Logic ---
                else if (connection === "close") {
                    const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== 401);
                    console.log(`Connection closed for ${id}, reconnect: ${shouldReconnect}`, lastDisconnect?.error);
                    
                    // Always clean up files on close
                    removeFile(authPath);
                    
                    // If QR was never sent and headers aren't sent, send an error
                    if (!qrSent && !res.headersSent) {
                        res.status(500).send({ code: "❗ Service Unavailable or QR timeout" });
                    }
                }
            });
        } catch (err) {
            console.error("Service error:", err);
            removeFile(authPath); // Clean up on initial error
            if (!res.headersSent) {
                res.status(500).send({ code: "❗ Service Unavailable" });
            }
        }
    }
    await GIFTED_MD_PAIR_CODE();
});

// --- REMOVED THE BAD setInterval with process.exit() ---

module.exports = router;
