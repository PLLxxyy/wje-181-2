import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { User } from '../utils/auth';

interface Props {
  user: User;
  studentId: number;
  navigate: (page: string, params?: Record<string, any>) => void;
  showToast: (msg: string) => void;
}

export default function ParentHomework({ user, studentId, navigate, showToast }: Props) {
  const [homework, setHomework] = useState<any[]>([]);

  useEffect(() => { loadHomework(); }, [studentId]);

  const loadHomework = async () => {
    try {
      const data = await api.get(`/parent/children/${studentId}/homework`);
      setHomework(data);
    } catch (err: any) { showToast(err.message); }
  };

  const handleSubmit = async (submissionId: number) => {
    try {
      await api.post(`/homework/submit/${submissionId}`, { content: '已完成作业' });
      showToast('提交成功');
      loadHomework();
    } catch (err: any) { showToast(err.message); }
  };

  return (
    <div>
      <button className="btn btn-default btn-sm" onClick={() => navigate('parent-dashboard')} style={{ marginBottom: 16 }}>返回</button>
      <h2 className="mb-16">作业列表</h2>
      {homework.length > 0 ? homework.map((hw: any) => (
        <div key={hw.id} className="card">
          <div className="flex justify-between items-center">
            <div className="card-title" style={{ marginBottom: 0 }}>{hw.title}</div>
            <span className={`tag ${hw.status === 'reviewed' ? 'tag-green' : hw.status === 'submitted' ? 'tag-blue' : 'tag-gray'}`}>
              {hw.status === 'reviewed' ? '已批改' : hw.status === 'submitted' ? '已提交' : '待完成'}
            </span>
          </div>
          <div className="text-sm text-gray mt-16">{hw.content?.substring(0, 100)}</div>
          <div className="text-sm text-gray">截止：{hw.due_date}</div>
          {hw.status === 'reviewed' && (
            <div style={{ marginTop: 12, padding: 12, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
              <div><strong>评分：</strong><span style={{ color: '#f5222d', fontWeight: 700, fontSize: 18 }}>{hw.score}分</span></div>
              {hw.comment && <div style={{ marginTop: 4 }}><strong>评语：</strong>{hw.comment}</div>}
            </div>
          )}
          {hw.status === 'pending' && (
            <button className="btn btn-primary mt-16" onClick={() => handleSubmit(hw.submission_id)}>标记已交</button>
          )}
        </div>
      )) : <div className="card empty">暂无作业</div>}
    </div>
  );
}
