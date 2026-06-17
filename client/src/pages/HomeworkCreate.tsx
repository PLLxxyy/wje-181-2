import { useState } from 'react';
import { api } from '../utils/api';
import { User } from '../utils/auth';

interface Props {
  user: User;
  classId: number;
  navigate: (page: string, params?: Record<string, any>) => void;
  showToast: (msg: string) => void;
}

export default function HomeworkCreate({ user, classId, navigate, showToast }: Props) {
  const [form, setForm] = useState({ title: '', content: '', due_date: '', attachment: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content || !form.due_date) { showToast('请填写完整作业信息'); return; }
    setLoading(true);
    try {
      await api.post('/homework', { ...form, class_id: classId });
      showToast('作业发布成功');
      navigate('class-detail', { classId });
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button className="btn btn-default btn-sm" onClick={() => navigate('class-detail', { classId })} style={{ marginBottom: 16 }}>返回班级</button>
      <div className="card" style={{ maxWidth: 600 }}>
        <h3 style={{ marginBottom: 20 }}>发布作业</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>作业标题</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="请输入作业标题" />
          </div>
          <div className="form-group">
            <label>作业内容描述</label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="请详细描述作业要求" rows={5} />
          </div>
          <div className="form-group">
            <label>截止日期</label>
            <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label>附件说明（可选）</label>
            <input type="text" value={form.attachment} onChange={e => setForm({ ...form, attachment: e.target.value })} placeholder="附件名称或链接" />
          </div>
          <div className="btn-group">
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '发布中...' : '发布作业'}</button>
            <button type="button" className="btn btn-default" onClick={() => navigate('class-detail', { classId })}>取消</button>
          </div>
        </form>
      </div>
    </div>
  );
}
