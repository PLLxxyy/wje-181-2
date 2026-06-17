import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, AuthRequest, roleGuard } from '../middleware/auth';

const router = Router();

// 老师发布通知
router.post('/', authMiddleware, roleGuard('teacher'), (req: AuthRequest, res: Response) => {
  try {
    const { class_id, title, content } = req.body;
    if (!class_id || !title || !content) return res.status(400).json({ error: '请填写完整通知信息' });
    const result = db.prepare('INSERT INTO notices (class_id, teacher_id, title, content) VALUES (?, ?, ?, ?)').run(class_id, req.user!.id, title, content);
    res.json({ id: result.lastInsertRowid, title, content });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取班级通知列表
router.get('/class/:classId', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const notices = db.prepare('SELECT n.*, u.name as teacher_name FROM notices n JOIN users u ON u.id = n.teacher_id WHERE n.class_id = ? ORDER BY n.created_at DESC').all(req.params.classId);
    if (req.user!.role === 'parent') {
      // Add read status for parent
      const enriched = notices.map((n: any) => {
        const read = db.prepare('SELECT * FROM notice_reads WHERE notice_id = ? AND parent_id = ?').get(n.id, req.user!.id);
        return { ...n, is_read: !!read };
      });
      res.json(enriched);
    } else {
      // Add read count for teacher
      const enriched = notices.map((n: any) => {
        const readCount = db.prepare('SELECT COUNT(*) as count FROM notice_reads WHERE notice_id = ?').get(n.id) as any;
        const totalParents = db.prepare('SELECT COUNT(DISTINCT s.parent_id) as count FROM students s WHERE s.class_id = ? AND s.parent_id IS NOT NULL').get(req.params.classId) as any;
        return { ...n, read_count: readCount.count, total_parents: totalParents.count };
      });
      res.json(enriched);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取通知详情
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const notice = db.prepare('SELECT n.*, u.name as teacher_name, c.name as class_name FROM notices n JOIN users u ON u.id = n.teacher_id JOIN classes c ON c.id = n.class_id WHERE n.id = ?').get(req.params.id) as any;
    if (!notice) return res.status(404).json({ error: '通知不存在' });
    if (req.user!.role === 'teacher') {
      const reads = db.prepare('SELECT nr.*, u.name as parent_name FROM notice_reads nr JOIN users u ON u.id = nr.parent_id WHERE nr.notice_id = ?').all(req.params.id);
      res.json({ ...notice, reads });
    } else {
      const read = db.prepare('SELECT * FROM notice_reads WHERE notice_id = ? AND parent_id = ?').get(req.params.id, req.user!.id);
      res.json({ ...notice, is_read: !!read });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 家长签收通知
router.post('/:id/read', authMiddleware, roleGuard('parent'), (req: AuthRequest, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM notice_reads WHERE notice_id = ? AND parent_id = ?').get(req.params.id, req.user!.id);
    if (!existing) {
      db.prepare('INSERT INTO notice_reads (notice_id, parent_id) VALUES (?, ?)').run(req.params.id, req.user!.id);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
