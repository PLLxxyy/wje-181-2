import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { User } from '../utils/auth';

interface Props {
  user: User;
  navigate: (page: string, params?: Record<string, any>) => void;
  showToast: (msg: string) => void;
}

export default function ParentDashboard({ user, navigate, showToast }: Props) {
  const [children, setChildren] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [childHomework, setChildHomework] = useState<any[]>([]);
  const [childAttendance, setChildAttendance] = useState<any>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [joinForm, setJoinForm] = useState({ invite_code: '', student_name: '', student_no: '' });
  const [joinLoading, setJoinLoading] = useState(false);
  const [tab, setTab] = useState<'homework' | 'grades' | 'attendance' | 'notices'>('homework');

  useEffect(() => { loadChildren(); loadNotifications(); }, []);

  useEffect(() => {
    if (selectedChild) {
      loadChildHomework(selectedChild.id);
      loadChildAttendance(selectedChild.id);
    }
  }, [selectedChild]);

  const loadChildren = async () => {
    try {
      const data = await api.get('/parent/children');
      setChildren(data);
      if (data.length > 0 && !selectedChild) setSelectedChild(data[0]);
    } catch (err: any) { showToast(err.message); }
  };

  const loadNotifications = async () => {
    try {
      const data = await api.get('/parent/notifications');
      setNotifications(data);
    } catch (err: any) {}
  };

  const loadChildHomework = async (studentId: number) => {
    try {
      const data = await api.get(`/parent/children/${studentId}/homework`);
      setChildHomework(data);
    } catch (err: any) {}
  };

  const loadChildAttendance = async (studentId: number) => {
    try {
      const data = await api.get(`/parent/children/${studentId}/attendance`);
      setChildAttendance(data);
    } catch (err: any) {}
  };

  const handleJoin = async () => {
    if (!joinForm.invite_code || !joinForm.student_name) { showToast('请填写完整信息'); return; }
    setJoinLoading(true);
    try {
      await api.post('/classes/join', joinForm);
      showToast('绑定成功');
      setShowJoin(false);
      setJoinForm({ invite_code: '', student_name: '', student_no: '' });
      loadChildren();
    } catch (err: any) { showToast(err.message); } finally { setJoinLoading(false); }
  };

  const handleMarkRead = async (noticeId: number) => {
    try {
      await api.post(`/notices/${noticeId}/read`, {});
      loadNotifications();
    } catch (err: any) {}
  };

  const handleMarkReminderRead = async (reminderId: number) => {
    try {
      await api.post(`/parent/reminders/${reminderId}/read`, {});
      loadNotifications();
    } catch (err: any) {}
  };

  const unreadCount = notifications.filter((n: any) => !n.read_id).length;

  return (
    <div>
      <div className="page-header">
        <h2>个人中心</h2>
        <button className="btn btn-primary" onClick={() => setShowJoin(true)}>+ 绑定学生</button>
      </div>

      {/* Child selector */}
      {children.length > 0 ? (
        <div className="flex gap-8 mb-16" style={{ flexWrap: 'wrap' }}>
          {children.map((child: any) => (
            <div key={child.id} onClick={() => setSelectedChild(child)} style={{
              padding: '8px 16px', borderRadius: 8, cursor: 'pointer', border: selectedChild?.id === child.id ? '2px solid #1890ff' : '2px solid #e8e8e8',
              background: selectedChild?.id === child.id ? '#e6f7ff' : '#fff', fontSize: 14
            }}>
              <div style={{ fontWeight: 600 }}>{child.name}</div>
              <div className="text-sm text-gray">{child.grade} {child.class_name}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card empty">暂未绑定学生，请使用邀请码绑定</div>
      )}

      {selectedChild && (
        <>
          {/* Stats */}
          <div className="stat-cards">
            <div className="stat-card">
              <div className="label">待完成作业</div>
              <div className="value orange">{childHomework.filter(h => h.status === 'pending').length}</div>
            </div>
            <div className="stat-card">
              <div className="label">已完成作业</div>
              <div className="value green">{childHomework.filter(h => h.status !== 'pending').length}</div>
            </div>
            <div className="stat-card">
              <div className="label">未读通知</div>
              <div className="value" style={{ color: unreadCount > 0 ? '#f5222d' : '#1890ff' }}>{unreadCount}</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e8e8e8' }}>
            {[
              { key: 'homework', label: '作业列表' },
              { key: 'grades', label: '成绩趋势' },
              { key: 'attendance', label: '出勤记录' },
              { key: 'notices', label: `通知消息${unreadCount > 0 ? `(${unreadCount})` : ''}` },
            ].map(item => (
              <div key={item.key} onClick={() => setTab(item.key as any)} style={{
                padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: tab === item.key ? 600 : 400,
                color: tab === item.key ? '#1890ff' : '#666', borderBottom: tab === item.key ? '2px solid #1890ff' : '2px solid transparent', marginBottom: -2
              }}>{item.label}</div>
            ))}
          </div>

          {/* Homework tab */}
          {tab === 'homework' && (
            <div>
              {childHomework.length > 0 ? childHomework.map((hw: any) => (
                <div key={hw.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('homework-detail', { homeworkId: hw.id })}>
                  <div className="flex justify-between items-center">
                    <div className="card-title" style={{ marginBottom: 0 }}>{hw.title}</div>
                    <span className={`tag ${hw.status === 'reviewed' ? 'tag-green' : hw.status === 'submitted' ? 'tag-blue' : 'tag-gray'}`}>
                      {hw.status === 'reviewed' ? `已批改 ${hw.score}分` : hw.status === 'submitted' ? '已提交' : '待完成'}
                    </span>
                  </div>
                  <div className="text-sm text-gray mt-16">截止日期：{hw.due_date}</div>
                  {hw.comment && <div className="text-sm mt-16" style={{ color: '#52c41a' }}>老师评语：{hw.comment}</div>}
                </div>
              )) : <div className="card empty">暂无作业</div>}
            </div>
          )}

          {/* Grades tab */}
          {tab === 'grades' && (
            <div>
              <div className="card">
                <div className="card-title">成绩趋势图</div>
                <button className="btn btn-sm btn-primary mb-16" onClick={() => navigate('parent-grades', { studentId: selectedChild.id })}>查看详细成绩</button>
              </div>
            </div>
          )}

          {/* Attendance tab */}
          {tab === 'attendance' && childAttendance && (
            <div>
              <div className="card mb-16">
                <div className="card-title">出勤统计</div>
                <div className="stat-cards">
                  <div className="stat-card"><div className="label">出勤天数</div><div className="value green">{childAttendance.attendance?.filter((a: any) => a.status === 'present').length || 0}</div></div>
                  <div className="stat-card"><div className="label">迟到</div><div className="value orange">{childAttendance.attendance?.filter((a: any) => a.status === 'late').length || 0}</div></div>
                  <div className="stat-card"><div className="label">请假</div><div className="value">{childAttendance.attendance?.filter((a: any) => a.status === 'leave').length || 0}</div></div>
                  <div className="stat-card"><div className="label">缺勤</div><div className="value red">{childAttendance.attendance?.filter((a: any) => a.status === 'absent').length || 0}</div></div>
                </div>
              </div>
              {childAttendance.leaves?.length > 0 && (
                <div className="card">
                  <div className="card-title">请假记录</div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>日期</th><th>原因</th><th>状态</th><th>回复</th></tr></thead>
                      <tbody>
                        {childAttendance.leaves.map((l: any) => (
                          <tr key={l.id}>
                            <td>{l.start_date} ~ {l.end_date}</td>
                            <td>{l.reason}</td>
                            <td>{l.status === 'approved' ? <span className="tag tag-green">已批准</span> : l.status === 'rejected' ? <span className="tag tag-red">已驳回</span> : <span className="tag tag-orange">待审批</span>}</td>
                            <td>{l.reply || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notices tab */}
          {tab === 'notices' && (
            <div>
              {notifications.length > 0 ? notifications.map((n: any) => (
                <div key={`${n.type}-${n.id}`} className="card" style={{ cursor: 'pointer', opacity: n.read_id ? 0.7 : 1 }} onClick={() => {
                  if (!n.read_id) {
                    if (n.type === 'homework_reminder') handleMarkReminderRead(n.id);
                    else handleMarkRead(n.id);
                  }
                  if (n.type === 'homework_reminder' && n.homework_id) navigate('homework-detail', { homeworkId: n.homework_id });
                  else navigate('notice-detail', { noticeId: n.id });
                }}>
                  <div className="flex justify-between items-center">
                    <div className="card-title" style={{ marginBottom: 0 }}>
                      {n.type === 'homework_reminder' && <span className="tag tag-orange" style={{ marginRight: 8, verticalAlign: 'middle' }}>催交</span>}
                      {n.title}
                    </div>
                    <span className={`tag ${n.read_id ? 'tag-gray' : 'tag-blue'}`}>{n.read_id ? '已读' : '未读'}</span>
                  </div>
                  <div className="text-sm text-gray mt-16">{n.class_name} | {n.teacher_name} | {n.created_at?.split('T')[0] || n.created_at?.split(' ')[0]}</div>
                </div>
              )) : <div className="card empty">暂无通知</div>}
            </div>
          )}
        </>
      )}

      {/* Join modal */}
      {showJoin && (
        <div className="modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>绑定学生</h3>
            <div className="form-group">
              <label>班级邀请码</label>
              <input type="text" value={joinForm.invite_code} onChange={e => setJoinForm({ ...joinForm, invite_code: e.target.value.toUpperCase() })} placeholder="请输入老师提供的邀请码" />
            </div>
            <div className="form-group">
              <label>学生姓名</label>
              <input type="text" value={joinForm.student_name} onChange={e => setJoinForm({ ...joinForm, student_name: e.target.value })} placeholder="请输入学生姓名" />
            </div>
            <div className="form-group">
              <label>学号（可选）</label>
              <input type="text" value={joinForm.student_no} onChange={e => setJoinForm({ ...joinForm, student_no: e.target.value })} placeholder="请输入学号" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setShowJoin(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleJoin} disabled={joinLoading}>{joinLoading ? '绑定中...' : '绑定'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
