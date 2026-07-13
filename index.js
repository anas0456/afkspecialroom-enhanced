require('./keep_alive.js');
const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fetch = require('node-fetch');

const client = new Client();

const GUILD_ID = '1264561928034975775';
const AFK_CHANNEL_ID = '1496674424693325844';
const DROP_BOT_ID = '1505226573400510464';
const TARGET_USER = '<@1507052275753947157>';

const CHANNELS = {
    ECON: '1505231947574546472',
    WAR: '1505231949629882508',
    EVENT: '1505231963919749193',
    POINTS: '1503150255594799205'
};

let isCheckingImage = false;
let lastDropWindowStart = 0;

// --- دالة تنفيذ المهام المباشرة ---
function startTasks() {
    console.log("🚀 تشغيل المهام التلقائية فوراً...");
    
    // تنفيذ مهام الاقتصاد
    const econ = client.channels.cache.get(CHANNELS.ECON);
    if (econ) { econ.send("!جريمة"); setTimeout(() => econ.send("!عمل"), 2000); }
    
    // تنفيذ مهام الحرب
    const war = client.channels.cache.get(CHANNELS.WAR);
    if (war) war.send(`!attack ${TARGET_USER}`);
    
    // تنفيذ مهام النقاط
    const points = client.channels.cache.get(CHANNELS.POINTS);
    if (points) points.send("ياجماعه جمعو نقاط");
}

async function analyzeImageFast(url, channel) {
    if (isCheckingImage) return;
    isCheckingImage = true;
    try {
        const response = await fetch(url);
        const buffer = await response.buffer();
        const { data: { text } } = await Tesseract.recognize(buffer, 'ara+eng');
        
        console.log(`[🔍] فحص صورة في ${channel.name}: "${text.substring(0, 30)}..."`);
        
        const isRealDrop = (text.includes("دروب") || text.includes("drop")) && !text.includes("نجاح") && !text.includes("تمت");
        
        if (isRealDrop && (Date.now() - lastDropWindowStart) > 900000) {
            console.log(`[🔥] دروب حقيقي! جاري التنفيذ...`);
            channel.send("!event join");
            setTimeout(() => channel.send("!event join"), 500);
            setTimeout(() => channel.send("!event claim"), 4000);
            lastDropWindowStart = Date.now();
        }
    } catch (e) { console.error(`[❌] خطأ تحليل: ${e.message}`); } finally { isCheckingImage = false; }
}

client.on('ready', () => {
    console.log(`✅ البوت متصل: ${client.user.tag}`);
    const guild = client.guilds.cache.get(GUILD_ID);
    if (guild) joinVoiceChannel({ channelId: AFK_CHANNEL_ID, guildId: guild.id, adapterCreator: guild.voiceAdapterCreator, selfMute: true, selfDeaf: false });

    // 1. تشغيل المهام فوراً عند العمل
    startTasks();

    // 2. تشغيل المهام بشكل دوري
    setInterval(startTasks, 3600000); // المهام تتكرر كل ساعة
});

client.on('messageCreate', (msg) => {
    if (!Object.values(CHANNELS).includes(msg.channel.id)) return;
    if (msg.attachments.size > 0 && msg.author.id === DROP_BOT_ID && msg.channel.id === CHANNELS.EVENT) {
        analyzeImageFast(msg.attachments.first().url, msg.channel);
    }
});

client.login(process.env.token);
