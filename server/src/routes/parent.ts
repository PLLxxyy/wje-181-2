import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, AuthRequest, roleGuard } from '../middleware/auth';

const router = Router();

// 获取家长绑定的孩子列表
router.get('/children', authMiddleware, roleGuard('parent'), (req: AuthRequest, res: Response) => {
  try {
    const children = db.prepare('SELECT s.*, c.name as class_name, c.grade, c.id as class_id, u.name as teacher_name FROM students s JOIN classes c ON c.id = s.class_id JOIN users u ON u.id = c.teacher_id WHERE s.parent_id = ?').all(req.user!.id);
    res.json(children);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取孩子的作业列表
router.get('/children/:studentId/homework', authMiddleware, roleGuard('parent'), (req: AuthRequest, res: Response) => {
  try {
    const student = db.prepare('SELECT * FROM students WHERE id = ? AND parent_id = ?').get(req.params.studentId, req.user!.id) as any;
    if (!student) return res.status(404).json({ error: '学生不存在' });
    const homework = db.prepare(`
      SELECT h.*, sub.status, sub.score, sub.comment, sub.submitted_at, sub.id as submission_id, sub.content as submitted_content
      FROM homework h
      JOIN submissions sub ON sub.homework_id = h.id AND sub.student_id = ?
      WHERE h.class_id = ?
      ORDER BY h.created_at DESC
    `).all(req.params.studentId, student.class_id);
    res.json(homework);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取孩子成绩
router.get('/children/:studentId/scores', authMiddleware, roleGuard('parent'), (req: AuthRequest, res: Response) => {
  try {
    const student = db.prepare('SELECT * FROM students WHERE id = ? AND parent_id = ?').get(req.params.studentId, req.user!.id) as any;
    if (!student) return res.status(404).json({ error: '学生不存在' });
    const scores = db.prepare(`
      SELECT sc.*, e.name as exam_name
      FROM scores sc
      JOIN exams e ON e.id = sc.exam_id
      WHERE sc.student_id = ?
      ORDER BY e.created_at DESC, sc.subject
    `).all(req.params.studentId);
    res.json(scores);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取孩子出勤记录
router.get('/children/:studentId/attendance', authMiddleware, roleGuard('parent'), (req: AuthRequest, res: Response) => {
  try {
    const student = db.prepare('SELECT * FROM students WHERE id = ? AND parent_id = ?').get(req.params.studentId, req.user!.id) as any;
    if (!student) return res.status(404).json({ error: '学生不存在' });
    const attendance = db.prepare('SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 90').all(req.params.studentId);
    const leaves = db.prepare('SELECT * FROM leave_requests WHERE student_id = ? ORDER BY created_at DESC').all(req.params.studentId);
    res.json({ attendance, leaves });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取通知消息
router.get('/notifications', authMiddleware, roleGuard('parent'), (req: AuthRequest, res: Response) => {
  try {
    const notices = db.prepare(`
      SELECT n.id, n.title, n.content, n.created_at, n.class_id,
        c.name as class_name, c.grade, u.name as teacher_name,
        (SELECT nr.id FROM notice_reads nr WHERE nr.notice_id = n.id AND nr.parent_id = ?) as read_id,
        'notice' as type, NULL as homework_id
      FROM notices n
      JOIN classes c ON c.id = n.class_id
      JOIN students s ON s.class_id = c.id
      JOIN users u ON u.id = n.teacher_id
      WHERE s.parent_id = ?
      GROUP BY n.id
    `).all(req.user!.id, req.user!.id);

    const reminders = db.prepare(`
      SELECT hr.id, h.title || ' - 催交提醒' as title,
        '您的孩子 ' || s.name || ' 尚未提交该作业，请尽快完成。' as content,
        hr.created_at, h.class_id,
        c.name as class_name, c.grade, u.name as teacher_name,
        (SELECT hrr.id FROM homework_reminder_reads hrr WHERE hrr.reminder_id = hr.id AND hrr.parent_id = ?) as read_id,
        'homework_reminder' as type, hr.homework_id
      FROM homework_reminders hr
      JOIN homework h ON h.id = hr.homework_id
      JOIN students s ON s.id = hr.student_id
      JOIN classes c ON c.id = h.class_id
      JOIN users u ON u.id = h.teacher_id
      WHERE hr.parent_id = ?
    `).all(req.user!.id, req.user!.id);

    const all = [...notices, ...reminders].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(all);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 家长标记催交提醒已读
router.post('/reminders/:id/read', authMiddleware, roleGuard('parent'), (req: AuthRequest, res: Response) => {
  try {
    const reminder = db.prepare('SELECT * FROM homework_reminders WHERE id = ? AND parent_id = ?').get(req.params.id, req.user!.id) as any;
    if (!reminder) return res.status(404).json({ error: '提醒不存在' });
    const existing = db.prepare('SELECT * FROM homework_reminder_reads WHERE reminder_id = ? AND parent_id = ?').get(req.params.id, req.user!.id);
    if (!existing) {
      db.prepare('INSERT INTO homework_reminder_reads (reminder_id, parent_id) VALUES (?, ?)').run(req.params.id, req.user!.id);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
