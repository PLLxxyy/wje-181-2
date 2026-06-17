import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, AuthRequest, roleGuard } from '../middleware/auth';

const router = Router();

// 创建考试
router.post('/exams', authMiddleware, roleGuard('teacher'), (req: AuthRequest, res: Response) => {
  try {
    const { name, class_id } = req.body;
    if (!name || !class_id) return res.status(400).json({ error: '请填写考试名称' });
    const result = db.prepare('INSERT INTO exams (name, class_id, teacher_id) VALUES (?, ?, ?)').run(name, class_id, req.user!.id);
    res.json({ id: result.lastInsertRowid, name, class_id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取班级考试列表
router.get('/exams/:classId', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const exams = db.prepare('SELECT * FROM exams WHERE class_id = ? ORDER BY created_at DESC').all(req.params.classId);
    res.json(exams);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 录入成绩（逐个或批量）
router.post('/scores', authMiddleware, roleGuard('teacher'), (req: AuthRequest, res: Response) => {
  try {
    const { exam_id, scores } = req.body;
    // scores: [{ student_id, subject, score }]
    if (!exam_id || !scores || !Array.isArray(scores)) return res.status(400).json({ error: '成绩数据格式错误' });
    const stmt = db.prepare('INSERT INTO scores (exam_id, student_id, subject, score) VALUES (?, ?, ?, ?)');
    const insertMany = db.transaction((items: any[]) => {
      for (const item of items) {
        stmt.run(exam_id, item.student_id, item.subject, item.score);
      }
    });
    insertMany(scores);
    res.json({ success: true, count: scores.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取考试成绩
router.get('/scores/:examId', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role === 'teacher') {
      const scores = db.prepare('SELECT sc.*, s.name as student_name, s.student_no FROM scores sc JOIN students s ON s.id = sc.student_id WHERE sc.exam_id = ? ORDER BY s.student_no, sc.subject').all(req.params.examId);
      res.json(scores);
    } else if (req.user!.role === 'parent') {
      const scores = db.prepare('SELECT sc.*, s.name as student_name FROM scores sc JOIN students s ON s.id = sc.student_id WHERE sc.exam_id = ? AND s.parent_id = ?').all(req.params.examId, req.user!.id);
      res.json(scores);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 老师看全班成绩统计
router.get('/stats/:classId', authMiddleware, roleGuard('teacher'), (req: AuthRequest, res: Response) => {
  try {
    // 成绩分布
    const distribution = db.prepare(`
      SELECT sc.subject,
        CASE
          WHEN sc.score >= 90 THEN '优秀'
          WHEN sc.score >= 80 THEN '良好'
          WHEN sc.score >= 70 THEN '中等'
          WHEN sc.score >= 60 THEN '及格'
          ELSE '不及格'
        END as level,
        COUNT(*) as count
      FROM scores sc
      JOIN students s ON s.id = sc.student_id
      WHERE s.class_id = ?
      GROUP BY sc.subject, level
      ORDER BY sc.subject, level
    `).all(req.params.classId);

    // 排名
    const ranking = db.prepare(`
      SELECT s.id as student_id, s.name as student_name, s.student_no,
        SUM(sc.score) as total_score,
        AVG(sc.score) as avg_score,
        COUNT(DISTINCT sc.subject) as subject_count
      FROM scores sc
      JOIN students s ON s.id = sc.student_id
      WHERE s.class_id = ?
      GROUP BY s.id
      ORDER BY total_score DESC
    `).all(req.params.classId);

    res.json({ distribution, ranking });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 家长获取孩子的成绩趋势
router.get('/trend/:studentId', authMiddleware, roleGuard('parent'), (req: AuthRequest, res: Response) => {
  try {
    const student = db.prepare('SELECT * FROM students WHERE id = ? AND parent_id = ?').get(req.params.studentId, req.user!.id) as any;
    if (!student) return res.status(404).json({ error: '学生不存在' });
    const trend = db.prepare(`
      SELECT e.name as exam_name, sc.subject, sc.score, e.created_at
      FROM scores sc
      JOIN exams e ON e.id = sc.exam_id
      WHERE sc.student_id = ?
      ORDER BY e.created_at, sc.subject
    `).all(req.params.studentId);
    res.json(trend);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
