require('./keep_alive.js');
const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const Tesseract = require('tesseract.js');
const https = require('https');

const client = new Client();

// الإعدادات
const GUILD_ID = '1264561928034975775';
const AFK_CHANNEL_ID = '1496674424693325844';
const ECON_CHANNEL_ID = '1505231947574546472';
const WAR_CHANNEL_ID = '1505231949629882508';
const EVENT_CHANNEL_ID = '1505231963919749193';
const POINTS_CHANNEL_ID = '1503150255594799205';
const DROP_BOT_ID = '1505226573400510464';
const TARGET_USER = '<@1505231949629882508>'; // ضع الآيدي الرقمي هنا

let queue = [];
let isProcessing = false;
let lastDropWindowStart = 0;
let isCheckingImage = false;

const processQueue = () => {
    if (isProcessing || queue.length === 0) return;
    isProcessing = true;
    const task = queue.shift();
    task.channel.send(task.content).catch(() => {});
    setTimeout(() => {
        isProcessing = false;
        processQueue();
    }, 3500); 
};

const addToQueue = (channel, content) => {
    queue.push({ channel, content });
    processQueue();
};

const checkDropImage = async (url, channel) => {
    if (isCheckingImage) return;
    isCheckingImage = true;
    console.log("تم رصد صورة، جاري تحليل المحتوى...");

    try {
        const { data: { text } } = await Tesseract.recognize(url, 'ara');
        console.log("النص المكتشف:", text);

        // شرط ذكي: وجود "دروب" وعدم وجود "نجاح" أو "جمع"
        const isActualDrop = text.includes("دروب") && !text.includes("نجاح") && !text.includes("جمع");

        if (isActualDrop) {
            console.log("✅ دروب حقيقي تم التحقق منه، تنفيذ الأوامر...");
            addToQueue(channel, "!event join");
            setTimeout(() => addToQueue(channel, "!event join"), 500);
            setTimeout(() => addToQueue(channel, "!event claim"), 4000);
            setTimeout(() => addToQueue(channel, "!event claim"), 4500);
            lastDropWindowStart = Date.now();
        } else {
            console.log("❌ هذه صورة تأكيد، تجاهل.");
        }
    } catch (e) {
        console.error("خطأ تحليل الصورة:", e);
    } finally {
        isCheckingImage = false;
    }
};

client.on('ready', async () => {
    console.log(`تم التشغيل كـ ${client.user.tag}`);
    const guild = client.guilds.cache.get(GUILD_ID);
    if (guild) {
        joinVoiceChannel({ channelId: AFK_CHANNEL_ID, guildId: guild.id, adapterCreator: guild.voiceAdapterCreator, selfMute: true, selfDeaf: false });
    }

    const econChan = client.channels.cache.get(ECON_CHANNEL_ID);
    if (econChan) { addToQueue(econChan, "!جريمة"); addToQueue(econChan, "!عمل"); }
    const warChan = client.channels.cache.get(WAR_CHANNEL_ID);
    if (warChan) addToQueue(warChan, `!attack ${TARGET_USER}`);

    setInterval(() => {
        const chan = client.channels.cache.get(ECON_CHANNEL_ID);
        if (chan) { addToQueue(chan, "!جريمة"); addToQueue(chan, "!عمل"); }
    }, 3600000);

    setInterval(() => {
        const chan = client.channels.cache.get(WAR_CHANNEL_ID);
        if (chan) addToQueue(chan, `!attack ${TARGET_USER}`);
    }, 1200000);

    setInterval(() => {
        const chan = client.channels.cache.get(POINTS_CHANNEL_ID);
        if (chan) addToQueue(chan, "ياجماعه جمعو نقاط");
    }, 3000);
});

client.on('messageCreate', (msg) => {
    if (msg.channel.id !== EVENT_CHANNEL_ID) return;

    if (msg.author.id === DROP_BOT_ID && msg.attachments.size > 0) {
        const now = Date.now();
        if ((now - lastDropWindowStart) > 900000) { 
            checkDropImage(msg.attachments.first().url, msg.channel);
        }
    }

    if (lastDropWindowStart > 0 && (Date.now() - lastDropWindowStart) < 60000) {
        if (msg.content.includes("!event join") && msg.author.id !== client.user.id) {
            console.log("تم رصد منافس، انسحاب.");
            lastDropWindowStart = 0;
        }
    }
});

client.login(process.env.token);
