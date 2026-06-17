import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { authMiddleware, AuthRequest, roleGuard } from '../middleware/auth';

const router = Router();

// 老师创建班级
router.post('/', authMiddleware, roleGuard('teacher'), (req: AuthRequest, res: Response) => {
  try {
    const { name, grade } = req.body;
    if (!name || !grade) return res.status(400).json({ error: '请填写班级名称和年级' });
    const inviteCode = uuidv4().substring(0, 8).toUpperCase();
    const result = db.prepare('INSERT INTO classes (name, grade, teacher_id, invite_code) VALUES (?, ?, ?, ?)').run(name, grade, req.user!.id, inviteCode);
    res.json({ id: result.lastInsertRowid, name, grade, invite_code: inviteCode });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取老师的班级列表
router.get('/my', authMiddleware, roleGuard('teacher'), (req: AuthRequest, res: Response) => {
  try {
    const classes = db.prepare('SELECT c.*, COUNT(s.id) as student_count FROM classes c LEFT JOIN students s ON s.class_id = c.id WHERE c.teacher_id = ? GROUP BY c.id').all(req.user!.id);
    res.json(classes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取班级详情
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const cls = db.prepare('SELECT c.*, u.name as teacher_name FROM classes c JOIN users u ON u.id = c.teacher_id WHERE c.id = ?').get(req.params.id) as any;
    if (!cls) return res.status(404).json({ error: '班级不存在' });
    const students = db.prepare('SELECT s.*, u.name as parent_name, u.phone as parent_phone FROM students s LEFT JOIN users u ON u.id = s.parent_id WHERE s.class_id = ?').all(req.params.id);
    res.json({ ...cls, students });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 家长用邀请码绑定学生
router.post('/join', authMiddleware, roleGuard('parent'), (req: AuthRequest, res: Response) => {
  try {
    const { invite_code, student_name, student_no } = req.body;
    if (!invite_code || !student_name) return res.status(400).json({ error: '请填写完整信息' });
    const cls = db.prepare('SELECT * FROM classes WHERE invite_code = ?').get(invite_code) as any;
    if (!cls) return res.status(404).json({ error: '邀请码无效' });
    // Check if already bound
    const existing = db.prepare('SELECT id FROM students WHERE parent_id = ? AND class_id = ?').get(req.user!.id, cls.id);
    if (existing) return res.status(400).json({ error: '您已绑定该班级的学生' });
    const result = db.prepare('INSERT INTO students (name, student_no, class_id, parent_id) VALUES (?, ?, ?, ?)').run(student_name, student_no || '', cls.id, req.user!.id);
    res.json({ id: result.lastInsertRowid, name: student_name, class_id: cls.id, class_name: cls.name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取班级花名册（老师）
router.get('/:id/roster', authMiddleware, roleGuard('teacher'), (req: AuthRequest, res: Response) => {
  try {
    const students = db.prepare('SELECT s.*, u.name as parent_name, u.phone as parent_phone FROM students s LEFT JOIN users u ON u.id = s.parent_id WHERE s.class_id = ? ORDER BY s.student_no').all(req.params.id);
    res.json(students);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
