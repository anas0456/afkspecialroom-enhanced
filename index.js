require('./keep_alive.js');
const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const { ChannelType } = require('discord.js-selfbot-v13'); // تأكد من استيراد النوع

const client = new Client();

client.on('ready', async () => {
    console.log(`تم تسجيل الدخول بنجاح كـ ${client.user.tag}`);
    
    // آيدي السيرفر الذي سينشئ فيه البوت الروم
    const guildId = '1264561928034975775'; 
    const guild = client.guilds.cache.get(guildId);
    
    if (!guild) return console.log("السيرفر غير موجود!");

    // 1. إنشاء الروم الصوتي
    const newChannel = await guild.channels.create({
        name: 'روم-مؤقت',
        type: ChannelType.GuildVoice,
    });

    const channelId = newChannel.id;
    console.log(`تم إنشاء الروم وآيديه: ${channelId}`);

    // 2. دالة الانضمام والإرسال
    const joinAndTalk = () => {
        const channel = client.channels.cache.get(channelId);
        if (channel) {
            // الانضمام
            joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: true
            });

            // إرسال الرسالة كل ثانيتين
            channel.send("مرحبا كيفك اخي").catch(console.error);
        }
    };

    // التشغيل الأول
    joinAndTalk();

    // إعادة الاتصال والإرسال كل 30 ثانية
    setInterval(joinAndTalk, 30000); 
});

client.login(process.env.token);