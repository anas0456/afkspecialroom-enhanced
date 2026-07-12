const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice'); // أضفنا getVoiceConnection
require('./keepalive.js');

const client = new Client();
const GUILD_ID = '1264561928034975775';
const CREATE_CHANNEL_ID = '1496672686707966114';

client.on('ready', async () => {
    console.log(`تم التشغيل كـ ${client.user.tag}`);

    const handleRoom = async () => {
        const guild = client.guilds.cache.get(GUILD_ID);
        if (!guild) return;

        // 1. إغلاق أي اتصال صوتي قديم قبل بدء الجديد (لتجنب الكراش)
        const oldConnection = getVoiceConnection(guild.id);
        if (oldConnection) oldConnection.destroy();

        // 2. الدخول لروم الإنشاء
        joinVoiceChannel({
            channelId: CREATE_CHANNEL_ID,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfMute: true,
            selfDeaf: false
        });

        setTimeout(() => {
            const myRoom = guild.channels.cache.find(c => 
                c.type === 2 && c.members.has(client.user.id) && c.id !== CREATE_CHANNEL_ID
            );

            if (myRoom) {
                console.log(`تم العثور على الروم: ${myRoom.name}`);
                
                joinVoiceChannel({
                    channelId: myRoom.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfMute: true,
                    selfDeaf: false
                });

                // تأكد من وجود صلاحية قبل الإرسال
                const intervalId = setInterval(() => {
                    // التحقق من الروم بشكل آمن
                    const currentChannel = guild.channels.cache.get(myRoom.id);
                    if (currentChannel && currentChannel.members.has(client.user.id)) {
                        currentChannel.send("مرحبا كيفك اخي").catch(() => clearInterval(intervalId));
                    } else {
                        clearInterval(intervalId);
                    }
                }, 2000);
            }
        }, 5000);
    };

    handleRoom();
    setInterval(handleRoom, 60000); 
});

client.login(process.env.token);
