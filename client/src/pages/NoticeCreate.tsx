import { useState } from 'react';
import { api } from '../utils/api';
import { User } from '../utils/auth';

interface Props {
  user: User;
  classId: number;
  navigate: (page: string, params?: Record<string, any>) => void;
  showToast: (msg: string) => void;
}

export default function NoticeCreate({ user, classId, navigate, showToast }: Props) {
  const [form, setForm] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) { showToast('请填写完整通知信息'); return; }
    setLoading(true);
    try {
      await api.post('/notices', { ...form, class_id: classId });
      showToast('通知发布成功');
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
        <h3 style={{ marginBottom: 20 }}>发布班级通知</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>通知标题</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="请输入通知标题" />
          </div>
          <div className="form-group">
            <label>通知内容</label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="请输入通知内容" rows={8} />
          </div>
          <div className="btn-group">
            <button type="submit" className="btn btn-warning" disabled={loading}>{loading ? '发布中...' : '发布通知'}</button>
            <button type="button" className="btn btn-default" onClick={() => navigate('class-detail', { classId })}>取消</button>
          </div>
        </form>
      </div>
    </div>
  );
}
