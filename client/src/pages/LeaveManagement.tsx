import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { User } from '../utils/auth';

interface Props {
  user: User;
  classId: number;
  navigate: (page: string, params?: Record<string, any>) => void;
  showToast: (msg: string) => void;
}

export default function LeaveManagement({ user, classId, navigate, showToast }: Props) {
  const [requests, setRequests] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [children, setChildren] = useState<any[]>([]);
  const [form, setForm] = useState({ student_id: '', start_date: '', end_date: '', reason: '' });
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState({ status: 'approved', reply: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRequests();
    if (user.role === 'parent') loadChildren();
  }, [classId]);

  const loadRequests = async () => {
    try {
      const url = user.role === 'teacher' ? `/leave?class_id=${classId}` : '/leave';
      const data = await api.get(url);
      setRequests(data);
    } catch (err: any) { showToast(err.message); }
  };

  const loadChildren = async () => {
    try {
      const data = await api.get('/parent/children');
      setChildren(data.filter((c: any) => c.class_id === classId));
    } catch (err: any) {}
  };

  const handleCreate = async () => {
    if (!form.student_id || !form.start_date || !form.end_date || !form.reason) { showToast('请填写完整信息'); return; }
    setLoading(true);
    try {
      await api.post('/leave', form);
      showToast('请假申请已提交');
      setShowCreate(false);
      setForm({ student_id: '', start_date: '', end_date: '', reason: '' });
      loadRequests();
    } catch (err: any) { showToast(err.message); } finally { setLoading(false); }
  };

  const handleReview = async () => {
    if (!reviewTarget) return;
    setLoading(true);
    try {
      await api.post(`/leave/${reviewTarget.id}/review`, reviewForm);
      showToast(reviewForm.status === 'approved' ? '已批准' : '已驳回');
      setReviewTarget(null);
      loadRequests();
    } catch (err: any) { showToast(err.message); } finally { setLoading(false); }
  };

  const getStatusTag = (status: string) => {
    if (status === 'approved') return <span className="tag tag-green">已批准</span>;
    if (status === 'rejected') return <span className="tag tag-red">已驳回</span>;
    return <span className="tag tag-orange">待审批</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-default btn-sm" onClick={() => navigate('class-detail', { classId })} style={{ marginBottom: 8 }}>返回班级</button>
          <h2>请假管理</h2>
        </div>
        {user.role === 'parent' && children.length > 0 && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ 提交请假</button>
        )}
      </div>

      {requests.length > 0 ? (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>学生</th>
                  {user.role === 'teacher' && <th>家长</th>}
                  <th>请假日期</th>
                  <th>原因</th>
                  <th>状态</th>
                  {user.role === 'teacher' && <th>操作</th>}
                </tr>
              </thead>
              <tbody>
                {requests.map((r: any) => (
                  <tr key={r.id}>
                    <td>{r.student_name}</td>
                    {user.role === 'teacher' && <td>{r.parent_name}</td>}
                    <td>{r.start_date} ~ {r.end_date}</td>
                    <td>{r.reason}</td>
                    <td>{getStatusTag(r.status)}</td>
                    {user.role === 'teacher' && (
                      <td>
                        {r.status === 'pending' && (
                          <div className="btn-group">
                            <button className="btn btn-sm btn-success" onClick={() => { setReviewTarget(r); setReviewForm({ status: 'approved', reply: '' }); }}>批准</button>
                            <button className="btn btn-sm btn-danger" onClick={() => { setReviewTarget(r); setReviewForm({ status: 'rejected', reply: '' }); }}>驳回</button>
                          </div>
                        )}
                        {r.reply && <span className="text-sm text-gray">回复：{r.reply}</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <div className="card empty">暂无请假记录</div>}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>提交请假申请</h3>
            <div className="form-group">
              <label>学生</label>
              <select value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })}>
                <option value="">请选择学生</option>
                {children.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>开始日期</label>
                <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>结束日期</label>
                <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>请假原因</label>
              <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="请填写请假原因" rows={3} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setShowCreate(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>{loading ? '提交中...' : '提交申请'}</button>
            </div>
          </div>
        </div>
      )}

      {reviewTarget && (
        <div className="modal-overlay" onClick={() => setReviewTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>审批请假 - {reviewTarget.student_name}</h3>
            <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              <div><strong>请假日期：</strong>{reviewTarget.start_date} ~ {reviewTarget.end_date}</div>
              <div style={{ marginTop: 4 }}><strong>请假原因：</strong>{reviewTarget.reason}</div>
            </div>
            <div className="form-group">
              <label>审批结果</label>
              <select value={reviewForm.status} onChange={e => setReviewForm({ ...reviewForm, status: e.target.value })}>
                <option value="approved">批准</option>
                <option value="rejected">驳回</option>
              </select>
            </div>
            <div className="form-group">
              <label>回复（可选）</label>
              <textarea value={reviewForm.reply} onChange={e => setReviewForm({ ...reviewForm, reply: e.target.value })} placeholder="请输入回复内容" rows={2} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setReviewTarget(null)}>取消</button>
              <button className={`btn ${reviewForm.status === 'approved' ? 'btn-success' : 'btn-danger'}`} onClick={handleReview} disabled={loading}>{loading ? '处理中...' : '确认'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
