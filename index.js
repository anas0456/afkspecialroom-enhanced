const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
require('./keepalive.js');

const client = new Client();

const GUILD_ID = '1264561928034975775';
const CREATE_CHANNEL_ID = '1496672686707966114'; 

client.on('ready', async () => {
    console.log(`تم التشغيل كـ ${client.user.tag}`);

    const handleRoom = async () => {
        const guild = client.guilds.cache.get(GUILD_ID);
        if (!guild) return;

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
                console.log(`تم العثور على الروم: ${myRoom.name}. البدء في الإرسال...`);
                
                // الانتقال للروم
                joinVoiceChannel({
                    channelId: myRoom.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfMute: true,
                    selfDeaf: false
                });

                // إرسال الرسالة كل ثانيتين (2000 مللي ثانية)
                const intervalId = setInterval(() => {
                    // التحقق من أن البوت لا يزال داخل الروم قبل الإرسال
                    if (myRoom.members.has(client.user.id)) {
                        myRoom.send("مرحبا كيفك اخي").catch(err => {
                            console.log("توقف الإرسال: لا توجد صلاحية أو تم حذف الروم.");
                            clearInterval(intervalId); // إيقاف التكرار إذا فشل الإرسال
                        });
                    } else {
                        clearInterval(intervalId); // إيقاف التكرار إذا خرج البوت من الروم
                    }
                }, 2000);
            }
        }, 5000);
    };

    handleRoom();
    // إعادة فحص الروم كل دقيقة في حال تغير أو حدثت مشكلة
    setInterval(handleRoom, 60000); 
});

client.login(process.env.token);
