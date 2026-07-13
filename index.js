require('./keep_alive.js');
const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const Tesseract = require('tesseract.js');

const client = new Client();

// ============ الإعدادات ============
const GUILD_ID = '1264561928034975775';
const AFK_CHANNEL_ID = '1496674424693325844';
const ECON_CHANNEL_ID = '1505231947574546472';
const WAR_CHANNEL_ID = '1505231949629882508';
const EVENT_CHANNEL_ID = '1505231963919749193';
const POINTS_CHANNEL_ID = '1503150255594799205';
const DROP_BOT_ID = '1505226573400510464';
const TARGET_USER = '<@1507052275753947157>';

// ============ متغيرات النظام ============
let messageQueue = [];
let isProcessing = false;
let isPaused = false;
let pauseUntil = 0;
let isCheckingImage = false;
let lastDropWindowStart = 0;
let messageCountLastMinute = 0;
let lastMinuteReset = Date.now();

// رسائل عشوائية
const dynamicMessages = [
  "ياجماعه جمعو نقاط 💰",
  "لاتنسوا جمع النقاط 🎯",
  "جمعو النقاط يا اخوان 📊",
  "الحين وقت جمع النقاط ⏰",
  "لازم تجمعوا نقاط 💎",
  "شلون النقاط معاكم؟ 🤔",
  "جمع النقاط أولويتنا 🎪",
  "نقاط جديدة بتنزل 🚀",
];

// ============ نظام الـ Queue المحسّن ============
class EnhancedQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  addTask(task) {
    this.queue.push(task);
    this.process();
  }

  async process() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();

      // إذا الـ pause مفعل وليست أولويات عالية، تجاهل
      if (isPaused && task.priority !== 'HIGH') {
        this.queue.unshift(task); // رجعها للطابور
        break;
      }

      // تنفيذ المهمة
      try {
        task.channel.send(task.content).catch(() => {});
        messageCountLastMinute++;
        console.log(`[✓ SENT] ${task.priority} - "${task.content.substring(0, 40)}..."`);
      } catch (e) {
        console.error(`[✗ ERROR] Failed to send: ${e.message}`);
      }

      // تأخير ذكي (2-3 ثواني)
      const delay = 2000 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      // مراقبة Rate Limit
      checkRateLimit();
    }

    this.isProcessing = false;
  }
}

const queue = new EnhancedQueue();

// ============ مراقبة Rate Limit ============
function checkRateLimit() {
  const now = Date.now();
  if (now - lastMinuteReset > 60000) {
    messageCountLastMinute = 0;
    lastMinuteReset = now;
  }

  if (messageCountLastMinute > 45) {
    console.warn(`[⚠ RATE LIMIT] ${messageCountLastMinute} رسائل في الدقيقة! تأخير إضافي...`);
    isPaused = true;
    pauseUntil = Date.now() + 10000; // pause 10 ثواني
  }
}

// ============ نظام Pause الذكي ============
function pauseTemporarily(duration, reason) {
  isPaused = true;
  pauseUntil = Date.now() + duration;
  console.log(`[⏸ PAUSE] ${reason} لمدة ${duration / 1000} ثانية`);

  const interval = setInterval(() => {
    if (Date.now() >= pauseUntil) {
      isPaused = false;
      clearInterval(interval);
      console.log(`[▶ RESUME] العودة للعمل الطبيعي`);
    }
  }, 1000);
}

// ============ تحليل الصور الذكي ============
async function analyzeDropImage(url, channel) {
  if (isCheckingImage) return;
  isCheckingImage = true;

  console.log(`[📸 ANALYZING] جاري تحليل الصورة...`);

  try {
    const { data: { text, confidence } } = await Tesseract.recognize(url, 'ara');
    console.log(`[📝 TEXT] "${text}"`);
    console.log(`[📊 CONFIDENCE] ${(confidence * 100).toFixed(2)}%`);

    // معايير الكشف الذكية
    const hasDropKeyword = text.includes('دروب') || text.includes('drop');
    const noConfirmationKeyword = !text.includes('نجاح') && !text.includes('جمع') && !text.includes('claim');
    const hasReasonableLength = text.length > 5 && text.length < 200;
    const highConfidence = confidence > 0.6;

    const isRealDrop = hasDropKeyword && noConfirmationKeyword && hasReasonableLength && highConfidence;

    if (isRealDrop) {
      console.log(`[✅ REAL DROP] تم التحقق! تنفيذ الأوامر...`);
      
      // إضافة أوامر الدروب بأولوية عالية
      queue.addTask({ channel, content: '!event join', priority: 'HIGH' });
      setTimeout(() => queue.addTask({ channel, content: '!event join', priority: 'HIGH' }), 500);
      setTimeout(() => queue.addTask({ channel, content: '!event claim', priority: 'HIGH' }), 3000);
      setTimeout(() => queue.addTask({ channel, content: '!event claim', priority: 'HIGH' }), 3500);

      lastDropWindowStart = Date.now();
      pauseTemporarily(90000, 'كشف دروب حقيقي');
    } else {
      console.log(`[❌ FALSE ALARM] صورة تأكيد أو خاطئة، تجاهل`);
    }
  } catch (e) {
    console.error(`[✗ ANALYSIS ERROR] ${e.message}`);
  } finally {
    isCheckingImage = false;
  }
}

// ============ أحداث البوت ============
client.on('ready', async () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ البوت مشغّل: ${client.user.tag}`);
  console.log(`${'='.repeat(50)}\n`);

  // الانضمام للروم الصوتي
  const guild = client.guilds.cache.get(GUILD_ID);
  if (guild) {
    try {
      joinVoiceChannel({
        channelId: AFK_CHANNEL_ID,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfMute: true,
        selfDeaf: false
      });
      console.log(`🔊 انضممت للروم الصوتي`);
    } catch (e) {
      console.error(`[✗] خطأ في الانضمام للروم: ${e.message}`);
    }
  }

  // أوامر البداية
  const econChan = client.channels.cache.get(ECON_CHANNEL_ID);
  if (econChan) {
    queue.addTask({ channel: econChan, content: '!جريمة', priority: 'MEDIUM' });
    queue.addTask({ channel: econChan, content: '!عمل', priority: 'MEDIUM' });
  }

  const warChan = client.channels.cache.get(WAR_CHANNEL_ID);
  if (warChan) {
    queue.addTask({ channel: warChan, content: `!attack ${TARGET_USER}`, priority: 'MEDIUM' });
  }

  // تكرار الأوامر كل ساعة (اقتصاد)
  setInterval(() => {
    const chan = client.channels.cache.get(ECON_CHANNEL_ID);
    if (chan && !isPaused) {
      queue.addTask({ channel: chan, content: '!جريمة', priority: 'MEDIUM' });
      queue.addTask({ channel: chan, content: '!عمل', priority: 'MEDIUM' });
    }
  }, 3600000);

  // تكرار الهجوم كل 20 دقيقة
  setInterval(() => {
    const chan = client.channels.cache.get(WAR_CHANNEL_ID);
    if (chan && !isPaused) {
      queue.addTask({ channel: chan, content: `!attack ${TARGET_USER}`, priority: 'HIGH' });
      pauseTemporarily(45000, 'تنفيذ هجوم');
    }
  }, 1200000);

  // رسائل جمع النقاط العشوائية (كل 5 ثواني)
  setInterval(() => {
    const chan = client.channels.cache.get(POINTS_CHANNEL_ID);
    if (chan && !isPaused) {
      const randomMsg = dynamicMessages[Math.floor(Math.random() * dynamicMessages.length)];
      queue.addTask({ channel: chan, content: randomMsg, priority: 'LOW' });
    }
  }, 5000);
});

// ============ معالجة الرسائل الواردة ============
client.on('messageCreate', (msg) => {
  if (msg.channel.id !== EVENT_CHANNEL_ID) return;

  // كشف الدروبات
  if (msg.author.id === DROP_BOT_ID && msg.attachments.size > 0) {
    const now = Date.now();
    if ((now - lastDropWindowStart) > 900000) {
      analyzeDropImage(msg.attachments.first().url, msg.channel);
    }
  }

  // كشف المنافسين
  if (lastDropWindowStart > 0 && (Date.now() - lastDropWindowStart) < 60000) {
    if (msg.content.includes('!event join') && msg.author.id !== client.user.id) {
      console.log(`[👥 COMPETITOR] تم رصد منافس، انسحاب...`);
      lastDropWindowStart = 0;
    }
  }
});

// ============ معالجة الأخطاء ============
client.on('error', (e) => console.error(`[✗ CLIENT ERROR] ${e.message}`));
process.on('unhandledRejection', (e) => console.error(`[✗ REJECTION] ${e.message}`));

// ============ تسجيل الدخول ============
client.login(process.env.token);
