import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'home-school-secret-key-2024';

function createDb() {
  const tmpDir = path.join(__dirname, '..', 'tmp-test');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const dbFile = path.join(tmpDir, `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
  const db = new Database(dbFile);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','teacher','parent')),
      phone TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      grade TEXT NOT NULL,
      teacher_id INTEGER NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      student_no TEXT NOT NULL,
      class_id INTEGER NOT NULL,
      parent_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (parent_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS homework (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      teacher_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      due_date TEXT NOT NULL,
      attachment TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (teacher_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      homework_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      content TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','submitted','reviewed')),
      comment TEXT DEFAULT '',
      score INTEGER DEFAULT 0,
      submitted_at DATETIME,
      reviewed_at DATETIME,
      FOREIGN KEY (homework_id) REFERENCES homework(id),
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS homework_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      homework_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      parent_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (homework_id) REFERENCES homework(id),
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (parent_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS homework_reminder_reads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reminder_id INTEGER NOT NULL,
      parent_id INTEGER NOT NULL,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reminder_id) REFERENCES homework_reminders(id),
      FOREIGN KEY (parent_id) REFERENCES users(id),
      UNIQUE(reminder_id, parent_id)
    );
  `);

  (db as any)._file = dbFile;
  return db;
}

function buildApp(db: any) {
  const app = express();
  app.use(express.json());

  function authMiddleware(req: any, res: any, next: any) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: '未登录' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: '登录已过期' });
    }
  }

  function roleGuard(...roles: string[]) {
    return (req: any, res: any, next: any) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: '无权访问' });
      }
      next();
    };
  }

  const router = express.Router();

  router.post('/:id/remind', authMiddleware, roleGuard('teacher'), (req: any, res: any) => {
    try {
      const hw = db.prepare('SELECT * FROM homework WHERE id = ? AND teacher_id = ?').get(req.params.id, req.user.id);
      if (!hw) return res.status(404).json({ error: '作业不存在或无权操作' });
      const todayStr = new Date().toISOString().slice(0, 10);
      if (hw.due_date >= todayStr) {
        return res.status(400).json({ error: '作业尚未到期，暂不能催交' });
      }
      const pendingSubs = db.prepare(
        "SELECT sub.student_id, s.parent_id FROM submissions sub JOIN students s ON s.id = sub.student_id WHERE sub.homework_id = ? AND sub.status = 'pending' AND s.parent_id IS NOT NULL"
      ).all(req.params.id);
      if (pendingSubs.length === 0) return res.json({ success: true, count: 0 });
      const stmt = db.prepare('INSERT INTO homework_reminders (homework_id, student_id, parent_id) VALUES (?, ?, ?)');
      let count = 0;
      for (const s of pendingSubs) {
        const existing = db.prepare('SELECT id FROM homework_reminders WHERE homework_id = ? AND student_id = ?').get(req.params.id, s.student_id);
        if (!existing) {
          stmt.run(req.params.id, s.student_id, s.parent_id);
          count++;
        }
      }
      res.json({ success: true, count });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.use('/api/homework', router);
  return app;
}

function signToken(user: any) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
}

describe('Homework Reminder API - Due Date Validation', () => {
  let db: any;
  let app: any;
  let teacherToken: string;
  let teacherId: number;
  let parentId: number;
  let classId: number;
  let studentId: number;

  function daysFromNow(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function createHomework(dueDate: string) {
    const res = db.prepare('INSERT INTO homework (class_id, teacher_id, title, content, due_date) VALUES (?, ?, ?, ?, ?)').run(
      classId, teacherId, `作业-${dueDate}`, '测试作业内容', dueDate
    );
    const hwId = res.lastInsertRowid;
    db.prepare('INSERT INTO submissions (homework_id, student_id, status) VALUES (?, ?, ?)').run(hwId, studentId, 'pending');
    return hwId;
  }

  beforeEach(() => {
    db = createDb();
    app = buildApp(db);

    const hash = bcrypt.hashSync('123456', 10);
    const tRes = db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)').run('t1', hash, '张老师', 'teacher');
    teacherId = tRes.lastInsertRowid as number;
    teacherToken = signToken({ id: teacherId, username: 't1', role: 'teacher', name: '张老师' });

    const pRes = db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)').run('p1', hash, '赵家长', 'parent');
    parentId = pRes.lastInsertRowid as number;

    const cRes = db.prepare('INSERT INTO classes (name, grade, teacher_id, invite_code) VALUES (?, ?, ?, ?)').run('一班', '三年级', teacherId, 'TESTCODE');
    classId = cRes.lastInsertRowid as number;

    const sRes = db.prepare('INSERT INTO students (name, student_no, class_id, parent_id) VALUES (?, ?, ?, ?)').run('赵小明', '001', classId, parentId);
    studentId = sRes.lastInsertRowid as number;
  });

  afterEach(() => {
    const f = (db as any)._file;
    if (db && db.close) db.close();
    if (f && fs.existsSync(f)) {
      try { fs.unlinkSync(f); } catch {}
      try { fs.unlinkSync(f + '-wal'); } catch {}
      try { fs.unlinkSync(f + '-shm'); } catch {}
    }
  });

  it('作业未到期时调用催交接口返回 400 且不生成提醒', async () => {
    const hwId = createHomework(daysFromNow(5));
    const res = await request(app)
      .post(`/api/homework/${hwId}/remind`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('尚未到期');

    const reminders = db.prepare('SELECT * FROM homework_reminders WHERE homework_id = ?').all(hwId);
    expect(reminders.length).toBe(0);
  });

  it('作业截止日期等于今天仍未过期，返回 400', async () => {
    const hwId = createHomework(daysFromNow(0));
    const res = await request(app)
      .post(`/api/homework/${hwId}/remind`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('尚未到期');

    const reminders = db.prepare('SELECT * FROM homework_reminders WHERE homework_id = ?').all(hwId);
    expect(reminders.length).toBe(0);
  });

  it('作业已到期（截止日期在昨天），调用催交成功并生成提醒', async () => {
    const hwId = createHomework(daysFromNow(-1));
    const res = await request(app)
      .post(`/api/homework/${hwId}/remind`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);

    const reminders = db.prepare('SELECT * FROM homework_reminders WHERE homework_id = ?').all(hwId);
    expect(reminders.length).toBe(1);
    expect(reminders[0].student_id).toBe(studentId);
    expect(reminders[0].parent_id).toBe(parentId);
  });

  it('重复调用催交接口不会生成重复提醒，第二次 count 为 0', async () => {
    const hwId = createHomework(daysFromNow(-2));

    const res1 = await request(app)
      .post(`/api/homework/${hwId}/remind`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res1.status).toBe(200);
    expect(res1.body.count).toBe(1);

    const res2 = await request(app)
      .post(`/api/homework/${hwId}/remind`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res2.status).toBe(200);
    expect(res2.body.count).toBe(0);

    const reminders = db.prepare('SELECT * FROM homework_reminders WHERE homework_id = ?').all(hwId);
    expect(reminders.length).toBe(1);
  });

  it('已到期但所有学生都已提交时，催交成功但 count 为 0', async () => {
    const hw = db.prepare('INSERT INTO homework (class_id, teacher_id, title, content, due_date) VALUES (?, ?, ?, ?, ?)').run(
      classId, teacherId, '全交作业', '测试', daysFromNow(-3)
    );
    const hwId = hw.lastInsertRowid;
    db.prepare('INSERT INTO submissions (homework_id, student_id, status) VALUES (?, ?, ?)').run(hwId, studentId, 'submitted');

    const res = await request(app)
      .post(`/api/homework/${hwId}/remind`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);

    const reminders = db.prepare('SELECT * FROM homework_reminders WHERE homework_id = ?').all(hwId);
    expect(reminders.length).toBe(0);
  });

  it('家长角色调用催交接口返回 403', async () => {
    const hwId = createHomework(daysFromNow(-1));
    const parentToken = signToken({ id: parentId, username: 'p1', role: 'parent', name: '赵家长' });

    const res = await request(app)
      .post(`/api/homework/${hwId}/remind`)
      .set('Authorization', `Bearer ${parentToken}`);

    expect(res.status).toBe(403);
  });

  it('非所属老师调用催交接口返回 404', async () => {
    const hash = bcrypt.hashSync('123456', 10);
    const otherTeacher = db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)').run('t2', hash, '李老师', 'teacher');
    const otherToken = signToken({ id: otherTeacher.lastInsertRowid, username: 't2', role: 'teacher', name: '李老师' });
    const hwId = createHomework(daysFromNow(-1));

    const res = await request(app)
      .post(`/api/homework/${hwId}/remind`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('无权操作');
  });
});
