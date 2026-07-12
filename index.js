require('./keep_alive.js');
const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');

const client = new Client();

// الإعدادات
const GUILD_ID = '1264561928034975775';
const AFK_CHANNEL_ID = '1496674424693325844';
const ECON_CHANNEL_ID = '1505231947574546472';
const WAR_CHANNEL_ID = '1505231949629882508';
const EVENT_CHANNEL_ID = '1505231963919749193';
const POINTS_CHANNEL_ID = '1503150255594799205';
const DROP_BOT_ID = '1505226573400510464';
const TARGET_USER = '<@1505231949629882508>';

let queue = [];
let isProcessing = false;
let lastDropWindowStart = 0; // بداية نافذة الـ 15 دقيقة الحالية
let isWaitingForDrop = false; // هل نحن ننتظر الدروب الآن؟

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

client.on('ready', async () => {
    console.log(`تم التشغيل كـ ${client.user.tag}`);
    const guild = client.guilds.cache.get(GUILD_ID);
    if (guild) {
        joinVoiceChannel({ channelId: AFK_CHANNEL_ID, guildId: guild.id, adapterCreator: guild.voiceAdapterCreator, selfMute: true, selfDeaf: false });
    }

    // تفعيل فوري للمهام
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

client.on('voiceStateUpdate', (oldState, newState) => {
    if (newState.id === client.user.id && newState.channelId !== AFK_CHANNEL_ID) {
        joinVoiceChannel({ channelId: AFK_CHANNEL_ID, guildId: newState.guild.id, adapterCreator: newState.guild.voiceAdapterCreator, selfMute: true, selfDeaf: false });
    }
});

client.on('messageCreate', (msg) => {
    if (msg.channel.id !== EVENT_CHANNEL_ID) return;

    // 1. مراقبة "المنافسين" داخل نافذة الـ 15 دقيقة الحالية
    if (isWaitingForDrop && msg.content.includes("!event join") && msg.author.id !== client.user.id) {
        console.log("تم رصد شخص آخر يسبقني، سأنسحب من هذا الدروب.");
        isWaitingForDrop = false; // إيقاف الانتظار للدروب الحالي
        return;
    }

    // 2. كشف الدروب الجديد
    if (msg.author.id === DROP_BOT_ID && (msg.attachments.size > 0 || msg.embeds.length > 0)) {
        const now = Date.now();
        // التحقق أننا خارج فترة الـ 15 دقيقة السابقة
        if ((now - lastDropWindowStart) > 900000) { 
            lastDropWindowStart = now;
            isWaitingForDrop = true;

            console.log("دروب جديد تم رصده، جاري المراقبة...");

            // انتظر 3 ثواني للتأكد من عدم تدخل أحد
            setTimeout(() => {
                if (!isWaitingForDrop) return; // تم الإلغاء بواسطة مراقبة المنافسين

                addToQueue(msg.channel, "!event join");
                setTimeout(() => addToQueue(msg.channel, "!event join"), 500);
                setTimeout(() => addToQueue(msg.channel, "!event claim"), 4000);
                setTimeout(() => addToQueue(msg.channel, "!event claim"), 4500);
                
                isWaitingForDrop = false; // تم التنفيذ، نخرج من حالة الانتظار
            }, 3000);
        }
    }
});

client.login(process.env.token);
