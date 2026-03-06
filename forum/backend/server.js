const express = require('express');
const cors = require('cors');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const dbFile = path.join(__dirname, 'db.json');
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
    require('fs').mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
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
  const authHeader = req.headers['authorization'];
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

const initDB = async () => {
  await db.read();
  db.data = db.data || { users: [], topics: [], replies: [], likes: [], favorites: [], attachments: [], topicImages: [] };
  
  if (db.data.users.length === 0) {
    const adminPassword = await bcrypt.hash('admin123', 10);
    db.data.users.push({
      id: 1,
      username: 'admin',
      password: adminPassword,
      role: 'admin',
      created_at: new Date().toISOString()
    });
    await db.write();
  }
};

initDB();

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    await db.read();
    
    const existingUser = db.data.users.find(u => u.username === username);
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
      created_at: new Date().toISOString()
    };

    db.data.users.push(newUser);
    await db.write();

    const token = jwt.sign({ id: newUser.id, username, role: 'user' }, JWT_SECRET);
    res.json({ token, user: { id: newUser.id, username, role: 'user' } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    await db.read();
    const user = db.data.users.find(u => u.username === username);

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/topics', async (req, res) => {
  try {
    const { search } = req.query;
    await db.read();

    let topics = db.data.topics.map(topic => {
      const author = db.data.users.find(u => u.id === topic.author_id);
      const likeCount = db.data.likes.filter(l => l.topic_id === topic.id && l.like_type === 'like').length;
      const dislikeCount = db.data.likes.filter(l => l.topic_id === topic.id && l.like_type === 'dislike').length;
      const replyCount = db.data.replies.filter(r => r.topic_id === topic.id).length;

      return {
        ...topic,
        tags: typeof topic.tags === 'string' ? JSON.parse(topic.tags) : topic.tags,
        author_name: author ? author.username : 'Unknown',
        like_count: likeCount,
        dislike_count: dislikeCount,
        reply_count: replyCount
      };
    });

    if (search) {
      const searchLower = search.toLowerCase();
      topics = topics.filter(t => 
        t.title.toLowerCase().includes(searchLower) || 
        t.content.toLowerCase().includes(searchLower)
      );
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
    const { id } = req.params;
    await db.read();

    const topic = db.data.topics.find(t => t.id === parseInt(id));
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    const author = db.data.users.find(u => u.id === topic.author_id);
    const likeCount = db.data.likes.filter(l => l.topic_id === topic.id && l.like_type === 'like').length;
    const dislikeCount = db.data.likes.filter(l => l.topic_id === topic.id && l.like_type === 'dislike').length;
    
    const topicReplies = db.data.replies.filter(r => r.topic_id === topic.id);
    
    const replies = topicReplies.map(reply => {
      const replyAuthor = db.data.users.find(u => u.id === reply.author_id);
      const replyLikeCount = db.data.replyLikes.filter(l => l.reply_id === reply.id && l.like_type === 'like').length;
      const replyDislikeCount = db.data.replyLikes.filter(l => l.reply_id === reply.id && l.like_type === 'dislike').length;
      const replyImages = db.data.topicImages.filter(i => i.reply_id === reply.id);
      const replyAttachments = db.data.attachments.filter(a => a.reply_id === reply.id);
      
      return {
        ...reply,
        author_name: replyAuthor ? replyAuthor.username : 'Unknown',
        like_count: replyLikeCount,
        dislike_count: replyDislikeCount,
        images: replyImages,
        attachments: replyAttachments
      };
    });
    
    const images = db.data.topicImages.filter(i => i.topic_id === topic.id && !i.reply_id);
    const attachments = db.data.attachments.filter(a => a.topic_id === topic.id && !a.reply_id);

    const responseData = {
      ...topic,
      tags: typeof topic.tags === 'string' ? JSON.parse(topic.tags) : topic.tags,
      author_name: author ? author.username : 'Unknown',
      like_count: likeCount,
      dislike_count: dislikeCount,
      replies,
      images,
      attachments
    };
    
    console.log('杩斿洖甯栧瓙璇︽儏锛宼ags:', responseData.tags, 'type:', typeof responseData.tags);
    console.log('tags 鏄暟缁勫悧:', Array.isArray(responseData.tags));
    
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/topics', authenticateToken, upload.fields([{ name: 'images', maxCount: 10 }, { name: 'attachments', maxCount: 10 }]), async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    
    const { title, content, post_type, tags } = req.body;
    const author_id = req.user.id;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    await db.read();

    const newTopic = {
      id: Date.now(),
      title,
      content,
      author_id,
      is_pinned: 0,
      post_type: post_type || 'share',
      tags: tags ? JSON.parse(tags) : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.data.topics.push(newTopic);

    // 澶勭悊鍥剧墖涓婁紶
    if (req.files && req.files.images) {
      console.log('Processing images:', req.files.images.length);
      req.files.images.forEach(image => {
        db.data.topicImages.push({
          id: Date.now(),
          topic_id: newTopic.id,
          image_path: image.filename,
          created_at: new Date().toISOString()
        });
      });
    }

    // 澶勭悊闄勪欢涓婁紶
    if (req.files && req.files.attachments) {
      console.log('Processing attachments:', req.files.attachments.length);
      req.files.attachments.forEach(attachment => {
        db.data.attachments.push({
          id: Date.now(),
          topic_id: newTopic.id,
          original_name: attachment.originalname,
          filename: attachment.filename,
          created_at: new Date().toISOString()
        });
      });
    }

    await db.write();

    res.status(201).json({ id: newTopic.id, message: 'Topic created successfully' });
  } catch (error) {
    console.error('Error creating topic:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/topics/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, post_type, tags } = req.body;

    await db.read();
    const topicIndex = db.data.topics.findIndex(t => t.id === parseInt(id));

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
      tags,
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
    const { id } = req.params;

    await db.read();
    const topic = db.data.topics.find(t => t.id === parseInt(id));

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    if (topic.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.data.replies = db.data.replies.filter(r => r.topic_id !== parseInt(id));
    db.data.likes = db.data.likes.filter(l => l.topic_id !== parseInt(id));
    db.data.favorites = db.data.favorites.filter(f => f.topic_id !== parseInt(id));
    db.data.topicImages = db.data.topicImages.filter(i => i.topic_id !== parseInt(id));
    db.data.attachments = db.data.attachments.filter(a => a.topic_id !== parseInt(id));
    db.data.topics = db.data.topics.filter(t => t.id !== parseInt(id));

    await db.write();
    res.json({ message: 'Topic deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/topics/:id/pin', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_pinned } = req.body;

    await db.read();
    const topicIndex = db.data.topics.findIndex(t => t.id === parseInt(id));

    if (topicIndex !== -1) {
      db.data.topics[topicIndex].is_pinned = is_pinned ? 1 : 0;
      await db.write();
    }

    res.json({ message: 'Topic pin status updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/topics/:id/replies', authenticateToken, upload.fields([{ name: 'images', maxCount: 10 }, { name: 'attachments', maxCount: 10 }]), async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parent_id } = req.body;
    const author_id = req.user.id;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    await db.read();

    const newReply = {
      id: Date.now(),
      topic_id: parseInt(id),
      content,
      author_id,
      parent_id: parent_id || null,
      created_at: new Date().toISOString()
    };

    db.data.replies.push(newReply);

    // 澶勭悊鍥剧墖涓婁紶
    if (req.files && req.files.images) {
      req.files.images.forEach(image => {
        db.data.topicImages.push({
          id: Date.now(),
          topic_id: parseInt(id),
          reply_id: newReply.id,
          image_path: image.filename,
          created_at: new Date().toISOString()
        });
      });
    }

    // 澶勭悊闄勪欢涓婁紶
    if (req.files && req.files.attachments) {
      req.files.attachments.forEach(attachment => {
        db.data.attachments.push({
          id: Date.now(),
          topic_id: parseInt(id),
          reply_id: newReply.id,
          original_name: attachment.originalname,
          filename: attachment.filename,
          created_at: new Date().toISOString()
        });
      });
    }

    await db.write();

    res.status(201).json({ id: newReply.id, message: 'Reply created successfully' });
  } catch (error) {
    console.error('Error creating reply:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/topics/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { like_type } = req.body;
    const user_id = req.user.id;

    await db.read();
    const existingLikeIndex = db.data.likes.findIndex(
      l => l.topic_id === parseInt(id) && l.user_id === user_id
    );

    if (existingLikeIndex !== -1) {
      const existingLike = db.data.likes[existingLikeIndex];
      if (existingLike.like_type === like_type) {
        db.data.likes.splice(existingLikeIndex, 1);
        res.json({ message: 'Like removed' });
      } else {
        db.data.likes[existingLikeIndex].like_type = like_type;
        res.json({ message: 'Like updated' });
      }
    } else {
      db.data.likes.push({
        id: Date.now(),
        topic_id: parseInt(id),
        user_id,
        like_type: like_type || 'like',
        created_at: new Date().toISOString()
      });
      res.json({ message: 'Like added' });
    }

    await db.write();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/replies/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { like_type } = req.body;
    const user_id = req.user.id;

    await db.read();
    const existingLikeIndex = db.data.replyLikes.findIndex(
      l => l.reply_id === parseInt(id) && l.user_id === user_id
    );

    if (existingLikeIndex !== -1) {
      const existingLike = db.data.replyLikes[existingLikeIndex];
      if (existingLike.like_type === like_type) {
        db.data.replyLikes.splice(existingLikeIndex, 1);
        res.json({ message: 'Like removed' });
      } else {
        db.data.replyLikes[existingLikeIndex].like_type = like_type;
        res.json({ message: 'Like updated' });
      }
    } else {
      db.data.replyLikes.push({
        id: Date.now(),
        reply_id: parseInt(id),
        user_id,
        like_type: like_type || 'like',
        created_at: new Date().toISOString()
      });
      res.json({ message: 'Like added' });
    }

    await db.write();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/topics/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    await db.read();
    const existingFavoriteIndex = db.data.favorites.findIndex(
      f => f.topic_id === parseInt(id) && f.user_id === user_id
    );

    if (existingFavoriteIndex !== -1) {
      db.data.favorites.splice(existingFavoriteIndex, 1);
      res.json({ message: 'Favorite removed' });
    } else {
      db.data.favorites.push({
        id: Date.now(),
        topic_id: parseInt(id),
        user_id,
        created_at: new Date().toISOString()
      });
      res.json({ message: 'Favorite added' });
    }

    await db.write();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/user/favorites', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    await db.read();

    const favoriteTopicIds = db.data.favorites
      .filter(f => f.user_id === user_id)
      .map(f => f.topic_id);

    const favorites = db.data.topics
      .filter(t => favoriteTopicIds.includes(t.id))
      .map(topic => {
        const author = db.data.users.find(u => u.id === topic.author_id);
        const likeCount = db.data.likes.filter(l => l.topic_id === topic.id && l.like_type === 'like').length;
        const dislikeCount = db.data.likes.filter(l => l.topic_id === topic.id && l.like_type === 'dislike').length;

        return {
          ...topic,
          author_name: author ? author.username : 'Unknown',
          like_count: likeCount,
          dislike_count: dislikeCount
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/user/history', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    await db.read();

    const history = db.data.topics
      .filter(t => t.author_id === user_id)
      .map(topic => {
        const author = db.data.users.find(u => u.id === topic.author_id);
        const likeCount = db.data.likes.filter(l => l.topic_id === topic.id && l.like_type === 'like').length;
        const dislikeCount = db.data.likes.filter(l => l.topic_id === topic.id && l.like_type === 'dislike').length;

        return {
          ...topic,
          author_name: author ? author.username : 'Unknown',
          like_count: likeCount,
          dislike_count: dislikeCount
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/user/messages', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    await db.read();

    const messages = db.data.replies
      .filter(r => r.author_id === user_id)
      .map(reply => {
        const topic = db.data.topics.find(t => t.id === reply.topic_id);
        const replyAuthor = db.data.users.find(u => u.id === reply.author_id);
        
        return {
          ...reply,
          topic_title: topic ? topic.title : 'Unknown',
          author_name: replyAuthor ? replyAuthor.username : 'Unknown',
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/topics/:id/images', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    await db.read();

    const newImage = {
      id: Date.now(),
      topic_id: parseInt(id),
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
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No attachment uploaded' });
    }

    await db.read();

    const newAttachment = {
      id: Date.now(),
      topic_id: parseInt(id),
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
    const users = db.data.users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      created_at: u.created_at
    })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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

    const existingUser = db.data.users.find(u => u.username === username);
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
    const { id } = req.params;
    const { username, password, email, role } = req.body;

    await db.read();
    const userIndex = db.data.users.findIndex(u => u.id === parseInt(id));

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = db.data.users[userIndex];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.data.users[userIndex] = {
        ...user,
        username,
        password: hashedPassword,
        email,
        role
      };
    } else {
      db.data.users[userIndex] = {
        ...user,
        username,
        email,
        role
      };
    }

    await db.write();
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    await db.read();
    db.data.users = db.data.users.filter(u => u.id !== parseInt(id));
    await db.write();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
