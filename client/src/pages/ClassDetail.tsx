import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { User } from '../utils/auth';

interface Props {
  user: User;
  classId: number;
  navigate: (page: string, params?: Record<string, any>) => void;
  showToast: (msg: string) => void;
}

export default function ClassDetail({ user, classId, navigate, showToast }: Props) {
  const [classInfo, setClassInfo] = useState<any>(null);
  const [tab, setTab] = useState<'roster' | 'homework' | 'notices' | 'exams'>('roster');
  const [homework, setHomework] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [hwStats, setHwStats] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [examStats, setExamStats] = useState<any>(null);

  useEffect(() => { loadClassInfo(); }, [classId]);

  useEffect(() => {
    if (tab === 'homework') { loadHomework(); loadHwStats(); }
    else if (tab === 'notices') loadNotices();
    else if (tab === 'exams') { loadExams(); loadExamStats(); }
  }, [tab]);

  const loadClassInfo = async () => {
    try {
      const data = await api.get(`/classes/${classId}`);
      setClassInfo(data);
    } catch (err: any) { showToast(err.message); }
  };

  const loadHomework = async () => {
    try {
      const data = await api.get(`/homework/class/${classId}`);
      setHomework(data);
    } catch (err: any) { showToast(err.message); }
  };

  const loadNotices = async () => {
    try {
      const data = await api.get(`/notices/class/${classId}`);
      setNotices(data);
    } catch (err: any) { showToast(err.message); }
  };

  const loadHwStats = async () => {
    try {
      const data = await api.get(`/homework/stats/${classId}`);
      setHwStats(data);
    } catch (err: any) {}
  };

  const loadExams = async () => {
    try {
      const data = await api.get(`/grades/exams/${classId}`);
      setExams(data);
    } catch (err: any) { showToast(err.message); }
  };

  const loadExamStats = async () => {
    try {
      const data = await api.get(`/grades/stats/${classId}`);
      setExamStats(data);
    } catch (err: any) {}
  };

  if (!classInfo) return <div className="empty">加载中...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-default btn-sm" onClick={() => navigate('teacher-dashboard')} style={{ marginBottom: 8 }}>返回</button>
          <h2>{classInfo.grade} {classInfo.name}</h2>
          <div className="text-sm text-gray">邀请码：<span style={{ fontWeight: 600, color: '#1890ff' }}>{classInfo.invite_code}</span></div>
        </div>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={() => navigate('homework-create', { classId })}>发布作业</button>
          <button className="btn btn-success" onClick={() => navigate('grade-entry', { classId })}>录入成绩</button>
          <button className="btn btn-warning" onClick={() => navigate('notice-create', { classId })}>发布公告</button>
          <button className="btn btn-default" onClick={() => navigate('leave-management', { classId })}>请假管理</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e8e8e8' }}>
        {[
          { key: 'roster', label: '花名册' },
          { key: 'homework', label: '作业管理' },
          { key: 'notices', label: '班级公告' },
          { key: 'exams', label: '成绩管理' },
        ].map(item => (
          <div key={item.key} onClick={() => setTab(item.key as any)} style={{
            padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: tab === item.key ? 600 : 400,
            color: tab === item.key ? '#1890ff' : '#666', borderBottom: tab === item.key ? '2px solid #1890ff' : '2px solid transparent', marginBottom: -2
          }}>{item.label}</div>
        ))}
      </div>

      {tab === 'roster' && (
        <div className="card">
          <div className="card-title">学生花名册（{classInfo.students?.length || 0}人）</div>
          {classInfo.students?.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>学号</th><th>姓名</th><th>家长</th><th>联系电话</th></tr>
                </thead>
                <tbody>
                  {classInfo.students.map((s: any) => (
                    <tr key={s.id}>
                      <td>{s.student_no || '-'}</td>
                      <td>{s.name}</td>
                      <td>{s.parent_name || '未绑定'}</td>
                      <td>{s.parent_phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty">暂无学生，分享邀请码给家长绑定</div>}
        </div>
      )}

      {tab === 'homework' && (
        <div>
          {hwStats.length > 0 && (
            <div className="card mb-16">
              <div className="card-title">作业完成率统计</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>作业</th><th>截止日期</th><th>已提交</th><th>总人数</th><th>完成率</th></tr></thead>
                  <tbody>
                    {hwStats.map((s: any) => (
                      <tr key={s.id}>
                        <td>{s.title}</td>
                        <td>{s.due_date}</td>
                        <td>{s.submitted}/{s.total}</td>
                        <td>{s.total}</td>
                        <td>
                          <div className="flex items-center gap-8">
                            <div className="progress" style={{ width: 100 }}>
                              <div className={`progress-bar ${s.total > 0 && s.submitted / s.total > 0.8 ? 'green' : s.total > 0 && s.submitted / s.total > 0.5 ? '' : 'orange'}`} style={{ width: `${s.total > 0 ? (s.submitted / s.total * 100) : 0}%` }} />
                            </div>
                            <span className="text-sm">{s.total > 0 ? Math.round(s.submitted / s.total * 100) : 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {homework.length > 0 ? homework.map((hw: any) => (
            <div key={hw.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('homework-detail', { homeworkId: hw.id })}>
              <div className="flex justify-between items-center">
                <div className="card-title" style={{ marginBottom: 0 }}>{hw.title}</div>
                <span className="text-sm text-gray">截止：{hw.due_date}</span>
              </div>
              <div className="text-sm text-gray mt-16">{hw.content}</div>
            </div>
          )) : <div className="card empty">暂无作业</div>}
        </div>
      )}

      {tab === 'notices' && (
        <div>
          {notices.length > 0 ? notices.map((n: any) => (
            <div key={n.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('notice-detail', { noticeId: n.id })}>
              <div className="flex justify-between items-center">
                <div className="card-title" style={{ marginBottom: 0 }}>{n.title}</div>
                <span className="tag tag-blue">已读 {n.read_count}/{n.total_parents}</span>
              </div>
              <div className="text-sm text-gray mt-16">{n.content?.substring(0, 80)}{n.content?.length > 80 ? '...' : ''}</div>
              <div className="text-sm text-gray" style={{ marginTop: 4 }}>发布时间：{n.created_at?.split('T')[0] || n.created_at?.split(' ')[0]}</div>
            </div>
          )) : <div className="card empty">暂无公告</div>}
        </div>
      )}

      {tab === 'exams' && (
        <div>
          {examStats?.ranking?.length > 0 && (
            <div className="card mb-16">
              <div className="card-title">成绩排名</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>排名</th><th>学号</th><th>姓名</th><th>总分</th><th>平均分</th></tr></thead>
                  <tbody>
                    {examStats.ranking.map((r: any, i: number) => (
                      <tr key={r.student_id}>
                        <td><span style={{ fontWeight: i < 3 ? 700 : 400, color: i === 0 ? '#f5222d' : i === 1 ? '#fa8c16' : i === 2 ? '#faad14' : '#333' }}>{i + 1}</span></td>
                        <td>{r.student_no}</td>
                        <td>{r.student_name}</td>
                        <td>{r.total_score}</td>
                        <td>{Number(r.avg_score).toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {examStats?.distribution?.length > 0 && (
            <div className="card mb-16">
              <div className="card-title">成绩分布</div>
              {(() => {
                const subjects = [...new Set(examStats.distribution.map((d: any) => d.subject))];
                const levels = ['优秀', '良好', '中等', '及格', '不及格'];
                const colors = ['#52c41a', '#1890ff', '#faad14', '#fa8c16', '#f5222d'];
                return (subjects as string[]).map((subj: string) => {
                  const data = levels.map((level, i) => {
                    const item = examStats.distribution.find((d: any) => d.subject === subj && d.level === level);
                    return { level, count: item?.count || 0, color: colors[i] };
                  });
                  const max = Math.max(...data.map(d => d.count), 1);
                  return (
                    <div key={subj} style={{ marginBottom: 20 }}>
                      <div style={{ fontWeight: 500, marginBottom: 8 }}>{subj}</div>
                      <div className="chart-bar">
                        {data.map(d => (
                          <div key={d.level} className="bar" style={{ height: `${(d.count / max) * 100}%`, background: d.color }}>
                            <span className="bar-value">{d.count}</span>
                            <span className="bar-label">{d.level}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {exams.length > 0 ? exams.map((exam: any) => (
            <div key={exam.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('grade-entry', { classId, examId: exam.id })}>
              <div className="card-title" style={{ marginBottom: 0 }}>{exam.name}</div>
              <div className="text-sm text-gray" style={{ marginTop: 4 }}>创建时间：{exam.created_at?.split('T')[0] || exam.created_at?.split(' ')[0]}</div>
            </div>
          )) : <div className="card empty">暂无考试记录</div>}
        </div>
      )}
    </div>
  );
}
