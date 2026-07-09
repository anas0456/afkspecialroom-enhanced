const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');

const client = new Client();

client.on('ready', () => {
    console.log(`تم تسجيل الدخول بنجاح كـ ${client.user.tag}`);
    
    // تعريف الروم
    const channelId = '1496674843184074945';

    // دالة الانضمام (لتبسيط الكود)
    const joinVoice = () => {
        const channel = client.channels.cache.get(channelId);
        if (channel) {
            try {
                joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                    selfDeaf: false,
                    selfMute: true
                });
                console.log("تم التأكد من الانضمام للروم!");
            } catch (err) {
                console.error("خطأ في الاتصال:", err);
            }
        }
    };

    // المحاولة الأولى عند التشغيل
    joinVoice();

    // المراقبة: إعادة الاتصال كل 30 ثانية إذا خرج البوت
    setInterval(joinVoice, 30000); 
});

client.login(process.env.token);
