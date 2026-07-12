const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
require('./keep_alive.js');

const client = new Client();

const GUILD_ID = '1264561928034975775';
const CREATE_CHANNEL_ID = '1496672686707966114'; // آيدي روم الإنشاء الخاص بـ Temp Voice

client.on('ready', async () => {
    console.log(`تم التشغيل كـ ${client.user.tag}`);

    const handleRoom = async () => {
        const guild = client.guilds.cache.get(GUILD_ID);
        if (!guild) return;

        // 1. الدخول لروم الإنشاء الخاص بالبوت
        joinVoiceChannel({
            channelId: CREATE_CHANNEL_ID,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfMute: true,
            selfDeaf: false
        });

        // 2. الانتظار (ثواني) حتى يقوم بوت Temp Voice بإنشاء الروم الخاص بك
        setTimeout(() => {
            // البحث عن الروم الذي أنشأه Temp Voice وأنت موجود فيه
            const myRoom = guild.channels.cache.find(c => 
                c.type === 2 && // صوتي
                c.members.has(client.user.id) && // أنت موجود فيه
                c.id !== CREATE_CHANNEL_ID // ليس روم الإنشاء الأساسي
            );

            if (myRoom) {
                console.log(`تم الانتقال للروم الجديد: ${myRoom.name}`);
                
                // الانتقال للروم الجديد
                joinVoiceChannel({
                    channelId: myRoom.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfMute: true,
                    selfDeaf: false
                });

                // إرسال الرسالة
                myRoom.send("مرحبا كيفك اخي").catch(console.error);
            }
        }, 5000); // 5 ثواني كافية جداً ليستجيب بوت Temp Voice
    };

    handleRoom();
    // تكرار العملية كل دقيقة لضمان أن البوت دائماً في الروم الخاص بك
    setInterval(handleRoom, 60000);
});

client.login(process.env.token);
