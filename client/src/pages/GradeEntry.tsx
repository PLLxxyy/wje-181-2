import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { User } from '../utils/auth';

interface Props {
  user: User;
  classId: number;
  navigate: (page: string, params?: Record<string, any>) => void;
  showToast: (msg: string) => void;
}

export default function GradeEntry({ user, classId, navigate, showToast }: Props) {
  const [classInfo, setClassInfo] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [examName, setExamName] = useState('');
  const [subject, setSubject] = useState('');
  const [scores, setScores] = useState<Record<number, string>>({});
  const [mode, setMode] = useState<'create' | 'entry'>('create');
  const [existingScores, setExistingScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, [classId]);

  const loadData = async () => {
    try {
      const [cls, examList] = await Promise.all([
        api.get(`/classes/${classId}`),
        api.get(`/grades/exams/${classId}`)
      ]);
      setClassInfo(cls);
      setExams(examList);
      if (examList.length > 0) {
        setSelectedExam(examList[0].id);
        loadScores(examList[0].id);
      }
    } catch (err: any) { showToast(err.message); }
  };

  const loadScores = async (examId: number) => {
    try {
      const data = await api.get(`/grades/scores/${examId}`);
      setExistingScores(data);
    } catch (err: any) {}
  };

  const handleCreateExam = async () => {
    if (!examName) { showToast('请输入考试名称'); return; }
    setLoading(true);
    try {
      const data = await api.post('/grades/exams', { name: examName, class_id: classId });
      showToast('考试创建成功');
      setExamName('');
      setSelectedExam(data.id);
      setMode('entry');
      loadData();
    } catch (err: any) { showToast(err.message); } finally { setLoading(false); }
  };

  const handleSubmitScores = async () => {
    if (!selectedExam || !subject) { showToast('请选择考试和科目'); return; }
    const scoreList = Object.entries(scores)
      .filter(([_, v]) => v !== '')
      .map(([studentId, score]) => ({ student_id: Number(studentId), subject, score: Number(score) }));
    if (scoreList.length === 0) { showToast('请至少录入一个学生的成绩'); return; }
    setLoading(true);
    try {
      await api.post('/grades/scores', { exam_id: selectedExam, scores: scoreList });
      showToast(`成功录入${scoreList.length}条成绩`);
      setScores({});
      loadScores(selectedExam);
    } catch (err: any) { showToast(err.message); } finally { setLoading(false); }
  };

  const students = classInfo?.students || [];

  return (
    <div>
      <button className="btn btn-default btn-sm" onClick={() => navigate('class-detail', { classId })} style={{ marginBottom: 16 }}>返回班级</button>

      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e8e8e8' }}>
        <div onClick={() => setMode('create')} style={{ padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: mode === 'create' ? 600 : 400, color: mode === 'create' ? '#1890ff' : '#666', borderBottom: mode === 'create' ? '2px solid #1890ff' : '2px solid transparent', marginBottom: -2 }}>创建考试</div>
        <div onClick={() => setMode('entry')} style={{ padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: mode === 'entry' ? 600 : 400, color: mode === 'entry' ? '#1890ff' : '#666', borderBottom: mode === 'entry' ? '2px solid #1890ff' : '2px solid transparent', marginBottom: -2 }}>录入成绩</div>
      </div>

      {mode === 'create' && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div className="card-title">创建考试</div>
          <div className="form-group">
            <label>考试名称</label>
            <input type="text" value={examName} onChange={e => setExamName(e.target.value)} placeholder="如：期中考试、单元测试" />
          </div>
          <button className="btn btn-primary" onClick={handleCreateExam} disabled={loading}>{loading ? '创建中...' : '创建考试'}</button>
        </div>
      )}

      {mode === 'entry' && (
        <div>
          <div className="card mb-16">
            <div className="form-row">
              <div className="form-group">
                <label>选择考试</label>
                <select value={selectedExam || ''} onChange={e => { const id = Number(e.target.value); setSelectedExam(id); loadScores(id); }}>
                  <option value="">请选择</option>
                  {exams.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>科目</label>
                <select value={subject} onChange={e => setSubject(e.target.value)}>
                  <option value="">请选择科目</option>
                  {['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {selectedExam && subject && students.length > 0 && (
            <div className="card mb-16">
              <div className="card-title">逐个录入成绩</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>学号</th><th>姓名</th><th>成绩</th></tr></thead>
                  <tbody>
                    {students.map((s: any) => (
                      <tr key={s.id}>
                        <td>{s.student_no || '-'}</td>
                        <td>{s.name}</td>
                        <td>
                          <input type="number" min="0" max="100" value={scores[s.id] || ''} onChange={e => setScores({ ...scores, [s.id]: e.target.value })} placeholder="输入成绩" style={{ width: 100, padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 4 }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn btn-primary mt-16" onClick={handleSubmitScores} disabled={loading}>{loading ? '提交中...' : '提交成绩'}</button>
            </div>
          )}

          {existingScores.length > 0 && (
            <div className="card">
              <div className="card-title">已有成绩记录</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>学号</th><th>姓名</th><th>科目</th><th>成绩</th></tr></thead>
                  <tbody>
                    {existingScores.map((s: any) => (
                      <tr key={s.id}>
                        <td>{s.student_no}</td>
                        <td>{s.student_name}</td>
                        <td>{s.subject}</td>
                        <td style={{ fontWeight: 600, color: s.score >= 90 ? '#52c41a' : s.score >= 60 ? '#333' : '#f5222d' }}>{s.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
