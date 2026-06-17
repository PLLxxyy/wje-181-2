import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, AuthRequest, roleGuard } from '../middleware/auth';

const router = Router();

// 获取全校班级列表
router.get('/classes', authMiddleware, roleGuard('admin'), (req: AuthRequest, res: Response) => {
  try {
    const classes = db.prepare(`
      SELECT c.*, u.name as teacher_name, u.phone as teacher_phone,
        COUNT(DISTINCT s.id) as student_count
      FROM classes c
      JOIN users u ON u.id = c.teacher_id
      LEFT JOIN students s ON s.class_id = c.id
      GROUP BY c.id
      ORDER BY c.grade, c.name
    `).all();
    res.json(classes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取教师列表
router.get('/teachers', authMiddleware, roleGuard('admin'), (req: AuthRequest, res: Response) => {
  try {
    const teachers = db.prepare(`
      SELECT u.id, u.username, u.name, u.phone, u.created_at,
        COUNT(DISTINCT c.id) as class_count,
        COUNT(DISTINCT s.id) as student_count
      FROM users u
      LEFT JOIN classes c ON c.teacher_id = u.id
      LEFT JOIN students s ON s.class_id = c.id
      WHERE u.role = 'teacher'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all();
    res.json(teachers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取各班数据汇总
router.get('/summary', authMiddleware, roleGuard('admin'), (req: AuthRequest, res: Response) => {
  try {
    const summary = db.prepare(`
      SELECT c.id, c.name, c.grade, u.name as teacher_name,
        COUNT(DISTINCT s.id) as student_count,
        COUNT(DISTINCT h.id) as homework_count,
        COUNT(DISTINCT n.id) as notice_count,
        COUNT(DISTINCT e.id) as exam_count
      FROM classes c
      JOIN users u ON u.id = c.teacher_id
      LEFT JOIN students s ON s.class_id = c.id
      LEFT JOIN homework h ON h.class_id = c.id
      LEFT JOIN notices n ON n.class_id = c.id
      LEFT JOIN exams e ON e.class_id = c.id
      GROUP BY c.id
      ORDER BY c.grade, c.name
    `).all();

    const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students').get() as any;
    const totalTeachers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'teacher'").get() as any;
    const totalClasses = db.prepare('SELECT COUNT(*) as count FROM classes').get() as any;

    res.json({
      classes: summary,
      stats: {
        total_students: totalStudents.count,
        total_teachers: totalTeachers.count,
        total_classes: totalClasses.count
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 删除教师
router.delete('/teachers/:id', authMiddleware, roleGuard('admin'), (req: AuthRequest, res: Response) => {
  try {
    const teacher = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'teacher'").get(req.params.id);
    if (!teacher) return res.status(404).json({ error: '教师不存在' });
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
