import bcrypt from 'bcryptjs';
import db from './db';
import { v4 as uuidv4 } from 'uuid';

function seed() {
  console.log('Seeding database...');

  // Clear existing data
  db.exec(`
    DELETE FROM attendance;
    DELETE FROM leave_requests;
    DELETE FROM notice_reads;
    DELETE FROM notices;
    DELETE FROM scores;
    DELETE FROM exams;
    DELETE FROM submissions;
    DELETE FROM homework;
    DELETE FROM students;
    DELETE FROM classes;
    DELETE FROM users;
  `);

  const hash = bcrypt.hashSync('123456', 10);

  // Admin
  db.prepare("INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)").run('admin', hash, '系统管理员', 'admin', '13800000000');

  // Teachers
  db.prepare("INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)").run('teacher1', hash, '张老师', 'teacher', '13811111111');
  db.prepare("INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)").run('teacher2', hash, '李老师', 'teacher', '13822222222');
  db.prepare("INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)").run('teacher3', hash, '王老师', 'teacher', '13833333333');

  // Parents
  db.prepare("INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)").run('parent1', hash, '赵家长', 'parent', '13911111111');
  db.prepare("INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)").run('parent2', hash, '钱家长', 'parent', '13922222222');
  db.prepare("INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)").run('parent3', hash, '孙家长', 'parent', '13933333333');
  db.prepare("INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)").run('parent4', hash, '周家长', 'parent', '13944444444');
  db.prepare("INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)").run('parent5', hash, '吴家长', 'parent', '13955555555');

  // Classes
  const code1 = 'CLASS001A';
  const code2 = 'CLASS002B';
  const code3 = 'CLASS003C';
  db.prepare("INSERT INTO classes (name, grade, teacher_id, invite_code) VALUES (?, ?, ?, ?)").run('一班', '三年级', 2, code1);
  db.prepare("INSERT INTO classes (name, grade, teacher_id, invite_code) VALUES (?, ?, ?, ?)").run('二班', '三年级', 3, code2);
  db.prepare("INSERT INTO classes (name, grade, teacher_id, invite_code) VALUES (?, ?, ?, ?)").run('三班', '四年级', 4, code3);

  // Students
  db.prepare("INSERT INTO students (name, student_no, class_id, parent_id) VALUES (?, ?, ?, ?)").run('赵小明', '2024001', 1, 5);
  db.prepare("INSERT INTO students (name, student_no, class_id, parent_id) VALUES (?, ?, ?, ?)").run('赵小红', '2024002', 1, 5);
  db.prepare("INSERT INTO students (name, student_no, class_id, parent_id) VALUES (?, ?, ?, ?)").run('钱大宝', '2024003', 1, 6);
  db.prepare("INSERT INTO students (name, student_no, class_id, parent_id) VALUES (?, ?, ?, ?)").run('孙小丽', '2024004', 1, 7);
  db.prepare("INSERT INTO students (name, student_no, class_id, parent_id) VALUES (?, ?, ?, ?)").run('周小华', '2024005', 2, 8);
  db.prepare("INSERT INTO students (name, student_no, class_id, parent_id) VALUES (?, ?, ?, ?)").run('吴小强', '2024006', 2, 9);
  db.prepare("INSERT INTO students (name, student_no, class_id, parent_id) VALUES (?, ?, ?, ?)").run('周小芳', '2024007', 2, 8);

  // Homework for class 1
  db.prepare("INSERT INTO homework (class_id, teacher_id, title, content, due_date) VALUES (?, ?, ?, ?, ?)").run(1, 2, '语文第三课练习', '完成课本第15-17页的练习题，包括词语抄写和阅读理解。', '2026-06-20');
  db.prepare("INSERT INTO homework (class_id, teacher_id, title, content, due_date) VALUES (?, ?, ?, ?, ?)").run(1, 2, '数学口算练习', '完成口算本第8-10页，要求准确率95%以上。', '2026-06-18');
  db.prepare("INSERT INTO homework (class_id, teacher_id, title, content, due_date) VALUES (?, ?, ?, ?, ?)").run(1, 2, '古诗背诵', '背诵《静夜思》和《春晓》，下节课检查。', '2026-06-22');

  // Homework for class 2
  db.prepare("INSERT INTO homework (class_id, teacher_id, title, content, due_date) VALUES (?, ?, ?, ?, ?)").run(2, 3, '英语单词默写', '默写Unit 5的20个单词，每个写3遍。', '2026-06-19');
  db.prepare("INSERT INTO homework (class_id, teacher_id, title, content, due_date) VALUES (?, ?, ?, ?, ?)").run(2, 3, '数学应用题', '完成练习册第32页应用题1-6。', '2026-06-21');

  // Create submissions for all homework-student pairs
  const hwStudents1 = db.prepare('SELECT id FROM students WHERE class_id = 1').all() as any[];
  const hwStudents2 = db.prepare('SELECT id FROM students WHERE class_id = 2').all() as any[];
  const subStmt = db.prepare('INSERT INTO submissions (homework_id, student_id, content, status, score, comment, submitted_at, reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  // Homework 1 submissions (class 1)
  for (const s of hwStudents1) {
    if (s.id === 1) subStmt.run(1, s.id, '已完成所有练习题', 'reviewed', 92, '字迹工整，做得很好！', '2026-06-15 10:00:00', '2026-06-15 15:00:00');
    else if (s.id === 3) subStmt.run(1, s.id, '练习题写完了', 'reviewed', 85, '注意书写规范', '2026-06-15 11:00:00', '2026-06-15 16:00:00');
    else subStmt.run(1, s.id, '', 'pending', 0, '', null, null);
  }
  // Homework 2 submissions (class 1)
  for (const s of hwStudents1) {
    if (s.id === 1) subStmt.run(2, s.id, '口算练习已完成', 'submitted', 0, '', '2026-06-16 09:00:00', null);
    else subStmt.run(2, s.id, '', 'pending', 0, '', null, null);
  }
  // Homework 3 submissions (class 1) - all pending
  for (const s of hwStudents1) {
    subStmt.run(3, s.id, '', 'pending', 0, '', null, null);
  }
  // Homework 4 submissions (class 2)
  for (const s of hwStudents2) {
    if (s.id === 5) subStmt.run(4, s.id, '单词已默写', 'submitted', 0, '', '2026-06-16 08:00:00', null);
    else subStmt.run(4, s.id, '', 'pending', 0, '', null, null);
  }
  // Homework 5 submissions (class 2) - all pending
  for (const s of hwStudents2) {
    subStmt.run(5, s.id, '', 'pending', 0, '', null, null);
  }

  // Exams
  db.prepare("INSERT INTO exams (name, class_id, teacher_id) VALUES (?, ?, ?)").run('期中考试', 1, 2);
  db.prepare("INSERT INTO exams (name, class_id, teacher_id) VALUES (?, ?, ?)").run('单元测试', 1, 2);
  db.prepare("INSERT INTO exams (name, class_id, teacher_id) VALUES (?, ?, ?)").run('期中考试', 2, 3);

  // Scores for exam 1 (期中考试, class 1)
  const scores = [
    [1, 1, '语文', 95], [1, 1, '数学', 98], [1, 1, '英语', 92],
    [1, 2, '语文', 88], [1, 2, '数学', 85], [1, 2, '英语', 90],
    [1, 3, '语文', 78], [1, 3, '数学', 82], [1, 3, '英语', 75],
    [1, 4, '语文', 92], [1, 4, '数学', 90], [1, 4, '英语', 88],
  ];
  const scoreStmt = db.prepare('INSERT INTO scores (exam_id, student_id, subject, score) VALUES (?, ?, ?, ?)');
  for (const s of scores) scoreStmt.run(...s);

  // Scores for exam 2 (单元测试, class 1)
  const scores2 = [
    [2, 1, '语文', 90], [2, 1, '数学', 95],
    [2, 2, '语文', 85], [2, 2, '数学', 88],
    [2, 3, '语文', 80], [2, 3, '数学', 78],
    [2, 4, '语文', 88], [2, 4, '数学', 92],
  ];
  for (const s of scores2) scoreStmt.run(...s);

  // Scores for exam 3 (期中考试, class 2)
  const scores3 = [
    [3, 5, '语文', 88], [3, 5, '数学', 92], [3, 5, '英语', 85],
    [3, 6, '语文', 76], [3, 6, '数学', 80], [3, 6, '英语', 72],
    [3, 7, '语文', 90], [3, 7, '数学', 88], [3, 7, '英语', 86],
  ];
  for (const s of scores3) scoreStmt.run(...s);

  // Notices
  db.prepare("INSERT INTO notices (class_id, teacher_id, title, content) VALUES (?, ?, ?, ?)").run(1, 2, '期中家长会通知', '尊敬的各位家长，学校将于6月25日下午2:00在教室召开期中家长会，请各位家长准时参加。');
  db.prepare("INSERT INTO notices (class_id, teacher_id, title, content) VALUES (?, ?, ?, ?)").run(1, 2, '暑假安全提醒', '暑假即将来临，请各位家长注意孩子的假期安全，不要让孩子私自下水游泳。');
  db.prepare("INSERT INTO notices (class_id, teacher_id, title, content) VALUES (?, ?, ?, ?)").run(2, 3, '英语角活动通知', '本周五下午将举办英语角活动，请同学们准备好英语小故事。');

  // Notice reads
  db.prepare("INSERT INTO notice_reads (notice_id, parent_id) VALUES (?, ?)").run(1, 5);
  db.prepare("INSERT INTO notice_reads (notice_id, parent_id) VALUES (?, ?)").run(1, 6);

  // Leave requests
  db.prepare("INSERT INTO leave_requests (student_id, parent_id, class_id, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?)").run(1, 5, 1, '2026-06-17', '2026-06-18', '感冒发烧需要休息', 'pending');
  db.prepare("INSERT INTO leave_requests (student_id, parent_id, class_id, start_date, end_date, reason, status, reply, reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(3, 6, 1, '2026-06-12', '2026-06-13', '家中有事需请假', 'approved', '同意请假，注意安全', '2026-06-11 16:00:00');

  // Attendance records
  const attStmt = db.prepare('INSERT INTO attendance (student_id, class_id, date, status) VALUES (?, ?, ?, ?)');
  for (let i = 1; i <= 15; i++) {
    const date = `2026-06-${String(i).padStart(2, '0')}`;
    attStmt.run(1, 1, date, i === 12 ? 'late' : 'present');
    attStmt.run(2, 1, date, 'present');
    attStmt.run(3, 1, date, i === 12 || i === 13 ? 'leave' : 'present');
    attStmt.run(4, 1, date, 'present');
  }

  console.log('Seed data inserted successfully!');
  console.log('\nTest accounts:');
  console.log('  Admin:   admin / 123456');
  console.log('  Teacher: teacher1 / 123456 (张老师)');
  console.log('  Teacher: teacher2 / 123456 (李老师)');
  console.log('  Parent:  parent1 / 123456 (赵家长)');
  console.log('  Parent:  parent2 / 123456 (钱家长)');
  console.log('\nClass invite codes:');
  console.log(`  一班 (三年级): ${code1}`);
  console.log(`  二班 (三年级): ${code2}`);
  console.log(`  三班 (四年级): ${code3}`);
}

seed();
