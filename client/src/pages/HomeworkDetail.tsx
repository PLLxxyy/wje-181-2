import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { User } from '../utils/auth';

interface Props {
  user: User;
  homeworkId: number;
  navigate: (page: string, params?: Record<string, any>) => void;
  showToast: (msg: string) => void;
}

export default function HomeworkDetail({ user, homeworkId, navigate, showToast }: Props) {
  const [hw, setHw] = useState<any>(null);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState({ comment: '', score: '' });
  const [reminding, setReminding] = useState(false);

  useEffect(() => { loadDetail(); }, [homeworkId]);

  const loadDetail = async () => {
    try {
      const data = await api.get(`/homework/${homeworkId}`);
      setHw(data);
    } catch (err: any) { showToast(err.message); }
  };

  const handleReview = async () => {
    if (!reviewTarget) return;
    try {
      await api.post(`/homework/review/${reviewTarget.id}`, { comment: reviewForm.comment, score: Number(reviewForm.score) || 0 });
      showToast('批改完成');
      setReviewTarget(null);
      setReviewForm({ comment: '', score: '' });
      loadDetail();
    } catch (err: any) { showToast(err.message); }
  };

  const handleRemind = async () => {
    setReminding(true);
    try {
      const data = await api.post(`/homework/${homeworkId}/remind`, {});
      showToast(data.count > 0 ? `已催交${data.count}位学生` : '没有需要催交的学生');
      loadDetail();
    } catch (err: any) { showToast(err.message); } finally { setReminding(false); }
  };

  if (!hw) return <div className="empty">加载中...</div>;

  const classId = hw.class_id;

  return (
    <div>
      <button className="btn btn-default btn-sm" onClick={() => navigate('class-detail', { classId })} style={{ marginBottom: 16 }}>返回班级</button>

      <div className="card">
        <h3>{hw.title}</h3>
        <div style={{ margin: '16px 0' }}>
          <div className="detail-row"><span className="detail-label">布置老师</span><span className="detail-value">{hw.teacher_name}</span></div>
          <div className="detail-row"><span className="detail-label">所属班级</span><span className="detail-value">{hw.class_name}</span></div>
          <div className="detail-row"><span className="detail-label">截止日期</span><span className="detail-value">{hw.due_date}</span></div>
          <div className="detail-row"><span className="detail-label">发布日期</span><span className="detail-value">{hw.created_at?.split('T')[0] || hw.created_at?.split(' ')[0]}</span></div>
          {hw.attachment && <div className="detail-row"><span className="detail-label">附件</span><span className="detail-value">{hw.attachment}</span></div>}
        </div>
        <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8, fontSize: 14, whiteSpace: 'pre-wrap' }}>{hw.content}</div>
      </div>

      {user.role === 'teacher' && hw.submissions && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">提交情况（{hw.submissions.filter((s: any) => s.status !== 'pending').length}/{hw.submissions.length}已提交）</div>
            {(() => {
              const todayStr = new Date();
              const pad = (n: number) => String(n).padStart(2, '0');
              const tStr = `${todayStr.getFullYear()}-${pad(todayStr.getMonth() + 1)}-${pad(todayStr.getDate())}`;
              const showRemind = hw.submissions.some((s: any) => s.status === 'pending') && hw.due_date < tStr;
              return showRemind ? (
                <button className="btn btn-sm btn-primary" onClick={handleRemind} disabled={reminding}>{reminding ? '催交中...' : '一键催交'}</button>
              ) : null;
            })()}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>学号</th><th>姓名</th><th>状态</th><th>提交内容</th><th>分数</th><th>评语</th><th>操作</th></tr></thead>
              <tbody>
                {hw.submissions.map((sub: any) => (
                  <tr key={sub.id}>
                    <td>{sub.student_no}</td>
                    <td>{sub.student_name}</td>
                    <td>
                      <span className={`tag ${sub.status === 'reviewed' ? 'tag-green' : sub.status === 'submitted' ? 'tag-blue' : 'tag-gray'}`}>
                        {sub.status === 'reviewed' ? '已批改' : sub.status === 'submitted' ? '已提交' : '未提交'}
                      </span>
                    </td>
                    <td>{sub.content || '-'}</td>
                    <td>{sub.status === 'reviewed' ? sub.score : '-'}</td>
                    <td>{sub.status === 'reviewed' ? sub.comment : '-'}</td>
                    <td>
                      {sub.status === 'submitted' && (
                        <button className="btn btn-sm btn-success" onClick={() => { setReviewTarget(sub); setReviewForm({ comment: '', score: '' }); }}>批改</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {user.role === 'parent' && hw.submissions?.map((sub: any) => (
        <div key={sub.id} className="card">
          <div className="card-title">提交状态</div>
          <div className="detail-row"><span className="detail-label">状态</span><span className="detail-value">
            <span className={`tag ${sub.status === 'reviewed' ? 'tag-green' : sub.status === 'submitted' ? 'tag-blue' : 'tag-gray'}`}>
              {sub.status === 'reviewed' ? '已批改' : sub.status === 'submitted' ? '已提交' : '未提交'}
            </span>
          </span></div>
          {sub.status === 'reviewed' && (
            <>
              <div className="detail-row"><span className="detail-label">评分</span><span className="detail-value" style={{ color: '#f5222d', fontWeight: 600 }}>{sub.score}分</span></div>
              <div className="detail-row"><span className="detail-label">老师评语</span><span className="detail-value">{sub.comment || '无'}</span></div>
            </>
          )}
          {sub.status === 'pending' && (
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={async () => {
                try {
                  await api.post(`/homework/submit/${sub.id}`, { content: '已完成作业' });
                  showToast('提交成功');
                  loadDetail();
                } catch (err: any) { showToast(err.message); }
              }}>标记已交</button>
            </div>
          )}
        </div>
      ))}

      {reviewTarget && (
        <div className="modal-overlay" onClick={() => setReviewTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>批改作业 - {reviewTarget.student_name}</h3>
            <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              <strong>学生提交内容：</strong>{reviewTarget.content || '无'}
            </div>
            <div className="form-group">
              <label>评分</label>
              <input type="number" min="0" max="100" value={reviewForm.score} onChange={e => setReviewForm({ ...reviewForm, score: e.target.value })} placeholder="请输入分数（0-100）" />
            </div>
            <div className="form-group">
              <label>评语</label>
              <textarea value={reviewForm.comment} onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })} placeholder="请输入评语" rows={3} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setReviewTarget(null)}>取消</button>
              <button className="btn btn-success" onClick={handleReview}>确认批改</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
