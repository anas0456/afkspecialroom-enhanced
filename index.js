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

// نظام الطابور لمنع الباند (يضمن فاصل 3.5 ثانية)
let queue = [];
let isProcessing = false;

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
        joinVoiceChannel({ 
            channelId: AFK_CHANNEL_ID, 
            guildId: guild.id, 
            adapterCreator: guild.voiceAdapterCreator, 
            selfMute: true, 
            selfDeaf: false 
        });
    }

    // المهام الاقتصادية (كل ساعة)
    setInterval(() => {
        const chan = client.channels.cache.get(ECON_CHANNEL_ID);
        if (chan) { addToQueue(chan, "!جريمة"); addToQueue(chan, "!عمل"); }
    }, 3600000);

    // الحرب (كل 20 دقيقة)
    setInterval(() => {
        const chan = client.channels.cache.get(WAR_CHANNEL_ID);
        if (chan) addToQueue(chan, `!attack ${TARGET_USER}`);
    }, 1200000);

    // رسالة النقاط (كل 3 ثواني)
    setInterval(() => {
        const chan = client.channels.cache.get(POINTS_CHANNEL_ID);
        if (chan) addToQueue(chan, "ياجماعه جمعو نقاط");
    }, 3000);
});

// مراقبة خروج البوت من الروم الصوتي (الرقابة الدائمة)
client.on('voiceStateUpdate', (oldState, newState) => {
    if (newState.id !== client.user.id) return;
    if (newState.channelId !== AFK_CHANNEL_ID) {
        const guild = newState.guild;
        joinVoiceChannel({ 
            channelId: AFK_CHANNEL_ID, 
            guildId: guild.id, 
            adapterCreator: guild.voiceAdapterCreator, 
            selfMute: true, 
            selfDeaf: false 
        });
    }
});

// مراقبة الدروب (الأمر مرتين + المطالبة مرتين)
client.on('messageCreate', (msg) => {
    if (msg.channel.id === EVENT_CHANNEL_ID && msg.author.id === DROP_BOT_ID && msg.attachments.size > 0) {
        addToQueue(msg.channel, "!event join");
        setTimeout(() => addToQueue(msg.channel, "!event join"), 500);
        setTimeout(() => addToQueue(msg.channel, "!event claim"), 4000);
        setTimeout(() => addToQueue(msg.channel, "!event claim"), 4500);
    }
});

client.login(process.env.token);
