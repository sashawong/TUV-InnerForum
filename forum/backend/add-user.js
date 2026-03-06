const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

async function addUser() {
  const hashedPassword = await bcrypt.hash('123456', 10);
  
  const newUser = {
    id: Date.now(),
    username: 'Xiaoyun Li',
    password: hashedPassword,
    role: 'user',
    created_at: new Date().toISOString()
  };
  
  db.users.push(newUser);
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  console.log('用户 "Xiaoyun Li" 创建成功！');
  console.log('密码: 123456');
}

addUser();