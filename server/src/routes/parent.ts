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
    // Get all notices for classes where parent has children
    const notices = db.prepare(`
      SELECT n.*, c.name as class_name, c.grade, u.name as teacher_name,
        (SELECT nr.id FROM notice_reads nr WHERE nr.notice_id = n.id AND nr.parent_id = ?) as read_id
      FROM notices n
      JOIN classes c ON c.id = n.class_id
      JOIN students s ON s.class_id = c.id
      JOIN users u ON u.id = n.teacher_id
      WHERE s.parent_id = ?
      GROUP BY n.id
      ORDER BY n.created_at DESC
    `).all(req.user!.id, req.user!.id);
    res.json(notices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
