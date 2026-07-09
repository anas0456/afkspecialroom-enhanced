const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');

const client = new Client();

client.on('ready', async () => {
    console.log(`تم تسجيل الدخول بنجاح كـ ${client.user.tag}`);
    
    const channelId = '1496674843184074945';
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
            console.log("تم الانضمام للروم بنجاح!");
        } catch (err) {
            console.error("خطأ في الاتصال الصوتي:", err);
        }
    } else {
        console.log("لم يتم العثور على الروم! تأكد من الـ ID.");
    }
});

client.login(process.env.token);
