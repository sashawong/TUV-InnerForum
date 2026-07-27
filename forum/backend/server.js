const express = require('express');
const cors = require('cors');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const { spawn } = require('child_process');
const { PDFDocument, StandardFonts, rgb, degrees } = require('pdf-lib/dist/pdf-lib.js');

const app = express();
const PORT = process.env.PORT || 3001;
const TOPIC_POINTS = 10;
const REPLY_POINTS = 3;
const MAX_UPLOAD_FILE_SIZE = 5 * 1024 * 1024;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const dbFile = process.env.DB_FILE || path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, {
  users: [],
  topics: [],
  replies: [],
  likes: [],
  replyLikes: [],
  favorites: [],
  attachments: [],
  topicImages: [],
  notifications: [],
  appSettings: {
    ai: {
      provider: 'openrouter',
      base_url: 'https://openrouter.ai/api/v1/chat/completions',
      model: 'openrouter/free',
      api_key: '',
      enabled: false
    }
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    try {
      file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
      cb(null, true);
    } catch (error) {
      cb(error);
    }
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const AI_ASSISTANT_USERNAME = 'AI法规助手';
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const INTERNATIONAL_REGULATION_NEWS_QUERY =
  '(site:eur-lex.europa.eu OR site:iso.org OR site:unece.org OR site:tyreseurope.org OR site:type-approval.rdw.nl) REGULATION tyre vehicle UNECE EU ISO type approval';
const TOPIC_MODULES = new Set(['tire', 'lighting', 'vehicle']);

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  });
};

const authenticateAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

const ensureDbShape = () => {
  db.data = db.data || {};
  db.data.users = db.data.users || [];
  db.data.topics = db.data.topics || [];
  db.data.replies = db.data.replies || [];
  db.data.likes = db.data.likes || [];
  db.data.replyLikes = db.data.replyLikes || [];
  db.data.favorites = db.data.favorites || [];
  db.data.attachments = db.data.attachments || [];
  db.data.topicImages = db.data.topicImages || [];
  db.data.notifications = db.data.notifications || [];
  db.data.appSettings = db.data.appSettings || {};
  db.data.appSettings.ai = {
    provider: 'openrouter',
    base_url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'openrouter/free',
    api_key: '',
    enabled: false,
    ...db.data.appSettings.ai
  };
};

const normalizeTags = (tags) => {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return tags;
  }

  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const normalizeTopicModule = (moduleName) => (TOPIC_MODULES.has(moduleName) ? moduleName : 'tire');

const parseDateInput = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const serializeUser = (user) => ({
  id: user.id,
  username: user.username,
  role: user.role,
  email: user.email || null,
  points: user.points || 0,
  login_streak: user.login_streak || 0,
  last_login_date: user.last_login_date || null,
  created_at: user.created_at
});

const serializeAiSettings = (settings, includeSecret = false) => ({
  provider: settings.provider || 'openrouter',
  base_url: settings.base_url || 'https://openrouter.ai/api/v1/chat/completions',
  model: settings.model || 'openrouter/free',
  enabled: Boolean(settings.enabled),
  api_key: includeSecret ? settings.api_key || '' : settings.api_key ? 'configured' : ''
});

const recalculateUserPoints = () => {
  const topicCountByUser = new Map();
  const replyCountByUser = new Map();

  db.data.topics.forEach((topic) => {
    topicCountByUser.set(topic.author_id, (topicCountByUser.get(topic.author_id) || 0) + 1);
  });

  db.data.replies.forEach((reply) => {
    replyCountByUser.set(reply.author_id, (replyCountByUser.get(reply.author_id) || 0) + 1);
  });

  db.data.users = db.data.users.map((user) => {
    const topicCount = topicCountByUser.get(user.id) || 0;
    const replyCount = replyCountByUser.get(user.id) || 0;

    return {
      ...user,
      points: user.role === 'admin' || user.role === 'ai_assistant' ? 0 : topicCount * TOPIC_POINTS + replyCount * REPLY_POINTS
    };
  });
};

const getTopicMetrics = (topicId) => ({
  like_count: db.data.likes.filter((like) => like.topic_id === topicId && like.like_type === 'like').length,
  dislike_count: db.data.likes.filter((like) => like.topic_id === topicId && like.like_type === 'dislike').length,
  reply_count: db.data.replies.filter((reply) => reply.topic_id === topicId).length
});

const buildReplyResponse = (reply) => {
  const author = db.data.users.find((user) => user.id === reply.author_id);

  return {
    ...reply,
    author_name: author ? author.username : 'Unknown',
    author_points: author ? author.points || 0 : 0,
    like_count: db.data.replyLikes.filter((like) => like.reply_id === reply.id && like.like_type === 'like').length,
    dislike_count: db.data.replyLikes.filter((like) => like.reply_id === reply.id && like.like_type === 'dislike').length,
    images: db.data.topicImages.filter((image) => image.reply_id === reply.id),
    attachments: db.data.attachments.filter((attachment) => attachment.reply_id === reply.id)
  };
};

const buildTopicResponse = (topic) => {
  const author = db.data.users.find((user) => user.id === topic.author_id);
  const metrics = getTopicMetrics(topic.id);

  return {
    ...topic,
    module: normalizeTopicModule(topic.module),
    tags: normalizeTags(topic.tags),
    author_name: author ? author.username : 'Unknown',
    author_points: author ? author.points || 0 : 0,
    ...metrics
  };
};

const getReplySearchBlob = (topicId) =>
  db.data.replies
    .filter((reply) => reply.topic_id === topicId)
    .map((reply) => reply.content || '')
    .join(' ');

const getAiAssistantUser = () => db.data.users.find((user) => user.role === 'ai_assistant' || user.username === AI_ASSISTANT_USERNAME);

const createNotification = ({ user_id, type, title, content, topic_id, reply_id, actor_id }) => {
  db.data.notifications.push({
    id: Date.now() + Math.floor(Math.random() * 1000),
    user_id,
    type,
    title,
    content,
    topic_id: topic_id || null,
    reply_id: reply_id || null,
    actor_id: actor_id || null,
    read: false,
    created_at: new Date().toISOString()
  });
};

const notifyNewTopic = (topic) => {
  const author = db.data.users.find((user) => user.id === topic.author_id);
  db.data.users
    .filter((user) => user.id !== topic.author_id && user.role !== 'ai_assistant')
    .forEach((user) => {
      createNotification({
        user_id: user.id,
        type: 'new_topic',
        title: '有新帖子发布',
        content: `${author ? author.username : '用户'} 发布了新帖子：《${topic.title}》`,
        topic_id: topic.id,
        actor_id: topic.author_id
      });
    });
};

const notifyReply = (reply) => {
  const topic = db.data.topics.find((item) => item.id === reply.topic_id);
  const actor = db.data.users.find((user) => user.id === reply.author_id);
  const recipients = new Set();

  if (topic && topic.author_id !== reply.author_id) {
    recipients.add(topic.author_id);
  }

  if (reply.parent_id) {
    const parentReply = db.data.replies.find((item) => item.id === reply.parent_id);
    if (parentReply && parentReply.author_id !== reply.author_id) {
      recipients.add(parentReply.author_id);
    }
  }

  Array.from(recipients)
    .map((userId) => db.data.users.find((user) => user.id === userId))
    .filter((user) => user && user.role !== 'ai_assistant')
    .forEach((user) => {
      createNotification({
        user_id: user.id,
        type: 'reply',
        title: '有新的回复提醒',
        content: `${actor ? actor.username : '用户'} 回复了帖子：《${topic ? topic.title : '未知帖子'}》`,
        topic_id: reply.topic_id,
        reply_id: reply.id,
        actor_id: reply.author_id
      });
    });
};

const buildSnippet = (text, query, radius = 45) => {
  if (!text) {
    return '';
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);

  if (matchIndex === -1) {
    return text.length > radius * 2 ? `${text.slice(0, radius * 2)}...` : text;
  }

  const start = Math.max(0, matchIndex - radius);
  const end = Math.min(text.length, matchIndex + query.length + radius);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return `${prefix}${text.slice(start, end)}${suffix}`;
};

const removeUploadedFile = (filename) => {
  if (!filename) {
    return;
  }

  const filePath = path.join(__dirname, 'uploads', filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const getAttachmentFilePath = (filename) => {
  const uploadRoot = path.resolve(__dirname, 'uploads');
  const filePath = path.resolve(uploadRoot, filename || '');
  if (!filePath.startsWith(uploadRoot)) {
    return null;
  }
  return filePath;
};

const buildDownloadFilename = (originalName, suffix = '') => {
  const parsed = path.parse(originalName || 'attachment');
  return `${parsed.name}${suffix}${parsed.ext || ''}`;
};

const createWatermarkedPdf = async ({ inputPath, watermarkText }) => {
  const sourceBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(sourceBytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  pages.forEach((page) => {
    const { width, height } = page.getSize();
    const fontSize = Math.max(18, Math.min(34, Math.round(width / 24)));
    const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);

    page.drawText(watermarkText, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0, 0.44, 0.73),
      opacity: 0.18,
      rotate: degrees(-32)
    });

    page.drawText(watermarkText, {
      x: 36,
      y: 28,
      size: 8,
      font,
      color: rgb(0.25, 0.25, 0.25),
      opacity: 0.65
    });
  });

  return pdfDoc.save();
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildWatermarkedPreviewHtml = ({ title, fileUrl, watermarkText, unsupported = false }) => `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; font-family: Aptos, "Microsoft YaHei", sans-serif; background: #eef5fa; color: #102030; }
    .bar { background: #0071b9; color: #fff; padding: 14px 22px; font-weight: 700; }
    .wrap { padding: 24px; }
    .stage { position: relative; min-height: 70vh; background: #fff; border: 1px solid #c9dce8; box-shadow: 0 10px 28px rgba(0,79,133,.08); overflow: hidden; }
    .watermark { pointer-events: none; position: absolute; inset: 0; display: grid; place-items: center; opacity: .18; color: #0071b9; font-size: 28px; font-weight: 800; transform: rotate(-30deg); text-align: center; line-height: 1.6; z-index: 2; }
    img { display: block; max-width: 100%; max-height: 82vh; margin: 0 auto; position: relative; z-index: 1; }
    .empty { padding: 48px; text-align: center; }
    .meta { color: #5b6b78; margin-top: 12px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="bar">全球车辆法规分享论坛 | 水印预览</div>
  <div class="wrap">
    <div class="stage">
      <div class="watermark">${escapeHtml(watermarkText)}</div>
      ${unsupported ? `<div class="empty"><h2>该文件格式暂不支持在线预览</h2><p>请返回论坛使用“水印下载”。</p><div class="meta">${escapeHtml(title)}</div></div>` : `<img src="${escapeHtml(fileUrl)}" alt="${escapeHtml(title)}" />`}
    </div>
  </div>
</body>
</html>`;

const runCommand = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `${command} exited with code ${code}`));
      }
    });
  });

const stripMarkdown = (text = '') =>
  text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/\!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+\]\([^)]+\)/g, ' ')
    .replace(/[#>*_\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const wrapTextByWidth = (text, width = 22, maxLines = 10) => {
  const chars = Array.from(text || '');
  const lines = [];
  for (let i = 0; i < chars.length; i += width) {
    lines.push(chars.slice(i, i + width).join(''));
    if (lines.length >= maxLines) {
      break;
    }
  }
  return lines;
};

const buildVideoBodyText = (content) => {
  const cleaned = stripMarkdown(content);
  const lines = wrapTextByWidth(cleaned, 20, 9);
  return lines.join('\n') || '今日热点暂无可展示内容';
};

const buildVoiceoverText = (title, content) => {
  const cleaned = stripMarkdown(content);
  const excerpt = Array.from(cleaned).slice(0, 520).join('');
  return `${title}。${excerpt}。以上是本期法规热点视频解读。`;
};

const createHotspotVideoFile = async ({ dateKey, title, content }) => {
  const videoDir = path.join(__dirname, 'uploads', 'videos');
  fs.mkdirSync(videoDir, { recursive: true });

  const ts = Date.now();
  const baseName = `hotspot-${dateKey}-${ts}`;
  const titleFile = path.join(videoDir, `${baseName}-title.txt`);
  const bodyFile = path.join(videoDir, `${baseName}-body.txt`);
  const speechFile = path.join(videoDir, `${baseName}-speech.txt`);
  const audioFile = path.join(videoDir, `${baseName}.wav`);
  const outputFile = path.join(videoDir, `${baseName}.mp4`);

  fs.writeFileSync(titleFile, title, 'utf8');
  fs.writeFileSync(bodyFile, buildVideoBodyText(content), 'utf8');
  fs.writeFileSync(speechFile, buildVoiceoverText(title, content), 'utf8');

  const fontPath = [
    '/usr/share/fonts/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/TTF/DejaVuSans.ttf'
  ].find((candidate) => fs.existsSync(candidate)) || '/usr/share/fonts/dejavu/DejaVuSans.ttf';
  const filter = [
    `drawtext=fontfile=${fontPath}:textfile=${titleFile}:fontcolor=white:fontsize=27:x=(w-text_w)/2:y=36:box=1:boxcolor=black@0.35:boxborderw=9`,
    `drawtext=fontfile=${fontPath}:textfile=${bodyFile}:fontcolor=white:fontsize=18:line_spacing=7:x=36:y=108:box=1:boxcolor=black@0.28:boxborderw=9`,
    `drawtext=fontfile=${fontPath}:text='TUV AI Hotspot Video':fontcolor=0x93c5fd:fontsize=16:x=(w-text_w)/2:y=h-40`
  ].join(',');

  await runCommand('espeak-ng', ['-v', 'zh', '-s', '150', '-f', speechFile, '-w', audioFile]);

  await runCommand('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'color=c=0x0f172a:s=640x360:d=300',
    '-i',
    audioFile,
    '-vf',
    filter,
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    '-b:a',
    '96k',
    '-pix_fmt',
    'yuv420p',
    '-r',
    '25',
    '-shortest',
    outputFile
  ]);

  fs.unlinkSync(titleFile);
  fs.unlinkSync(bodyFile);
  fs.unlinkSync(speechFile);
  fs.unlinkSync(audioFile);

  const relativePath = `videos/${baseName}.mp4`;
  return {
    video_path: relativePath,
    video_url: `/uploads/${relativePath}`
  };
};

const deleteReplyResources = (replyIds) => {
  const replyIdSet = new Set(replyIds);

  db.data.topicImages
    .filter((image) => replyIdSet.has(image.reply_id))
    .forEach((image) => removeUploadedFile(image.image_path));

  db.data.attachments
    .filter((attachment) => replyIdSet.has(attachment.reply_id))
    .forEach((attachment) => removeUploadedFile(attachment.filename));

  db.data.replyLikes = db.data.replyLikes.filter((like) => !replyIdSet.has(like.reply_id));
  db.data.topicImages = db.data.topicImages.filter((image) => !replyIdSet.has(image.reply_id));
  db.data.attachments = db.data.attachments.filter((attachment) => !replyIdSet.has(attachment.reply_id));
  db.data.notifications = db.data.notifications.filter((notification) => !replyIdSet.has(notification.reply_id));
  db.data.replies = db.data.replies.filter((reply) => !replyIdSet.has(reply.id));
};

const collectReplyTreeIds = (replyId) => {
  const ids = [replyId];
  const children = db.data.replies.filter((reply) => reply.parent_id === replyId);

  children.forEach((child) => {
    ids.push(...collectReplyTreeIds(child.id));
  });

  return ids;
};

const buildTopicAiContext = (topicId) => {
  const topic = db.data.topics.find((item) => item.id === topicId);
  if (!topic) {
    return null;
  }

  const topicView = buildTopicResponse(topic);
  const replies = db.data.replies
    .filter((reply) => reply.topic_id === topicId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((reply) => {
      const author = db.data.users.find((user) => user.id === reply.author_id);
      return {
        author: author ? author.username : 'Unknown',
        created_at: reply.created_at,
        content: reply.content
      };
    });

  return { topic, topicView, replies };
};

const buildRecentTopicsAiContext = (limit = 10) => {
  const parsedLimit = Number(limit);
  const normalizedLimit = Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.floor(parsedLimit), 1), 50) : 10;

  const recentTopics = [...db.data.topics]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, normalizedLimit)
    .map((topic) => {
      const topicView = buildTopicResponse(topic);
      const replies = db.data.replies
        .filter((reply) => reply.topic_id === topic.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map((reply) => {
          const author = db.data.users.find((user) => user.id === reply.author_id);
          return {
            author: author ? author.username : 'Unknown',
            created_at: reply.created_at,
            content: reply.content
          };
        });

      return {
        topic,
        topicView,
        replies
      };
    });

  return {
    limit: normalizedLimit,
    topics: recentTopics
  };
};

const toShanghaiDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getTime() + SHANGHAI_OFFSET_MS).toISOString().slice(0, 10);
};

const getTodayShanghaiDateKey = () => toShanghaiDateKey(new Date());

const isLoopbackRequest = (req) => {
  const remoteAddress = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remoteAddress);
};

const isCronAuthorized = (req) => {
  const expectedSecret = process.env.CRON_SECRET || JWT_SECRET;
  const incomingSecret = req.headers['x-cron-secret'];
  return isLoopbackRequest(req) || (incomingSecret && incomingSecret === expectedSecret);
};

const buildWeeklyHotTopicsAiContext = (dateKey = getTodayShanghaiDateKey()) => {
  const activityTopics = db.data.topics
    .filter((topic) => {
      const author = db.data.users.find((user) => user.id === topic.author_id);
      if (author?.role === 'ai_assistant') {
        return false;
      }

      const topicReplies = db.data.replies.filter((reply) => reply.topic_id === topic.id);
      const topicCreatedToday = toShanghaiDateKey(topic.created_at) === dateKey;
      const repliesToday = topicReplies.filter((reply) => toShanghaiDateKey(reply.created_at) === dateKey);
      return topicCreatedToday || repliesToday.length > 0;
    })
    .map((topic) => {
      const topicView = buildTopicResponse(topic);
      const repliesToday = db.data.replies
        .filter((reply) => reply.topic_id === topic.id && toShanghaiDateKey(reply.created_at) === dateKey)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map((reply) => {
          const author = db.data.users.find((user) => user.id === reply.author_id);
          return {
            author: author ? author.username : 'Unknown',
            created_at: reply.created_at,
            content: reply.content
          };
        });

      return {
        topic,
        topicView,
        repliesToday,
        hot_score: (topicView.reply_count || 0) + (topicView.like_count || 0) * 2 + (topic.is_pinned ? 3 : 0) + repliesToday.length * 3
      };
    })
    .sort((a, b) => b.hot_score - a.hot_score || new Date(b.topic.created_at) - new Date(a.topic.created_at));

  return {
    dateKey,
    topics: activityTopics
  };
};

const decodeXmlEntities = (text = '') =>
  text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'");

const stripHtml = (text = '') => decodeXmlEntities(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const normalizeNewsUrl = (url = '') => {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'utm_smc',
      'fbclid',
      'gclid'
    ].forEach((key) => parsed.searchParams.delete(key));

    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return parsed.toString().replace(/\/$/, '').toLowerCase();
  } catch (error) {
    return String(url || '').split('#')[0].replace(/\/+$/, '').trim().toLowerCase();
  }
};

const normalizeNewsText = (text = '') =>
  String(text || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const createNewsFingerprint = (item) => normalizeNewsText(`${item.title || ''} ${item.description || ''}`);

const calculateTextSimilarity = (left = '', right = '') => {
  const leftTokens = new Set(normalizeNewsText(left).split(' ').filter(Boolean));
  const rightTokens = new Set(normalizeNewsText(right).split(' ').filter(Boolean));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  const intersectionSize = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const unionSize = new Set([...leftTokens, ...rightTokens]).size;
  return unionSize ? intersectionSize / unionSize : 0;
};

const isAiHotspotReportTopic = (topic) => {
  const tags = normalizeTags(topic.tags);
  return (
    /【AI(?:周报|日报)】/.test(topic.title || '') ||
    tags.includes('AI周报') ||
    tags.includes('AI日报') ||
    tags.includes('热点汇总')
  );
};

const extractUrlsFromText = (text = '') => String(text || '').match(/https?:\/\/[^\s)）\]]+/g) || [];

const collectStoredRegulationSources = ({ excludeTopicId } = {}) => {
  const sources = [];

  db.data.topics
    .filter((topic) => topic.id !== excludeTopicId && isAiHotspotReportTopic(topic))
    .forEach((topic) => {
      const storedSources = Array.isArray(topic.metadata?.regulation_sources)
        ? topic.metadata.regulation_sources
        : [];

      storedSources.forEach((source) => {
        sources.push({
          topic_id: topic.id,
          link: source.link || '',
          normalized_link: source.normalized_link || normalizeNewsUrl(source.link),
          normalized_title: source.normalized_title || normalizeNewsText(source.title),
          content_fingerprint: source.content_fingerprint || createNewsFingerprint(source),
          pubDate: source.pubDate || ''
        });
      });

      extractUrlsFromText(topic.content).forEach((link) => {
        sources.push({
          topic_id: topic.id,
          link,
          normalized_link: normalizeNewsUrl(link),
          normalized_title: '',
          content_fingerprint: '',
          pubDate: ''
        });
      });
    });

  return sources;
};

const classifyRegulationNewsItems = (items, options = {}) => {
  const storedSources = collectStoredRegulationSources(options);
  const byLink = new Map();
  const byTitle = new Map();

  storedSources.forEach((source) => {
    if (source.normalized_link) {
      byLink.set(source.normalized_link, [...(byLink.get(source.normalized_link) || []), source]);
    }
    if (source.normalized_title) {
      byTitle.set(source.normalized_title, [...(byTitle.get(source.normalized_title) || []), source]);
    }
  });

  const classified = items.map((item) => {
    const normalizedLink = normalizeNewsUrl(item.link);
    const normalizedTitle = normalizeNewsText(item.title);
    const contentFingerprint = createNewsFingerprint(item);
    const matches = [
      ...(byLink.get(normalizedLink) || []),
      ...(byTitle.get(normalizedTitle) || [])
    ];
    const uniqueMatches = [...new Map(matches.map((match) => [`${match.topic_id}-${match.normalized_link}-${match.normalized_title}`, match])).values()];
    const comparableMatches = uniqueMatches.filter((match) => match.content_fingerprint);
    const duplicateMatch = comparableMatches.find((match) => {
      if (match.content_fingerprint === contentFingerprint) {
        return true;
      }
      return calculateTextSimilarity(match.content_fingerprint, contentFingerprint) >= 0.88;
    });

    let status = 'new';
    let statusLabel = '全新内容';

    if (duplicateMatch) {
      status = 'duplicate';
      statusLabel = '历史重复';
    } else if (comparableMatches.length) {
      status = 'updated';
      statusLabel = '已抓取内容有更新';
    } else if (uniqueMatches.length) {
      status = 'legacy_duplicate';
      statusLabel = '历史链接重复';
    }

    return {
      ...item,
      normalized_link: normalizedLink,
      normalized_title: normalizedTitle,
      content_fingerprint: contentFingerprint,
      status,
      statusLabel
    };
  });

  const selected = classified.filter((item) => item.status === 'new' || item.status === 'updated');
  const fallbackDuplicates = selected.length ? [] : classified.filter((item) => item.status !== 'new' && item.status !== 'updated');

  return {
    selected: (selected.length ? selected : fallbackDuplicates).slice(0, 12),
    classified,
    counts: classified.reduce(
      (total, item) => ({
        ...total,
        [item.status]: (total[item.status] || 0) + 1
      }),
      { new: 0, updated: 0, duplicate: 0, legacy_duplicate: 0 }
    ),
    usedFallbackDuplicates: !selected.length && fallbackDuplicates.length > 0
  };
};

const parseBingSearchResults = (htmlText) => {
  const blocks = htmlText.match(/<li class="b_algo"[\s\S]*?<\/li>/gi) || [];
  return blocks
    .map((block) => {
      const titleMatch = block.match(/<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      const snippetMatch = block.match(/<p>([\s\S]*?)<\/p>/i);
      const metaMatch = block.match(/<span class="news_dt">([\s\S]*?)<\/span>/i);

      if (!titleMatch) {
        return null;
      }

      return {
        link: decodeXmlEntities(titleMatch[1]).trim(),
        title: stripHtml(titleMatch[2]),
        description: snippetMatch ? stripHtml(snippetMatch[1]) : '',
        pubDate: metaMatch ? stripHtml(metaMatch[1]) : ''
      };
    })
    .filter(Boolean);
};

const fetchInternationalRegulationNews = async () => {
  const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(INTERNATIONAL_REGULATION_NEWS_QUERY)}`;
  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123 Safari/537.36'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'News feed request failed');
  }

  const htmlText = await response.text();
  const items = parseBingSearchResults(htmlText)
    .filter((item) => item.title && item.link && !/\/search\?/.test(item.link))
    .slice(0, 12);

  return items;
};

const callAiAssistant = async ({ systemPrompt, userPrompt }) => {
  const aiSettings = db.data.appSettings.ai;
  if (!aiSettings.enabled || !aiSettings.api_key) {
    throw new Error('AI assistant is not configured yet');
  }

  const response = await fetch(aiSettings.base_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiSettings.api_key}`,
      'HTTP-Referer': 'http://111.229.65.240/',
      'X-Title': 'TUV Inner Forum AI Assistant'
    },
    body: JSON.stringify({
      model: aiSettings.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'AI request failed');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
};

const initDB = async () => {
  await db.read();
  ensureDbShape();

  if (db.data.users.length === 0) {
    const adminPassword = await bcrypt.hash('admin123', 10);
    db.data.users.push({
      id: 1,
      username: 'admin',
      password: adminPassword,
      role: 'admin',
      email: null,
      points: 0,
      created_at: new Date().toISOString()
    });
  }

  if (!getAiAssistantUser()) {
    const aiPassword = await bcrypt.hash(`ai-${Date.now()}`, 10);
    db.data.users.push({
      id: Date.now() + 1,
      username: AI_ASSISTANT_USERNAME,
      password: aiPassword,
      role: 'ai_assistant',
      email: null,
      points: 0,
      created_at: new Date().toISOString()
    });
  }

  recalculateUserPoints();
  await db.write();
};

initDB();

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    await db.read();
    ensureDbShape();

    const existingUser = db.data.users.find((user) => user.username === username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now(),
      username,
      password: hashedPassword,
      email: email || null,
      role: 'user',
      points: 0,
      created_at: new Date().toISOString()
    };

    db.data.users.push(newUser);
    await db.write();

    const token = jwt.sign({ id: newUser.id, username, role: newUser.role }, JWT_SECRET);
    res.json({ token, user: serializeUser(newUser) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    await db.read();
    ensureDbShape();

    const user = db.data.users.find((item) => item.username === username);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    recalculateUserPoints();
    const today = getTodayShanghaiDateKey();
    const yesterday = toShanghaiDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    user.login_streak = user.last_login_date === today
      ? user.login_streak || 1
      : user.last_login_date === yesterday
        ? (user.login_streak || 0) + 1
        : 1;
    user.last_login_date = today;
    await db.write();

    const refreshedUser = db.data.users.find((item) => item.id === user.id) || user;
    const token = jwt.sign(
      { id: refreshedUser.id, username: refreshedUser.username, role: refreshedUser.role },
      JWT_SECRET
    );

    res.json({ token, user: serializeUser(refreshedUser) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/settings/ai', authenticateToken, async (req, res) => {
  try {
    await db.read();
    ensureDbShape();
    res.json(serializeAiSettings(db.data.appSettings.ai, req.user.role === 'admin'));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/settings/ai', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { provider, base_url, model, api_key, enabled } = req.body;
    await db.read();
    ensureDbShape();

    db.data.appSettings.ai = {
      ...db.data.appSettings.ai,
      provider: provider || db.data.appSettings.ai.provider,
      base_url: base_url || db.data.appSettings.ai.base_url,
      model: model || db.data.appSettings.ai.model,
      enabled: typeof enabled === 'boolean' ? enabled : db.data.appSettings.ai.enabled,
      api_key: typeof api_key === 'string' ? api_key : db.data.appSettings.ai.api_key
    };

    await db.write();
    res.json({
      message: 'AI settings updated successfully',
      settings: serializeAiSettings(db.data.appSettings.ai, true)
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    await db.read();
    ensureDbShape();

    const notifications = db.data.notifications
      .filter((notification) => notification.user_id === req.user.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const unread_count = notifications.filter((notification) => !notification.read).length;
    res.json({ unread_count, notifications });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/notifications/read', authenticateToken, async (req, res) => {
  try {
    const { id, all } = req.body;
    await db.read();
    ensureDbShape();

    db.data.notifications = db.data.notifications.map((notification) => {
      if (notification.user_id !== req.user.id) {
        return notification;
      }

      if (all || notification.id === id) {
        return { ...notification, read: true };
      }

      return notification;
    });

    await db.write();
    res.json({ message: 'Notifications updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/topics', async (req, res) => {
  try {
    const { search, module: moduleName } = req.query;

    await db.read();
    ensureDbShape();
    recalculateUserPoints();

    let topics = db.data.topics.map(buildTopicResponse);

    if (moduleName && TOPIC_MODULES.has(String(moduleName))) {
      topics = topics.filter((topic) => topic.module === moduleName);
    }

    if (search) {
      const searchLower = String(search).trim().toLowerCase();
      topics = topics.filter((topic) => {
        const tagsText = normalizeTags(topic.tags).join(' ').toLowerCase();
        const repliesText = getReplySearchBlob(topic.id).toLowerCase();

        return [topic.title, topic.content, topic.author_name, tagsText, repliesText]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(searchLower));
      });
    }

    topics.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) {
        return b.is_pinned - a.is_pinned;
      }

      return new Date(b.created_at) - new Date(a.created_at);
    });

    res.json(topics);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();

    if (!query) {
      return res.json({
        query: '',
        total: 0,
        titles: [],
        contents: [],
        replies: []
      });
    }

    await db.read();
    ensureDbShape();
    recalculateUserPoints();

    const lowerQuery = query.toLowerCase();
    const titles = [];
    const contents = [];
    const replies = [];

    db.data.topics.forEach((topic) => {
      const topicView = buildTopicResponse(topic);

      if ((topic.title || '').toLowerCase().includes(lowerQuery)) {
        titles.push({
          topic_id: topic.id,
          title: topic.title,
          author_name: topicView.author_name,
          author_points: topicView.author_points,
          created_at: topic.created_at,
          tags: topicView.tags,
          post_type: topic.post_type,
          snippet: buildSnippet(topic.title, query, 20)
        });
      }

      if ((topic.content || '').toLowerCase().includes(lowerQuery)) {
        contents.push({
          topic_id: topic.id,
          title: topic.title,
          author_name: topicView.author_name,
          author_points: topicView.author_points,
          created_at: topic.created_at,
          tags: topicView.tags,
          post_type: topic.post_type,
          snippet: buildSnippet(topic.content, query, 70)
        });
      }
    });

    db.data.replies.forEach((reply) => {
      if (!(reply.content || '').toLowerCase().includes(lowerQuery)) {
        return;
      }

      const topic = db.data.topics.find((item) => item.id === reply.topic_id);
      const author = db.data.users.find((user) => user.id === reply.author_id);

      replies.push({
        reply_id: reply.id,
        topic_id: reply.topic_id,
        topic_title: topic ? topic.title : 'Unknown',
        author_name: author ? author.username : 'Unknown',
        author_points: author ? author.points || 0 : 0,
        created_at: reply.created_at,
        snippet: buildSnippet(reply.content, query, 70)
      });
    });

    const sortByCreatedAt = (a, b) => new Date(b.created_at) - new Date(a.created_at);
    titles.sort(sortByCreatedAt);
    contents.sort(sortByCreatedAt);
    replies.sort(sortByCreatedAt);

    res.json({
      query,
      total: titles.length + contents.length + replies.length,
      titles,
      contents,
      replies
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/topics/:id', async (req, res) => {
  try {
    const topicId = Number(req.params.id);

    await db.read();
    ensureDbShape();
    recalculateUserPoints();

    const topic = db.data.topics.find((item) => item.id === topicId);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    const replies = db.data.replies
      .filter((reply) => reply.topic_id === topicId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(buildReplyResponse);

    const responseData = {
      ...buildTopicResponse(topic),
      replies,
      images: db.data.topicImages.filter((image) => image.topic_id === topicId && !image.reply_id),
      attachments: db.data.attachments.filter((attachment) => attachment.topic_id === topicId && !attachment.reply_id)
    };

    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post(
  '/api/topics',
  authenticateToken,
  upload.fields([{ name: 'images', maxCount: 10 }, { name: 'attachments', maxCount: 10 }]),
  async (req, res) => {
    try {
      const { title, content, post_type, tags, module: moduleName } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }

      await db.read();
      ensureDbShape();

      const newTopic = {
        id: Date.now(),
        title,
        content,
        author_id: req.user.id,
        is_pinned: 0,
        post_type: post_type || 'share',
        module: normalizeTopicModule(moduleName),
        tags: normalizeTags(tags),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      db.data.topics.push(newTopic);

      if (req.files && req.files.images) {
        req.files.images.forEach((image, index) => {
          db.data.topicImages.push({
            id: Number(`${Date.now()}${index}`),
            topic_id: newTopic.id,
            image_path: image.filename,
            created_at: new Date().toISOString()
          });
        });
      }

      if (req.files && req.files.attachments) {
        req.files.attachments.forEach((attachment, index) => {
          db.data.attachments.push({
            id: Number(`${Date.now()}${index}`),
            topic_id: newTopic.id,
            original_name: attachment.originalname,
            filename: attachment.filename,
            created_at: new Date().toISOString()
          });
        });
      }

      notifyNewTopic(newTopic);
      recalculateUserPoints();
      await db.write();

      res.status(201).json({ id: newTopic.id, message: 'Topic created successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

app.put('/api/topics/:id', authenticateToken, async (req, res) => {
  try {
    const topicId = Number(req.params.id);
    const { title, content, post_type, tags, module: moduleName, created_at } = req.body;

    await db.read();
    ensureDbShape();

    const topicIndex = db.data.topics.findIndex((topic) => topic.id === topicId);
    if (topicIndex === -1) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    const topic = db.data.topics[topicIndex];
    if (topic.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (created_at !== undefined && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can change publish time' });
    }

    const parsedCreatedAt = created_at !== undefined ? parseDateInput(created_at) : null;
    if (created_at !== undefined && !parsedCreatedAt) {
      return res.status(400).json({ error: 'Invalid publish time' });
    }

    db.data.topics[topicIndex] = {
      ...topic,
      ...(title !== undefined ? { title } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(post_type !== undefined ? { post_type } : {}),
      ...(tags !== undefined ? { tags: normalizeTags(tags) } : {}),
      ...(moduleName !== undefined ? { module: normalizeTopicModule(moduleName) } : {}),
      ...(parsedCreatedAt ? { created_at: parsedCreatedAt } : {}),
      updated_at: new Date().toISOString()
    };

    await db.write();
    res.json({ message: 'Topic updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/topics/:id', authenticateToken, async (req, res) => {
  try {
    const topicId = Number(req.params.id);

    await db.read();
    ensureDbShape();

    const topic = db.data.topics.find((item) => item.id === topicId);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    if (topic.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const replyIds = db.data.replies.filter((reply) => reply.topic_id === topicId).map((reply) => reply.id);
    deleteReplyResources(replyIds);

    db.data.likes = db.data.likes.filter((like) => like.topic_id !== topicId);
    db.data.favorites = db.data.favorites.filter((favorite) => favorite.topic_id !== topicId);

    db.data.topicImages
      .filter((image) => image.topic_id === topicId && !image.reply_id)
      .forEach((image) => removeUploadedFile(image.image_path));
    db.data.attachments
      .filter((attachment) => attachment.topic_id === topicId && !attachment.reply_id)
      .forEach((attachment) => removeUploadedFile(attachment.filename));

    db.data.topicImages = db.data.topicImages.filter((image) => image.topic_id !== topicId);
    db.data.attachments = db.data.attachments.filter((attachment) => attachment.topic_id !== topicId);
    db.data.notifications = db.data.notifications.filter((notification) => notification.topic_id !== topicId);
    db.data.topics = db.data.topics.filter((item) => item.id !== topicId);

    recalculateUserPoints();
    await db.write();

    res.json({ message: 'Topic deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/topics/:id/pin', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const topicId = Number(req.params.id);
    const { is_pinned } = req.body;

    await db.read();
    ensureDbShape();

    const topicIndex = db.data.topics.findIndex((topic) => topic.id === topicId);
    if (topicIndex === -1) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    db.data.topics[topicIndex].is_pinned = is_pinned ? 1 : 0;
    await db.write();

    res.json({ message: 'Topic pin status updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post(
  '/api/topics/:id/replies',
  authenticateToken,
  upload.fields([{ name: 'images', maxCount: 10 }, { name: 'attachments', maxCount: 10 }]),
  async (req, res) => {
    try {
      const topicId = Number(req.params.id);
      const { content, parent_id } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }

      await db.read();
      ensureDbShape();

      const topic = db.data.topics.find((item) => item.id === topicId);
      if (!topic) {
        return res.status(404).json({ error: 'Topic not found' });
      }

      const newReply = {
        id: Date.now(),
        topic_id: topicId,
        content,
        author_id: req.user.id,
        parent_id: parent_id ? Number(parent_id) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      db.data.replies.push(newReply);

      if (req.files && req.files.images) {
        req.files.images.forEach((image, index) => {
          db.data.topicImages.push({
            id: Number(`${Date.now()}${index}`),
            topic_id: topicId,
            reply_id: newReply.id,
            image_path: image.filename,
            created_at: new Date().toISOString()
          });
        });
      }

      if (req.files && req.files.attachments) {
        req.files.attachments.forEach((attachment, index) => {
          db.data.attachments.push({
            id: Number(`${Date.now()}${index}`),
            topic_id: topicId,
            reply_id: newReply.id,
            original_name: attachment.originalname,
            filename: attachment.filename,
            created_at: new Date().toISOString()
          });
        });
      }

      notifyReply(newReply);
      recalculateUserPoints();
      await db.write();

      res.status(201).json({ id: newReply.id, message: 'Reply created successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

app.put('/api/replies/:id', authenticateToken, async (req, res) => {
  try {
    const replyId = Number(req.params.id);
    const { content, created_at } = req.body;

    if (content === undefined && created_at === undefined) {
      return res.status(400).json({ error: 'Content or reply time is required' });
    }

    if (content !== undefined && !String(content).trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    await db.read();
    ensureDbShape();

    const replyIndex = db.data.replies.findIndex((reply) => reply.id === replyId);
    if (replyIndex === -1) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    const reply = db.data.replies[replyIndex];
    if (reply.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (created_at !== undefined && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can change reply time' });
    }

    const parsedCreatedAt = created_at !== undefined ? parseDateInput(created_at) : null;
    if (created_at !== undefined && !parsedCreatedAt) {
      return res.status(400).json({ error: 'Invalid reply time' });
    }

    db.data.replies[replyIndex] = {
      ...reply,
      ...(content !== undefined ? { content: String(content).trim() } : {}),
      ...(parsedCreatedAt ? { created_at: parsedCreatedAt } : {}),
      updated_at: new Date().toISOString()
    };

    await db.write();
    res.json({ message: 'Reply updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/replies/:id', authenticateToken, async (req, res) => {
  try {
    const replyId = Number(req.params.id);

    await db.read();
    ensureDbShape();

    const reply = db.data.replies.find((item) => item.id === replyId);
    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    if (reply.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const replyIds = collectReplyTreeIds(replyId);
    deleteReplyResources(replyIds);

    recalculateUserPoints();
    await db.write();

    res.json({ message: 'Reply deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/ai/topics/:id/reply', authenticateToken, async (req, res) => {
  try {
    const topicId = Number(req.params.id);
    await db.read();
    ensureDbShape();

    const context = buildTopicAiContext(topicId);
    if (!context) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    const aiUser = getAiAssistantUser();
    const aiReplyContent = await callAiAssistant({
      systemPrompt: '你是一名法规论坛中的 AI 法规助手。请根据帖子内容和已有回复，给出谨慎、结构清晰、实用的中文回复。不要编造法规编号，不确定时请明确说明需要进一步核实。',
      userPrompt: `请阅读下面的帖子与回复，并直接生成一条论坛回复。\n\n帖子标题：${context.topic.title}\n帖子内容：${context.topic.content}\n标签：${context.topicView.tags.join(', ')}\n\n已有回复：\n${context.replies.map((reply, index) => `${index + 1}. ${reply.author}：${reply.content}`).join('\n') || '暂无回复'}`
    });

    const newReply = {
      id: Date.now(),
      topic_id: topicId,
      content: aiReplyContent,
      author_id: aiUser.id,
      parent_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.data.replies.push(newReply);
    notifyReply(newReply);
    recalculateUserPoints();
    await db.write();

    res.json({ message: 'AI reply created successfully', reply_id: newReply.id });
  } catch (error) {
    res.status(500).json({ error: error.message || 'AI reply failed' });
  }
});

app.post('/api/ai/reports/summary', authenticateToken, async (req, res) => {
  try {
    const { count } = req.body || {};
    await db.read();
    ensureDbShape();

    const context = buildRecentTopicsAiContext(count);
    if (!context.topics.length) {
      return res.status(404).json({ error: '暂无可汇总的帖子' });
    }

    const aiUser = getAiAssistantUser();
    const reportContent = await callAiAssistant({
      systemPrompt: '你是一名法规论坛中的 AI 法规助手。请把最近多篇帖子及其回复整理成适合论坛发布的中文汇总帖。结构必须包含：一、近期讨论概览；二、高频问题与风险点；三、当前结论与共识；四、建议的后续动作。内容要适合直接发成新帖，不要编造法规编号，不确定时请明确标注待核实。',
      userPrompt: `请汇总最近 ${context.limit} 篇论坛帖子及回复，生成一篇新的论坛汇总贴。\n\n${context.topics
        .map(
          (item, index) =>
            `第${index + 1}篇\n标题：${item.topic.title}\n作者：${item.topicView.author_name}\n发布时间：${item.topic.created_at}\n标签：${item.topicView.tags.join(', ') || '无'}\n正文：${item.topic.content}\n回复：\n${
              item.replies.map((reply, replyIndex) => `${replyIndex + 1}. ${reply.author}：${reply.content}`).join('\n') || '暂无回复'
            }`
        )
        .join('\n\n')}`
    });

    const latestTopicTitle = context.topics[0]?.topic.title || '近期讨论';
    const reportTitle = `【AI汇总】最近${context.limit}帖汇总：${latestTopicTitle}`;
    const newTopic = {
      id: Date.now(),
      title: reportTitle,
      content: reportContent,
      author_id: aiUser.id,
      is_pinned: 0,
      post_type: 'share',
      module: 'tire',
      tags: Array.from(new Set([...context.topics.flatMap((item) => item.topicView.tags || []), 'AI报告', '汇总'])),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.data.topics.push(newTopic);
    notifyNewTopic(newTopic);
    recalculateUserPoints();
    await db.write();

    res.json({ message: 'AI summary report topic created successfully', topic_id: newTopic.id, source_count: context.limit });
  } catch (error) {
    res.status(500).json({ error: error.message || 'AI summary report failed' });
  }
});

app.post('/api/ai/reports/daily-hotspots', async (req, res) => {
  try {
    if (!isCronAuthorized(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { date, force } = req.body || {};
    await db.read();
    ensureDbShape();

    const targetDate = date || getTodayShanghaiDateKey();
    const aiUser = getAiAssistantUser();
    const reportTitle = `【AI日报】${targetDate} 国际法规热点汇总`;
    const existingTopic = db.data.topics.find(
      (topic) => topic.author_id === aiUser.id && topic.title === reportTitle
    );
    const newsItems = await fetchInternationalRegulationNews();
    const newsSelection = classifyRegulationNewsItems(newsItems, {
      excludeTopicId: force ? existingTopic?.id : undefined
    });
    const selectedNewsItems = newsSelection.selected;

    if (!selectedNewsItems.length) {
      return res.json({ message: 'No international regulation news found for the selected day', skipped: true, date: targetDate });
    }

    if (existingTopic && !force) {
      return res.json({
        message: 'Daily hotspot report already exists',
        skipped: true,
        topic_id: existingTopic.id,
        date: targetDate
      });
    }

    const reportContent = await callAiAssistant({
      systemPrompt:
        '你是一名法规论坛中的 AI 法规助手。请根据指定法规网站抓取到的国际法规信息，整理成一篇适合直接发帖的中文日报。结构必须包含：一、今日国际法规热点概览；二、重点法规动态；三、对轮胎/汽车合规可能产生的影响；四、建议关注与后续动作。不要编造法规编号，不确定时请明确写出待核实，并在文末保留消息来源列表。本日报按增量原则生成：优先写全新内容和已抓取但明显更新的内容；如果只有重复来源，明确说明今日未发现新增，仅作为重复来源复核。',
      userPrompt: `请汇总 ${targetDate} 抓取到的法规信息，生成一篇新的论坛 AI 日报。优先关注 EUR-Lex、ISO、UNECE、Tyres Europe、RDW Type Approval。\n\n筛选原则：\n- 全新内容：必须优先写入。\n- 已抓取内容有更新：也要写入，并说明是更新追踪。\n- 历史重复：只有在当天没有全新/更新内容时才作为保底复核。\n\n本次抓取统计：全新 ${newsSelection.counts.new || 0} 条，已抓取但有更新 ${newsSelection.counts.updated || 0} 条，历史重复 ${newsSelection.counts.duplicate || 0} 条，历史链接重复 ${newsSelection.counts.legacy_duplicate || 0} 条。${newsSelection.usedFallbackDuplicates ? '\n注意：本次没有发现全新或明确更新内容，以下来源属于重复来源保底复核。' : ''}\n\n以下是本次入选的标题、摘要和链接：\n\n${selectedNewsItems
        .map(
          (item, index) => `新闻${index + 1}\n状态：${item.statusLabel}\n标题：${item.title}\n发布时间：${item.pubDate || '未知'}\n摘要：${item.description || '无摘要'}\n链接：${item.link}`
        )
        .join('\n\n')}`
    });

    const newTopic = {
      id: Date.now(),
      title: reportTitle,
      content: reportContent,
      author_id: aiUser.id,
      is_pinned: 0,
      post_type: 'share',
      module: 'tire',
      tags: ['AI日报', '国际法规', '热点汇总'],
      metadata: {
        regulation_sources: selectedNewsItems.map((item) => ({
          title: item.title,
          link: item.link,
          description: item.description || '',
          pubDate: item.pubDate || '',
          status: item.status,
          statusLabel: item.statusLabel,
          normalized_link: item.normalized_link,
          normalized_title: item.normalized_title,
          content_fingerprint: item.content_fingerprint
        })),
        regulation_source_counts: newsSelection.counts,
        used_fallback_duplicates: newsSelection.usedFallbackDuplicates
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingTopic && force) {
      const existingIndex = db.data.topics.findIndex((topic) => topic.id === existingTopic.id);
      db.data.topics[existingIndex] = { ...existingTopic, ...newTopic, id: existingTopic.id };
      await db.write();
      return res.json({
        message: 'Daily hotspot report updated successfully',
        topic_id: existingTopic.id,
        source_count: selectedNewsItems.length,
        source_counts: newsSelection.counts,
        used_fallback_duplicates: newsSelection.usedFallbackDuplicates,
        date: targetDate
      });
    }

    db.data.topics.push(newTopic);
    notifyNewTopic(newTopic);
    recalculateUserPoints();
    await db.write();

    res.json({
      message: 'Daily hotspot report created successfully',
      topic_id: newTopic.id,
      source_count: selectedNewsItems.length,
      source_counts: newsSelection.counts,
      used_fallback_duplicates: newsSelection.usedFallbackDuplicates,
      date: targetDate
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'AI daily hotspot report failed' });
  }
});

app.post('/api/ai/videos/hotspot', authenticateToken, async (req, res) => {
  try {
    const { date, force } = req.body || {};
    await db.read();
    ensureDbShape();

    const targetDate = date || getTodayShanghaiDateKey();
    const aiUser = getAiAssistantUser();
    const dailyReportTitle = `【AI日报】${targetDate} 国际法规热点汇总`;
    let dailyReportTopic = db.data.topics.find(
      (topic) => topic.author_id === aiUser.id && topic.title === dailyReportTitle
    );

    let reportDateForVideo = targetDate;
    if (!dailyReportTopic) {
      const latestReport = [...db.data.topics]
        .filter((topic) => topic.author_id === aiUser.id && /^【AI(周报|日报)】\d{4}-\d{2}-\d{2}\s/.test(topic.title))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

      if (!latestReport) {
        return res.status(404).json({ error: `未找到可用的 AI 日报，请先生成日报` });
      }

      dailyReportTopic = latestReport;
      const dateMatch = latestReport.title.match(/^【AI(?:周报|日报)】(\d{4}-\d{2}-\d{2})\s/);
      if (dateMatch) {
        reportDateForVideo = dateMatch[1];
      }
    }

    const videoTitle = `【AI热点视频】${reportDateForVideo} 法规热点解读`;
    const existingVideoTopic = db.data.topics.find(
      (topic) => topic.author_id === aiUser.id && topic.title === videoTitle
    );

    if (existingVideoTopic && !force) {
      return res.json({
        message: '热点视频已存在',
        skipped: true,
        topic_id: existingVideoTopic.id,
        date: targetDate
      });
    }

    const hotContext = buildWeeklyHotTopicsAiContext(reportDateForVideo);
    const topHotTopics = hotContext.topics.slice(0, 8);

    const videoScriptContent = await callAiAssistant({
      systemPrompt:
        '你是一名法规论坛中的 AI 法规助手。请把输入的法规热点日报转化成一条可直接发布的中文“热点视频脚本贴”。输出必须包含：一、视频标题；二、30秒开场文案；三、3-5个核心看点（每点含讲解要点）；四、结尾行动建议；五、建议画面分镜（按时间轴列出）。内容要专业、可执行、避免编造法规编号。',
      userPrompt: `请基于以下 AI 日报，生成一条热点视频脚本。\n\n日报标题：${dailyReportTopic.title}\n日报正文：\n${dailyReportTopic.content}\n\n近期论坛内活跃讨论（用于补充语境）：\n${topHotTopics
        .map(
          (item, index) =>
            `${index + 1}. ${item.topic.title}\n作者：${item.topicView.author_name}\n标签：${(item.topicView.tags || []).join(', ') || '无'}\n热度分：${item.hot_score}`
        )
        .join('\n\n') || '暂无'}`
    });

    const videoAsset = await createHotspotVideoFile({
      dateKey: reportDateForVideo,
      title: videoTitle,
      content: videoScriptContent
    });

    const newVideoTopic = {
      id: Date.now(),
      title: videoTitle,
      content: videoScriptContent,
      author_id: aiUser.id,
      is_pinned: 0,
      post_type: 'share',
      tags: ['AI视频', '热点视频', '国际法规'],
      video_path: videoAsset.video_path,
      video_url: videoAsset.video_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingVideoTopic && force) {
      const existingIndex = db.data.topics.findIndex((topic) => topic.id === existingVideoTopic.id);
      db.data.topics[existingIndex] = { ...existingVideoTopic, ...newVideoTopic, id: existingVideoTopic.id };
      await db.write();
      return res.json({
        message: '热点视频已更新',
        topic_id: existingVideoTopic.id,
        date: reportDateForVideo,
        video_url: videoAsset.video_url
      });
    }

    db.data.topics.push(newVideoTopic);
    notifyNewTopic(newVideoTopic);
    recalculateUserPoints();
    await db.write();

    res.json({
      message: '热点视频已生成',
      topic_id: newVideoTopic.id,
      date: reportDateForVideo,
      video_url: newVideoTopic.video_url
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'AI hotspot video generation failed' });
  }
});

app.post('/api/videos/external', authenticateToken, async (req, res) => {
  try {
    const { title, video_url, content, tags } = req.body || {};

    if (!title || !video_url) {
      return res.status(400).json({ error: '标题和视频链接必填' });
    }

    if (!/^https?:\/\//i.test(video_url)) {
      return res.status(400).json({ error: '视频链接必须以 http:// 或 https:// 开头' });
    }

    await db.read();
    ensureDbShape();

    const newTopic = {
      id: Date.now(),
      title,
      content: content || `外部视频链接：${video_url}`,
      author_id: req.user.id,
      is_pinned: 0,
      post_type: 'share',
      tags: Array.isArray(tags) && tags.length ? tags : ['视频', '外部视频'],
      video_url,
      video_external: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.data.topics.push(newTopic);
    notifyNewTopic(newTopic);
    recalculateUserPoints();
    await db.write();

    res.status(201).json({
      message: '外部视频已加入视频专栏',
      topic_id: newTopic.id,
      video_url: newTopic.video_url
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'External video creation failed' });
  }
});

app.post('/api/topics/:id/like', authenticateToken, async (req, res) => {
  try {
    const topicId = Number(req.params.id);
    const { like_type } = req.body;
    const userId = req.user.id;

    await db.read();
    ensureDbShape();

    const existingLikeIndex = db.data.likes.findIndex(
      (like) => like.topic_id === topicId && like.user_id === userId
    );

    if (existingLikeIndex !== -1) {
      const existingLike = db.data.likes[existingLikeIndex];
      if (existingLike.like_type === like_type) {
        db.data.likes.splice(existingLikeIndex, 1);
      } else {
        db.data.likes[existingLikeIndex].like_type = like_type;
      }
    } else {
      db.data.likes.push({
        id: Date.now(),
        topic_id: topicId,
        user_id: userId,
        like_type: like_type || 'like',
        created_at: new Date().toISOString()
      });
    }

    await db.write();
    res.json({ message: 'Topic reaction updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/replies/:id/like', authenticateToken, async (req, res) => {
  try {
    const replyId = Number(req.params.id);
    const { like_type } = req.body;
    const userId = req.user.id;

    await db.read();
    ensureDbShape();

    const existingLikeIndex = db.data.replyLikes.findIndex(
      (like) => like.reply_id === replyId && like.user_id === userId
    );

    if (existingLikeIndex !== -1) {
      const existingLike = db.data.replyLikes[existingLikeIndex];
      if (existingLike.like_type === like_type) {
        db.data.replyLikes.splice(existingLikeIndex, 1);
      } else {
        db.data.replyLikes[existingLikeIndex].like_type = like_type;
      }
    } else {
      db.data.replyLikes.push({
        id: Date.now(),
        reply_id: replyId,
        user_id: userId,
        like_type: like_type || 'like',
        created_at: new Date().toISOString()
      });
    }

    await db.write();
    res.json({ message: 'Reply reaction updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/topics/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const topicId = Number(req.params.id);
    const userId = req.user.id;

    await db.read();
    ensureDbShape();

    const existingFavoriteIndex = db.data.favorites.findIndex(
      (favorite) => favorite.topic_id === topicId && favorite.user_id === userId
    );

    if (existingFavoriteIndex !== -1) {
      db.data.favorites.splice(existingFavoriteIndex, 1);
    } else {
      db.data.favorites.push({
        id: Date.now(),
        topic_id: topicId,
        user_id: userId,
        created_at: new Date().toISOString()
      });
    }

    await db.write();
    res.json({ message: 'Favorite status updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    await db.read();
    ensureDbShape();
    recalculateUserPoints();

    const user = db.data.users.find((item) => item.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const topicCount = db.data.topics.filter((topic) => topic.author_id === user.id).length;
    const replyCount = db.data.replies.filter((reply) => reply.author_id === user.id).length;

    await db.write();

    res.json({
      ...serializeUser(user),
      topic_count: topicCount,
      reply_count: replyCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { username, email } = req.body;

    await db.read();
    ensureDbShape();

    const userIndex = db.data.users.findIndex((user) => user.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = db.data.users[userIndex];
    if (username && username !== currentUser.username) {
      return res.status(400).json({ error: '用户名不可修改' });
    }

    const nextUser = {
      ...currentUser,
      email: email === undefined ? currentUser.email : email
    };

    db.data.users[userIndex] = nextUser;
    await db.write();

    res.json({
      message: 'Profile updated successfully',
      user: serializeUser(nextUser)
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/user/password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password) {
      return res.status(400).json({ error: '当前密码和新密码必填' });
    }

    if (String(new_password).length < 6) {
      return res.status(400).json({ error: '新密码至少 6 位' });
    }

    await db.read();
    ensureDbShape();

    const userIndex = db.data.users.findIndex((user) => user.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = db.data.users[userIndex];
    const validPassword = await bcrypt.compare(current_password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: '当前密码不正确' });
    }

    db.data.users[userIndex] = {
      ...user,
      password: await bcrypt.hash(new_password, 10)
    };
    await db.write();

    res.json({ message: '密码已更新' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/user/favorites', authenticateToken, async (req, res) => {
  try {
    await db.read();
    ensureDbShape();
    recalculateUserPoints();

    const favoriteTopicIds = db.data.favorites
      .filter((favorite) => favorite.user_id === req.user.id)
      .map((favorite) => favorite.topic_id);

    const favorites = db.data.topics
      .filter((topic) => favoriteTopicIds.includes(topic.id))
      .map(buildTopicResponse)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/user/history', authenticateToken, async (req, res) => {
  try {
    await db.read();
    ensureDbShape();
    recalculateUserPoints();

    const history = db.data.topics
      .filter((topic) => topic.author_id === req.user.id)
      .map(buildTopicResponse)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/user/messages', authenticateToken, async (req, res) => {
  try {
    await db.read();
    ensureDbShape();
    recalculateUserPoints();

    const messages = db.data.replies
      .filter((reply) => reply.author_id === req.user.id)
      .map((reply) => {
        const topic = db.data.topics.find((item) => item.id === reply.topic_id);

        return {
          ...buildReplyResponse(reply),
          topic_title: topic ? topic.title : 'Unknown'
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    await db.read();
    ensureDbShape();
    recalculateUserPoints();

    const leaderboard = db.data.users
      .filter((user) => user.role !== 'admin')
      .map((user) => {
        const topic_count = db.data.topics.filter((topic) => topic.author_id === user.id).length;
        const reply_count = db.data.replies.filter((reply) => reply.author_id === user.id).length;

        return {
          ...serializeUser(user),
          topic_count,
          reply_count
        };
      })
      .sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }

        if (b.topic_count !== a.topic_count) {
          return b.topic_count - a.topic_count;
        }

        return b.reply_count - a.reply_count;
      });

    await db.write();
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/topics/:id/images', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const topicId = Number(req.params.id);

    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    await db.read();
    ensureDbShape();

    const newImage = {
      id: Date.now(),
      topic_id: topicId,
      image_path: req.file.filename,
      created_at: new Date().toISOString()
    };

    db.data.topicImages.push(newImage);
    await db.write();

    res.status(201).json({ id: newImage.id, image_path: req.file.filename });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/topics/:id/attachments', authenticateToken, upload.single('attachment'), async (req, res) => {
  try {
    const topicId = Number(req.params.id);

    if (!req.file) {
      return res.status(400).json({ error: 'No attachment uploaded' });
    }

    await db.read();
    ensureDbShape();

    const newAttachment = {
      id: Date.now(),
      topic_id: topicId,
      filename: req.file.filename,
      original_name: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      created_at: new Date().toISOString()
    };

    db.data.attachments.push(newAttachment);
    await db.write();

    res.status(201).json({
      id: newAttachment.id,
      filename: req.file.filename,
      original_name: req.file.originalname
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/attachments/:id/download-watermarked', authenticateToken, async (req, res) => {
  try {
    const attachmentId = Number(req.params.id);
    await db.read();
    ensureDbShape();

    const attachment = db.data.attachments.find((item) => item.id === attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const filePath = getAttachmentFilePath(attachment.filename);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Attachment file not found' });
    }

    const ext = path.extname(attachment.original_name || attachment.filename || '').toLowerCase();
    const downloadedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const watermarkText = `Global Vehicle Regulation Forum | ${req.user.username} | ${downloadedAt}`;

    if (ext === '.pdf') {
      const watermarkedPdf = await createWatermarkedPdf({ inputPath: filePath, watermarkText });
      const filename = buildDownloadFilename(attachment.original_name, '-watermarked');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader('Cache-Control', 'no-store');
      return res.send(Buffer.from(watermarkedPdf));
    }

    res.setHeader('X-Watermark-Notice', encodeURIComponent('当前文件格式暂不支持可见水印，已下载原文件'));
    return res.download(filePath, attachment.original_name || attachment.filename);
  } catch (error) {
    res.status(500).json({ error: 'Watermarked download failed' });
  }
});

app.get('/api/attachments/:id/preview-watermarked', authenticateToken, async (req, res) => {
  try {
    const attachmentId = Number(req.params.id);
    await db.read();
    ensureDbShape();

    const attachment = db.data.attachments.find((item) => item.id === attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const filePath = getAttachmentFilePath(attachment.filename);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Attachment file not found' });
    }

    const originalName = attachment.original_name || attachment.filename || 'attachment';
    const ext = path.extname(originalName).toLowerCase();
    const viewedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const watermarkText = `Global Vehicle Regulation Forum | ${req.user.username} | ${viewedAt}`;

    if (ext === '.pdf') {
      const watermarkedPdf = await createWatermarkedPdf({ inputPath: filePath, watermarkText });
      const filename = buildDownloadFilename(originalName, '-preview');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader('Cache-Control', 'no-store');
      return res.send(Buffer.from(watermarkedPdf));
    }

    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return res.send(buildWatermarkedPreviewHtml({
        title: originalName,
        fileUrl: `/uploads/${encodeURIComponent(attachment.filename)}`,
        watermarkText
      }));
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(buildWatermarkedPreviewHtml({
      title: originalName,
      watermarkText,
      unsupported: true
    }));
  } catch (error) {
    res.status(500).json({ error: 'Watermarked preview failed' });
  }
});

app.get('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    await db.read();
    ensureDbShape();
    recalculateUserPoints();

    const users = db.data.users
      .map(serializeUser)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { username, password, email, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    await db.read();
    ensureDbShape();

    const existingUser = db.data.users.find((user) => user.username === username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now(),
      username,
      password: hashedPassword,
      email: email || null,
      role: role || 'user',
      points: 0,
      created_at: new Date().toISOString()
    };

    db.data.users.push(newUser);
    await db.write();

    res.status(201).json({ id: newUser.id, message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/users/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { username, password, email, role } = req.body;

    await db.read();
    ensureDbShape();

    const userIndex = db.data.users.findIndex((user) => user.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const duplicateUser = db.data.users.find(
      (user) => user.username === username && user.id !== userId
    );
    if (duplicateUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const currentUser = db.data.users[userIndex];
    const nextUser = {
      ...currentUser,
      username: username || currentUser.username,
      email: email === undefined ? currentUser.email : email,
      role: role || currentUser.role
    };

    if (password) {
      nextUser.password = await bcrypt.hash(password, 10);
    }

    db.data.users[userIndex] = nextUser;
    await db.write();

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    await db.read();
    ensureDbShape();

    db.data.users = db.data.users.filter((user) => user.id !== userId);
    await db.write();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: '单个上传文件不能超过 5MB' });
    }

    return res.status(400).json({ error: `文件上传失败：${error.message}` });
  }

  next(error);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
