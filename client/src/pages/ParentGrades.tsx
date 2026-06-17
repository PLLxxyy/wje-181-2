import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { User } from '../utils/auth';

interface Props {
  user: User;
  studentId: number;
  navigate: (page: string, params?: Record<string, any>) => void;
  showToast: (msg: string) => void;
}

export default function ParentGrades({ user, studentId, navigate, showToast }: Props) {
  const [scores, setScores] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);

  useEffect(() => { loadData(); }, [studentId]);

  const loadData = async () => {
    try {
      const [scoreData, trendData] = await Promise.all([
        api.get(`/parent/children/${studentId}/scores`),
        api.get(`/grades/trend/${studentId}`)
      ]);
      setScores(scoreData);
      setTrend(trendData);
    } catch (err: any) { showToast(err.message); }
  };

  // Group scores by exam
  const examGroups: Record<string, any[]> = {};
  scores.forEach((s: any) => {
    if (!examGroups[s.exam_name]) examGroups[s.exam_name] = [];
    examGroups[s.exam_name].push(s);
  });

  // Group trend by exam for chart
  const trendExams: Record<string, Record<string, number>> = {};
  const allSubjects = new Set<string>();
  trend.forEach((t: any) => {
    if (!trendExams[t.exam_name]) trendExams[t.exam_name] = {};
    trendExams[t.exam_name][t.subject] = t.score;
    allSubjects.add(t.subject);
  });
  const examNames = Object.keys(trendExams);
  const subjectList = Array.from(allSubjects);
  const subjectColors: Record<string, string> = {
    '语文': '#f5222d', '数学': '#1890ff', '英语': '#52c41a', '物理': '#fa8c16', '化学': '#722ed1'
  };

  return (
    <div>
      <button className="btn btn-default btn-sm" onClick={() => navigate('parent-dashboard')} style={{ marginBottom: 16 }}>返回</button>
      <h2 className="mb-16">成绩详情</h2>

      {/* Trend Chart */}
      {subjectList.length > 0 && examNames.length > 0 && (
        <div className="card mb-16">
          <div className="card-title">成绩趋势</div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 400 }}>
              {subjectList.map(subj => {
                const values = examNames.map(e => trendExams[e]?.[subj] || 0);
                const max = Math.max(...values, 100);
                return (
                  <div key={subj} style={{ marginBottom: 16 }}>
                    <div className="text-sm mb-8" style={{ fontWeight: 500, color: subjectColors[subj] || '#333' }}>{subj}</div>
                    <div className="chart-bar" style={{ height: 80 }}>
                      {examNames.map((exam, i) => {
                        const val = values[i];
                        return (
                          <div key={exam} className="bar" style={{ height: `${max > 0 ? (val / max) * 100 : 0}%`, background: subjectColors[subj] || '#1890ff' }}>
                            <span className="bar-value">{val}</span>
                            <span className="bar-label" style={{ fontSize: 10 }}>{exam.length > 4 ? exam.substring(0, 4) + '..' : exam}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <div className="chart-legend">
                {subjectList.map(s => (
                  <span key={s}><span className="dot" style={{ background: subjectColors[s] || '#1890ff' }} />{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Score details by exam */}
      {Object.entries(examGroups).map(([examName, examScores]) => (
        <div key={examName} className="card mb-16">
          <div className="card-title">{examName}</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>科目</th><th>成绩</th><th>等级</th></tr></thead>
              <tbody>
                {(examScores as any[]).map((s: any) => {
                  const level = s.score >= 90 ? '优秀' : s.score >= 80 ? '良好' : s.score >= 70 ? '中等' : s.score >= 60 ? '及格' : '不及格';
                  const color = s.score >= 90 ? '#52c41a' : s.score >= 60 ? '#333' : '#f5222d';
                  return (
                    <tr key={s.id}>
                      <td>{s.subject}</td>
                      <td style={{ fontWeight: 700, color, fontSize: 16 }}>{s.score}</td>
                      <td><span className={`tag ${s.score >= 90 ? 'tag-green' : s.score >= 60 ? 'tag-blue' : 'tag-red'}`}>{level}</span></td>
                    </tr>
                  );
                })}
                <tr style={{ background: '#fafafa' }}>
                  <td style={{ fontWeight: 600 }}>总分</td>
                  <td style={{ fontWeight: 700, color: '#1890ff', fontSize: 18 }}>{(examScores as any[]).reduce((sum: number, s: any) => sum + s.score, 0)}</td>
                  <td></td>
                </tr>
                <tr style={{ background: '#fafafa' }}>
                  <td style={{ fontWeight: 600 }}>平均分</td>
                  <td style={{ fontWeight: 700, color: '#1890ff' }}>{((examScores as any[]).reduce((sum: number, s: any) => sum + s.score, 0) / (examScores as any[]).length).toFixed(1)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {scores.length === 0 && <div className="card empty">暂无成绩记录</div>}
    </div>
  );
}
