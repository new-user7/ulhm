const { makeid } = require('./gen-id');
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const pino = require('pino');
const logger = pino({ level: 'info' });
const {
    makeWASocket,
    useMultiFileAuthState,
    delay,
    Browsers,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    DisconnectReason,
} = require('@whiskeysockets/baileys');

function removeFile(filePath) {
    if (!fs.existsSync(filePath)) return false;
    fs.rmSync(filePath, { recursive: true, force: true });
}

// Removed unused generateRandomText function

async function GIFTED_MD_PAIR_CODE(id, num, res) {
    const authPath = path.join(__dirname, 'temp', id); // Define authPath
    const { state, saveCreds } = await useMultiFileAuthState(authPath); // Use authPath
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    try {
        const sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
            generateHighQualityLinkPreview: true,
            logger: logger,
            syncFullHistory: false,
            browser: Browsers.macOS('Safari'),
        });

        if (!sock.authState.creds.registered) {
            await delay(1500);
            num = num.replace(/[^0-9]/g, '');
            const code = await sock.requestPairingCode(num);
            if (!res.headersSent) {
                res.send({ code });
            }
        }

        sock.ev.on('creds.update', saveCreds);
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                await delay(5000);
                const credsFilePath = path.join(authPath, 'creds.json'); // Use authPath
                
                try {
                    const credsData = fs.readFileSync(credsFilePath, 'utf-8');
                    const base64Session = Buffer.from(credsData).toString('base64');
                    const md = "QADEER-AI~" + base64Session;
                    const codeMessage = await sock.sendMessage(sock.user.id, { text: md });
                    
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
                                title: "QADEER AI ✅",
                                thumbnailUrl: "https://qu.ax/yyTAH.jpg",
                                sourceUrl: "https://whatsapp.com/channel/0029VajWxSZ96H4SyQLurV1H",
                                mediaType: 2,
                                renderLargerThumbnail: true,
                                showAdAttribution: true,
                            },
                        },
                    }, { quoted: codeMessage });

                } catch (error) {
                    logger.error(`Error in connection update: ${error.message}`);
                    const errorMessage = await sock.sendMessage(sock.user.id, { text: error.message });
                    // ... (rest of error message logic) ...
                
                } finally {
                    // --- IMPORTANT: Clean up THIS session only ---
                    await sock.ws.close();
                    removeFile(authPath); // Use authPath
                    logger.info(`👤 ${sock.user.id} 𝗖𝗼𝗻𝗻𝗲𝗰𝘁𝗲𝗱 ✅ Session files removed.`);
                    // --- NO process.exit() ---
                }
            } else if (connection === 'close') {
                // Handle close
                const shouldRetry = (lastDisconnect?.error?.output?.statusCode !== 401);
                logger.warn(`Connection closed for ${id}. Should retry: ${shouldRetry}`);
                removeFile(authPath); // Clean up on close
                
                // Don't auto-retry in a loop, user can request new code
                // if (!shouldRetry && !res.headersSent) {
                //    res.status(401).send({ code: "❗ Authentication failed. Please try again." });
                // }
            }
        });
    } catch (error) {
        logger.error(`Error in GIFTED_MD_PAIR_CODE: ${error.message}`);
        removeFile(authPath); // Use authPath
        if (!res.headersSent) {
            res.send({ code: "❗ Service Unavailable" });
        }
    }
}

router.get('/', async (req, res) => {
    const id = makeid();
    const num = req.query.number;
    if (!num) {
        return res.status(400).send({ error: 'Number is required' });
    }
    await GIFTED_MD_PAIR_CODE(id, num, res);
});

// --- REMOVED THE BAD setInterval with process.exit() ---

module.exports = router;
