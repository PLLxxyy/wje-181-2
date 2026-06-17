import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { User } from '../utils/auth';

interface Props {
  user: User;
  noticeId: number;
  navigate: (page: string, params?: Record<string, any>) => void;
  showToast: (msg: string) => void;
}

export default function NoticeDetail({ user, noticeId, navigate, showToast }: Props) {
  const [notice, setNotice] = useState<any>(null);
  const [backTarget, setBackTarget] = useState<{ page: string; params?: Record<string, any> }>({ page: 'teacher-dashboard' });

  useEffect(() => { loadNotice(); }, [noticeId]);

  const loadNotice = async () => {
    try {
      const data = await api.get(`/notices/${noticeId}`);
      setNotice(data);
      if (user.role === 'parent') {
        // Auto mark as read
        await api.post(`/notices/${noticeId}/read`, {});
      }
      if (data.class_id) {
        if (user.role === 'teacher') setBackTarget({ page: 'class-detail', params: { classId: data.class_id } });
        else if (user.role === 'parent') setBackTarget({ page: 'parent-dashboard' });
      }
    } catch (err: any) { showToast(err.message); }
  };

  if (!notice) return <div className="empty">加载中...</div>;

  return (
    <div>
      <button className="btn btn-default btn-sm" onClick={() => navigate(backTarget.page, backTarget.params)} style={{ marginBottom: 16 }}>返回</button>

      <div className="card">
        <h3>{notice.title}</h3>
        <div style={{ margin: '12px 0', color: '#999', fontSize: 13 }}>
          <span>发布者：{notice.teacher_name}</span>
          <span style={{ marginLeft: 16 }}>班级：{notice.class_name}</span>
          <span style={{ marginLeft: 16 }}>时间：{notice.created_at?.split('T')[0] || notice.created_at?.split(' ')[0]}</span>
        </div>
        <div style={{ padding: 20, background: '#f9f9f9', borderRadius: 8, fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{notice.content}</div>
      </div>

      {user.role === 'parent' && (
        <div className="card">
          <span className={`tag ${notice.is_read ? 'tag-green' : 'tag-orange'}`}>
            {notice.is_read ? '已签收' : '未签收'}
          </span>
        </div>
      )}

      {user.role === 'teacher' && notice.reads && (
        <div className="card">
          <div className="card-title">签收情况</div>
          {notice.reads.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>家长</th><th>签收时间</th></tr></thead>
                <tbody>
                  {notice.reads.map((r: any) => (
                    <tr key={r.id}>
                      <td>{r.parent_name}</td>
                      <td>{r.read_at?.split('T')[0] || r.read_at?.split(' ')[0]} {r.read_at?.split('T')[1]?.split('.')[0] || r.read_at?.split(' ')[1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty">暂无家长签收</div>}
        </div>
      )}
    </div>
  );
}
