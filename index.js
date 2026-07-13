require('./keep_alive.js');
const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fetch = require('node-fetch');

const client = new Client();

// الإعدادات - تم تجميع القنوات في مصفوفة واحدة للتحكم الكامل
const GUILD_ID = '1264561928034975775';
const AFK_CHANNEL_ID = '1496674424693325844';
const DROP_BOT_ID = '1505226573400510464';
const TARGET_USER = '<@1507052275753947157>';

const ALLOWED_CHANNELS = {
    ECON: '1505231947574546472',
    WAR: '1505231949629882508',
    EVENT: '1505231963919749193',
    POINTS: '1503150255594799205'
};

// تنظيف اللوغز: لا يظهر إلا المهام والأخطاء
console.log = (msg) => process.stdout.write(`[INFO] ${msg}\n`);
console.error = (msg) => process.stdout.write(`[ERROR] ${msg}\n`);

let isPaused = false;
let isCheckingImage = false;
let lastDropWindowStart = 0;

// نظام معالجة الصور الصارم (لا يعالج إلا القنوات المسموحة)
async function analyzeImageFast(url, channel) {
    if (isCheckingImage) return;
    isCheckingImage = true;
    try {
        const response = await fetch(url);
        const buffer = await response.buffer();
        const enhancedBuffer = await sharp(buffer).resize(800, 600).grayscale().sharpen().toBuffer();
        const { data: { text, confidence } } = await Tesseract.recognize(enhancedBuffer, ['ara', 'eng']);

        // فلترة الدروب
        const isRealDrop = (text.includes("دروب") || text.includes("drop")) && !text.includes("نجاح") && !text.includes("تمت") && confidence > 0.6;
        
        if (isRealDrop && channel.id === ALLOWED_CHANNELS.EVENT) {
            console.log(`[🔥] دروب حقيقي في ${channel.name}`);
            channel.send("!event join");
            setTimeout(() => channel.send("!event join"), 500);
            setTimeout(() => channel.send("!event claim"), 4000);
            lastDropWindowStart = Date.now();
        }
    } catch (e) { } finally { isCheckingImage = false; }
}

client.on('ready', async () => {
    console.log(`البوت يعمل كـ ${client.user.tag}`);
    const guild = client.guilds.cache.get(GUILD_ID);
    if (guild) joinVoiceChannel({ channelId: AFK_CHANNEL_ID, guildId: guild.id, adapterCreator: guild.voiceAdapterCreator, selfMute: true, selfDeaf: false });
    
    // المهام التلقائية (أوامر بسيطة)
    setInterval(() => {
        const econ = client.channels.cache.get(ALLOWED_CHANNELS.ECON);
        if (econ) { econ.send("!جريمة"); setTimeout(() => econ.send("!عمل"), 2000); }
    }, 3600000);

    setInterval(() => {
        const war = client.channels.cache.get(ALLOWED_CHANNELS.WAR);
        if (war) war.send(`!attack ${TARGET_USER}`);
    }, 1200000);
});

client.on('messageCreate', (msg) => {
    // الفلتر الصارم: ممنوع المعالجة خارج القنوات الـ 4 المحددة
    if (!Object.values(ALLOWED_CHANNELS).includes(msg.channel.id)) return;
    
    // إذا كانت رسالة تحتوي صور
    if (msg.attachments.size > 0) {
        // إذا كان من بوت الدروبات وفي قناة الدروبات فقط
        if (msg.channel.id === ALLOWED_CHANNELS.EVENT && msg.author.id === DROP_BOT_ID) {
            analyzeImageFast(msg.attachments.first().url, msg.channel);
        }
    }
    
    // منع السبام: مراقبة المنافسين في قناة الدروب
    if (msg.channel.id === ALLOWED_CHANNELS.EVENT && msg.content.includes('!event join') && msg.author.id !== client.user.id) {
        console.log(`[!] تم رصد منافس في ${msg.channel.name}`);
    }
});

client.login(process.env.token);
