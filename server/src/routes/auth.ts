import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db';
import { authMiddleware, AuthRequest, generateToken } from '../middleware/auth';

const router = Router();

// 注册
router.post('/register', (req, res) => {
  try {
    const { username, password, name, role, phone } = req.body;
    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: '请填写完整信息' });
    }
    if (!['teacher', 'parent', 'admin'].includes(role)) {
      return res.status(400).json({ error: '角色无效' });
    }
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    const hashed = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)'
    ).run(username, hashed, name, role, phone || '');
    const token = generateToken({ id: result.lastInsertRowid as number, username, role, name });
    res.json({ token, user: { id: result.lastInsertRowid, username, name, role, phone } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 登录
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' });
    }
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!user) {
      return res.status(400).json({ error: '用户不存在' });
    }
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ error: '密码错误' });
    }
    const token = generateToken({ id: user.id, username: user.username, role: user.role, name: user.name });
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role, phone: user.phone } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取当前用户信息
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const user = db.prepare('SELECT id, username, name, role, phone, created_at FROM users WHERE id = ?').get(req.user!.id);
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
