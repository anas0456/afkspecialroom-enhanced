require('./keep_alive.js');
const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

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
let scheduledCommands = [];

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

// ============ استخراج الأوقات ============
function extractWaitTime(text) {
  if (!text) return null;
  const patterns = [
    /انتظر\s+(\d+)\s+دقيقة/i,
    /wait\s+(\d+)\s+minutes?/i,
    /انتظر\s+(\d+)\s+ساعة/i,
    /wait\s+(\d+)\s+hours?/i,
    /قبل\s+(\d+)\s+دقيقة/i,
    /in\s+(\d+)\s+minutes?/i,
    /(\d+)\s+دقائق/i,
    /(\d+)\s+minutes?/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let minutes = parseInt(match[1]);
      if (pattern.toString().includes('ساعة') || pattern.toString().includes('hours?')) {
        minutes = minutes * 60;
      }
      return minutes * 60 * 1000;
    }
  }
  return null;
}

// ============ الأوامر المجدولة ============
class ScheduledCommand {
  constructor(channel, command, delayMs, reason) {
    this.channel = channel;
    this.command = command;
    this.executeAt = Date.now() + delayMs;
    this.delayMs = delayMs;
    this.reason = reason;
    this.id = Date.now() + Math.random();
    const delayMin = Math.round(delayMs / 60000);
    const executeTime = new Date(this.executeAt).toLocaleString('ar-SA');
    console.log(`[⏱ WAIT] ${reason} | الانتظار: ${delayMin} دقيقة | التنفيذ في: ${executeTime}`);
  }
  isReady() {
    return Date.now() >= this.executeAt;
  }
  async execute() {
    try {
      await this.channel.send(this.command);
      const delayMin = Math.round(this.delayMs / 60000);
      console.log(`[✅ EXECUTE] ${this.reason} | تم التنفيذ بعد ${delayMin} دقيقة | الأمر: "${this.command}"`);
    } catch (e) {
      console.error(`[✗ EXECUTE ERROR] فشل التنفيذ: ${e.message}`);
    }
  }
}

setInterval(() => {
  scheduledCommands = scheduledCommands.filter(cmd => {
    if (cmd.isReady()) {
      cmd.execute();
      return false;
    }
    return true;
  });
}, 5000);

// ============ Queue المحسّنة ============
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
      if (isPaused && task.priority !== 'HIGH') {
        this.queue.unshift(task);
        break;
      }
      try {
        task.channel.send(task.content).catch(() => {});
        messageCountLastMinute++;
        console.log(`[✓ SENT] ${task.priority} - "${task.content.substring(0, 40)}..."`);
      } catch (e) {
        console.error(`[✗ ERROR] Failed to send: ${e.message}`);
      }
      const delay = 2000 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      checkRateLimit();
    }
    this.isProcessing = false;
  }
}

const queue = new EnhancedQueue();

function checkRateLimit() {
  const now = Date.now();
  if (now - lastMinuteReset > 60000) {
    messageCountLastMinute = 0;
    lastMinuteReset = now;
  }
  if (messageCountLastMinute > 45) {
    console.warn(`[⚠ RATE LIMIT] ${messageCountLastMinute} رسائل في الدقيقة! تأخير إضافي...`);
    isPaused = true;
    pauseUntil = Date.now() + 10000;
  }
}

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

// ============ تحليل الصور ============
async function analyzeImageFast(url, channel) {
  if (isCheckingImage) return;
  isCheckingImage = true;
  console.log(`[📸 ANALYZING] جاري تحليل الصورة...`);
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const enhancedBuffer = await sharp(buffer)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: false })
      .grayscale()
      .sharpen()
      .toBuffer();
    const { data: { text, confidence } } = await Tesseract.recognize(enhancedBuffer, ['ara', 'eng']);
    console.log(`[📝 TEXT] "${text}"`);
    console.log(`[📊 CONFIDENCE] ${(confidence * 100).toFixed(2)}%`);
    const waitTime = extractWaitTime(text);
    let commandType = null;
    if (text.includes('جريمة') || text.includes('crime')) commandType = '!جريمة';
    else if (text.includes('عمل') || text.includes('work')) commandType = '!عمل';
    else if (text.includes('هجوم') || text.includes('attack')) commandType = `!attack ${TARGET_USER}`;
    if (waitTime && commandType) {
      console.log(`[⏱ DETECTED] وقت انتظار: ${Math.round(waitTime / 60000)} دقيقة | الأمر: ${commandType}`);
      const reason = commandType === '!جريمة' ? 'جريمة' : commandType === '!عمل' ? 'عمل' : 'هجوم';
      const scheduled = new ScheduledCommand(channel, commandType, waitTime, reason);
      scheduledCommands.push(scheduled);
      pauseTemporarily(Math.min(waitTime / 2, 30000), `انتظار ${reason}`);
    }
    const hasDropKeyword = text.includes('دروب') || text.includes('drop');
    const noConfirmationKeyword = !text.includes('نجاح') && !text.includes('جمع') && !text.includes('claim');
    const hasReasonableLength = text.length > 5 && text.length < 200;
    const highConfidence = confidence > 0.6;
    const isRealDrop = hasDropKeyword && noConfirmationKeyword && hasReasonableLength && highConfidence;
    if (isRealDrop) {
      console.log(`[✅ REAL DROP] تم التحقق! تنفيذ الأوامر...`);
      queue.addTask({ channel, content: '!event join', priority: 'HIGH' });
      setTimeout(() => queue.addTask({ channel, content: '!event join', priority: 'HIGH' }), 500);
      setTimeout(() => queue.addTask({ channel, content: '!event claim', priority: 'HIGH' }), 3000);
      setTimeout(() => queue.addTask({ channel, content: '!event claim', priority: 'HIGH' }), 3500);
      lastDropWindowStart = Date.now();
      pauseTemporarily(90000, 'كشف دروب حقيقي');
    }
  } catch (e) {
    console.error(`[✗ ANALYSIS ERROR] ${e.message}`);
  } finally {
    isCheckingImage = false;
  }
}

client.on('ready', async () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ البوت مشغّل: ${client.user.tag}`);
  console.log(`🚀 النسخة: 2.0 - محسّنة مع نظام الانتظار الذكي`);
  console.log(`${'='.repeat(60)}\n`);
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
      console.log(`🔊 انضممت للروم الصوتي\n`);
    } catch (e) {
      console.error(`[✗] خطأ في الانضمام للروم: ${e.message}`);
    }
  }
  const econChan = client.channels.cache.get(ECON_CHANNEL_ID);
  if (econChan) {
    queue.addTask({ channel: econChan, content: '!جريمة', priority: 'MEDIUM' });
    queue.addTask({ channel: econChan, content: '!عمل', priority: 'MEDIUM' });
  }
  const warChan = client.channels.cache.get(WAR_CHANNEL_ID);
  if (warChan) {
    queue.addTask({ channel: warChan, content: `!attack ${TARGET_USER}`, priority: 'MEDIUM' });
  }
  setInterval(() => {
    const chan = client.channels.cache.get(ECON_CHANNEL_ID);
    if (chan && !isPaused) {
      queue.addTask({ channel: chan, content: '!جريمة', priority: 'MEDIUM' });
      queue.addTask({ channel: chan, content: '!عمل', priority: 'MEDIUM' });
    }
  }, 3600000);
  setInterval(() => {
    const chan = client.channels.cache.get(WAR_CHANNEL_ID);
    if (chan && !isPaused) {
      queue.addTask({ channel: chan, content: `!attack ${TARGET_USER}`, priority: 'HIGH' });
      pauseTemporarily(45000, 'تنفيذ هجوم');
    }
  }, 1200000);
  setInterval(() => {
    const chan = client.channels.cache.get(POINTS_CHANNEL_ID);
    if (chan && !isPaused) {
      const randomMsg = dynamicMessages[Math.floor(Math.random() * dynamicMessages.length)];
      queue.addTask({ channel: chan, content: randomMsg, priority: 'LOW' });
    }
  }, 5000);
});

client.on('messageCreate', (msg) => {
  // التحقق أولاً: هل الرسالة في السيرفر المطلوب؟
  if (!msg.guild || msg.guild.id !== GUILD_ID) return;

  // معالجة الصور (بشرط أن تكون في القنوات المحددة)
  if (msg.attachments.size > 0) {
    if ([ECON_CHANNEL_ID, WAR_CHANNEL_ID, EVENT_CHANNEL_ID].includes(msg.channel.id)) {
      const url = msg.attachments.first().url;
      console.log(`[📷 IMAGE DETECTED] من القناة: ${msg.channel.name} | من: ${msg.author.username}`);
      analyzeImageFast(url, msg.channel);
    }
  }

  // منطق الـ Drop (في قناة الأحداث فقط)
  if (msg.channel.id === EVENT_CHANNEL_ID) {
    // رصد الدروب من البوت
    if (msg.author.id === DROP_BOT_ID && msg.attachments.size > 0) {
      const now = Date.now();
      if ((now - lastDropWindowStart) > 900000) {
        analyzeImageFast(msg.attachments.first().url, msg.channel);
      }
    }
    
    // رصد المنافسين
    if (lastDropWindowStart > 0 && (Date.now() - lastDropWindowStart) < 60000) {
      if (msg.content.includes('!event join') && msg.author.id !== client.user.id) {
        console.log(`[👥 COMPETITOR] تم رصد منافس، انسحاب...`);
        lastDropWindowStart = 0;
      }
    }
  }
});

client.on('error', (e) => console.error(`[✗ CLIENT ERROR] ${e.message}`));
process.on('unhandledRejection', (e) => console.error(`[✗ REJECTION] ${e.message}`));

client.login(process.env.token);
