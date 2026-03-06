const bcrypt = require('bcryptjs');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

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

async function addUsers() {
  await db.read();
  
  const usersToAdd = [
    'Pengcheng.Yang',
    'Saul.Shi', 
    'Leon.Chen',
    'Russell.Wang',
    'Guest'
  ];
  
  const password = '123456';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  usersToAdd.forEach(username => {
    // 检查用户是否已存在
    const existingUser = db.data.users.find(user => user.username === username);
    if (!existingUser) {
      const newUser = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        username: username,
        password: hashedPassword,
        role: 'user',
        created_at: new Date().toISOString()
      };
      
      db.data.users.push(newUser);
      console.log(`Added user: ${username}`);
    } else {
      console.log(`User ${username} already exists`);
    }
  });
  
  await db.write();
  console.log('Users added successfully!');
}

addUsers().catch(err => {
  console.error('Error adding users:', err);
});
