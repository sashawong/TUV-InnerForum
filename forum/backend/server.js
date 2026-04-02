const express = require('express');
const cors = require('cors');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const TOPIC_POINTS = 10;
const REPLY_POINTS = 3;

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
  topicImages: []
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

const serializeUser = (user) => ({
  id: user.id,
  username: user.username,
  role: user.role,
  email: user.email || null,
  points: user.points || 0,
  created_at: user.created_at
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
      points: topicCount * TOPIC_POINTS + replyCount * REPLY_POINTS
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

const removeUploadedFile = (filename) => {
  if (!filename) {
    return;
  }

  const filePath = path.join(__dirname, 'uploads', filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
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

app.get('/api/topics', async (req, res) => {
  try {
    const { search } = req.query;

    await db.read();
    ensureDbShape();
    recalculateUserPoints();

    let topics = db.data.topics.map(buildTopicResponse);

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
      const { title, content, post_type, tags } = req.body;

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
    const { title, content, post_type, tags } = req.body;

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

    db.data.topics[topicIndex] = {
      ...topic,
      title,
      content,
      post_type,
      tags: normalizeTags(tags),
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
    const { content } = req.body;

    if (!content) {
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

    db.data.replies[replyIndex] = {
      ...reply,
      content,
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
    const { username, password, email } = req.body;

    await db.read();
    ensureDbShape();

    const userIndex = db.data.users.findIndex((user) => user.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const duplicateUser = db.data.users.find(
      (user) => user.username === username && user.id !== req.user.id
    );
    if (duplicateUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const currentUser = db.data.users[userIndex];
    const nextUser = {
      ...currentUser,
      username: username || currentUser.username,
      email: email === undefined ? currentUser.email : email
    };

    if (password) {
      nextUser.password = await bcrypt.hash(password, 10);
    }

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
