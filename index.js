const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
// تم تصحيح الاسم هنا مع الشخطة السفلية
require('./keep_alive.js'); 

const client = new Client();
const GUILD_ID = '1264561928034975775';
const CREATE_CHANNEL_ID = '1496672686707966114';

client.on('ready', async () => {
    console.log(`تم التشغيل كـ ${client.user.tag}`);

    const moveToMyRoom = async () => {
        const guild = client.guilds.cache.get(GUILD_ID);
        if (!guild) return;

        // الدخول لروم الإنشاء
        joinVoiceChannel({
            channelId: CREATE_CHANNEL_ID,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfMute: true,
            selfDeaf: false
        });

        setTimeout(() => {
            // البحث عن الروم الجديد (الذي أنت موجود فيه فعلياً)
            const myRoom = guild.channels.cache.find(c => 
                c.type === 2 && 
                c.members.has(client.user.id) && 
                c.id !== CREATE_CHANNEL_ID
            );

            if (myRoom) {
                console.log(`تم الانتقال للروم: ${myRoom.name}`);
                
                // الانتقال للروم الجديد
                joinVoiceChannel({
                    channelId: myRoom.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfMute: true,
                    selfDeaf: false
                });

                // الإرسال كل ثانيتين
                const intervalId = setInterval(() => {
                    if (myRoom.members.has(client.user.id)) {
                        myRoom.send("مرحبا كيفك اخي").catch(() => clearInterval(intervalId));
                    } else {
                        clearInterval(intervalId);
                    }
                }, 2000);
            }
        }, 5000);
    };

    moveToMyRoom();
    setInterval(moveToMyRoom, 60000);
});

client.login(process.env.token);
