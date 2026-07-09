const { Client } = require('discord.js-selfbot-v13');
const client = new Client();
const keep_alive = require('./keep_alive.js');

client.on('ready', () => {
    console.log(`تم تسجيل الدخول كـ ${client.user.tag}`);
    
    // هنا نحدد الروم الصوتي
    const channel = client.channels.cache.get('1496674843184074945');
    if (channel) {
        channel.join().then(() => {
            console.log("تم الانضمام للروم بنجاح!");
        }).catch(err => console.log("خطأ في الانضمام: " + err));
    }
});

client.login(process.env.token);
