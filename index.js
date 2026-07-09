const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const http = require('http');

const client = new Client();

// هذا الجزء يمنع الـ Crash في Railway
http.createServer((req, res) => {
    res.write("I am alive");
    res.end();
}).listen(process.env.PORT || 8080);

client.on('ready', async () => {
    console.log(`تم تسجيل الدخول كـ ${client.user.tag}`);
    
    const channelId = '1496674843184074945';
    const channel = client.channels.cache.get(channelId);
    
    if (channel) {
        try {
            joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: true
            });
            console.log("تم الانضمام للروم بنجاح!");
        } catch (err) {
            console.error("خطأ في الاتصال الصوتي:", err);
        }
    } else {
        console.log("لم يتم العثور على الروم!");
    }
});

client.login(process.env.token);
