import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, AuthRequest, roleGuard } from '../middleware/auth';

const router = Router();

// 老师发布作业
router.post('/', authMiddleware, roleGuard('teacher'), (req: AuthRequest, res: Response) => {
  try {
    const { class_id, title, content, due_date, attachment } = req.body;
    if (!class_id || !title || !content || !due_date) return res.status(400).json({ error: '请填写完整作业信息' });
    const result = db.prepare('INSERT INTO homework (class_id, teacher_id, title, content, due_date, attachment) VALUES (?, ?, ?, ?, ?, ?)').run(class_id, req.user!.id, title, content, due_date, attachment || '');
    // Create pending submissions for all students
    const students = db.prepare('SELECT id FROM students WHERE class_id = ?').all(class_id) as any[];
    const stmt = db.prepare('INSERT INTO submissions (homework_id, student_id, status) VALUES (?, ?, ?)');
    const insertMany = db.transaction((students: any[]) => {
      for (const s of students) {
        stmt.run(result.lastInsertRowid, s.id, 'pending');
      }
    });
    insertMany(students);
    res.json({ id: result.lastInsertRowid, title, content, due_date });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取班级作业列表
router.get('/class/:classId', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const homework = db.prepare('SELECT h.*, u.name as teacher_name FROM homework h JOIN users u ON u.id = h.teacher_id WHERE h.class_id = ? ORDER BY h.created_at DESC').all(req.params.classId);
    res.json(homework);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取作业详情（含提交情况）
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const hw = db.prepare('SELECT h.*, u.name as teacher_name, c.name as class_name FROM homework h JOIN users u ON u.id = h.teacher_id JOIN classes c ON c.id = h.class_id WHERE h.id = ?').get(req.params.id) as any;
    if (!hw) return res.status(404).json({ error: '作业不存在' });
    if (req.user!.role === 'teacher') {
      const submissions = db.prepare('SELECT sub.*, s.name as student_name, s.student_no FROM submissions sub JOIN students s ON s.id = sub.student_id WHERE sub.homework_id = ?').all(req.params.id);
      res.json({ ...hw, submissions });
    } else {
      // Parent: get their children's submissions
      const submissions = db.prepare('SELECT sub.*, s.name as student_name FROM submissions sub JOIN students s ON s.id = sub.student_id WHERE sub.homework_id = ? AND s.parent_id = ?').all(req.params.id, req.user!.id);
      res.json({ ...hw, submissions });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 家长提交作业
router.post('/submit/:submissionId', authMiddleware, roleGuard('parent'), (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    const sub = db.prepare('SELECT sub.*, s.parent_id FROM submissions sub JOIN students s ON s.id = sub.student_id WHERE sub.id = ?').get(req.params.submissionId) as any;
    if (!sub) return res.status(404).json({ error: '提交记录不存在' });
    if (sub.parent_id !== req.user!.id) return res.status(403).json({ error: '无权操作' });
    db.prepare("UPDATE submissions SET content = ?, status = 'submitted', submitted_at = CURRENT_TIMESTAMP WHERE id = ?").run(content || '已完成', req.params.submissionId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 老师批改作业
router.post('/review/:submissionId', authMiddleware, roleGuard('teacher'), (req: AuthRequest, res: Response) => {
  try {
    const { comment, score } = req.body;
    const sub = db.prepare('SELECT sub.* FROM submissions sub JOIN homework h ON h.id = sub.homework_id WHERE sub.id = ? AND h.teacher_id = ?').get(req.params.submissionId, req.user!.id) as any;
    if (!sub) return res.status(404).json({ error: '提交记录不存在或无权操作' });
    db.prepare("UPDATE submissions SET comment = ?, score = ?, status = 'reviewed', reviewed_at = CURRENT_TIMESTAMP WHERE id = ?").run(comment || '', score || 0, req.params.submissionId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 老师获取作业完成率统计
router.get('/stats/:classId', authMiddleware, roleGuard('teacher'), (req: AuthRequest, res: Response) => {
  try {
    const stats = db.prepare(`
      SELECT h.id, h.title, h.due_date,
        COUNT(sub.id) as total,
        SUM(CASE WHEN sub.status = 'submitted' OR sub.status = 'reviewed' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN sub.status = 'reviewed' THEN 1 ELSE 0 END) as reviewed
      FROM homework h
      LEFT JOIN submissions sub ON sub.homework_id = h.id
      WHERE h.class_id = ?
      GROUP BY h.id
      ORDER BY h.created_at DESC
    `).all(req.params.classId);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 老师一键催交未提交的学生
router.post('/:id/remind', authMiddleware, roleGuard('teacher'), (req: AuthRequest, res: Response) => {
  try {
    const hw = db.prepare('SELECT * FROM homework WHERE id = ? AND teacher_id = ?').get(req.params.id, req.user!.id) as any;
    if (!hw) return res.status(404).json({ error: '作业不存在或无权操作' });
    const todayStr = new Date().toISOString().slice(0, 10);
    if (hw.due_date >= todayStr) {
      return res.status(400).json({ error: '作业尚未到期，暂不能催交' });
    }
    const pendingSubs = db.prepare(
      "SELECT sub.student_id, s.parent_id FROM submissions sub JOIN students s ON s.id = sub.student_id WHERE sub.homework_id = ? AND sub.status = 'pending' AND s.parent_id IS NOT NULL"
    ).all(req.params.id) as any[];
    if (pendingSubs.length === 0) return res.json({ success: true, count: 0 });
    const stmt = db.prepare('INSERT INTO homework_reminders (homework_id, student_id, parent_id) VALUES (?, ?, ?)');
    const insertMany = db.transaction((subs: any[]) => {
      let count = 0;
      for (const s of subs) {
        const existing = db.prepare('SELECT id FROM homework_reminders WHERE homework_id = ? AND student_id = ?').get(req.params.id, s.student_id);
        if (!existing) {
          stmt.run(req.params.id, s.student_id, s.parent_id);
          count++;
        }
      }
      return count;
    });
    const count = insertMany(pendingSubs);
    res.json({ success: true, count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
