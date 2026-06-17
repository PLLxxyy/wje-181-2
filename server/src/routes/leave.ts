import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, AuthRequest, roleGuard } from '../middleware/auth';

const router = Router();

// 家长提交请假申请
router.post('/', authMiddleware, roleGuard('parent'), (req: AuthRequest, res: Response) => {
  try {
    const { student_id, start_date, end_date, reason } = req.body;
    if (!student_id || !start_date || !end_date || !reason) return res.status(400).json({ error: '请填写完整请假信息' });
    const student = db.prepare('SELECT * FROM students WHERE id = ? AND parent_id = ?').get(student_id, req.user!.id) as any;
    if (!student) return res.status(404).json({ error: '学生不存在' });
    const result = db.prepare('INSERT INTO leave_requests (student_id, parent_id, class_id, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?, ?)').run(student_id, req.user!.id, student.class_id, start_date, end_date, reason);
    res.json({ id: result.lastInsertRowid, status: 'pending' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取请假列表
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role === 'parent') {
      const requests = db.prepare('SELECT lr.*, s.name as student_name, c.name as class_name FROM leave_requests lr JOIN students s ON s.id = lr.student_id JOIN classes c ON c.id = lr.class_id WHERE lr.parent_id = ? ORDER BY lr.created_at DESC').all(req.user!.id);
      res.json(requests);
    } else if (req.user!.role === 'teacher') {
      const classId = req.query.class_id;
      if (!classId) return res.status(400).json({ error: '请指定班级' });
      const requests = db.prepare('SELECT lr.*, s.name as student_name, u.name as parent_name FROM leave_requests lr JOIN students s ON s.id = lr.student_id JOIN users u ON u.id = lr.parent_id WHERE lr.class_id = ? ORDER BY lr.created_at DESC').all(classId);
      res.json(requests);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 老师审批请假
router.post('/:id/review', authMiddleware, roleGuard('teacher'), (req: AuthRequest, res: Response) => {
  try {
    const { status, reply } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: '审批状态无效' });
    const lr = db.prepare('SELECT lr.* FROM leave_requests lr WHERE lr.id = ?').get(req.params.id) as any;
    if (!lr) return res.status(404).json({ error: '请假申请不存在' });
    db.prepare('UPDATE leave_requests SET status = ?, reply = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, reply || '', req.params.id);
    // If approved, record attendance
    if (status === 'approved') {
      const startDate = new Date(lr.start_date);
      const endDate = new Date(lr.end_date);
      const stmt = db.prepare('INSERT OR IGNORE INTO attendance (student_id, class_id, date, status, remark) VALUES (?, ?, ?, ?, ?)');
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        stmt.run(lr.student_id, lr.class_id, dateStr, 'leave', '请假批准');
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取学生出勤记录
router.get('/attendance/:studentId', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const attendance = db.prepare('SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC').all(req.params.studentId);
    const leaves = db.prepare('SELECT * FROM leave_requests WHERE student_id = ? ORDER BY created_at DESC').all(req.params.studentId);
    res.json({ attendance, leaves });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
