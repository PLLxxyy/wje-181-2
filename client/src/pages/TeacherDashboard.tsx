import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { User } from '../utils/auth';

interface Props {
  user: User;
  navigate: (page: string, params?: Record<string, any>) => void;
  showToast: (msg: string) => void;
}

export default function TeacherDashboard({ user, navigate, showToast }: Props) {
  const [classes, setClasses] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', grade: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadClasses(); }, []);

  const loadClasses = async () => {
    try {
      const data = await api.get('/classes/my');
      setClasses(data);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.grade) { showToast('请填写班级名称和年级'); return; }
    setLoading(true);
    try {
      await api.post('/classes', form);
      showToast('班级创建成功');
      setShowCreate(false);
      setForm({ name: '', grade: '' });
      loadClasses();
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>我的班级</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ 创建班级</button>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="label">班级数量</div>
          <div className="value">{classes.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">学生总数</div>
          <div className="value green">{classes.reduce((s, c) => s + (c.student_count || 0), 0)}</div>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="card empty">暂无班级，请先创建班级</div>
      ) : (
        <div className="card-grid">
          {classes.map((cls: any) => (
            <div key={cls.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('class-detail', { classId: cls.id })}>
              <div className="card-title">{cls.grade} {cls.name}</div>
              <div className="text-sm text-gray mb-8">邀请码：<span style={{ fontWeight: 600, color: '#1890ff' }}>{cls.invite_code}</span></div>
              <div className="text-sm text-gray">学生人数：{cls.student_count || 0}人</div>
              <div className="text-sm text-gray">创建时间：{cls.created_at?.split('T')[0] || cls.created_at?.split(' ')[0]}</div>
              <div className="btn-group" style={{ marginTop: 12 }} onClick={e => e.stopPropagation()}>
                <button className="btn btn-sm btn-primary" onClick={() => navigate('class-detail', { classId: cls.id })}>进入班级</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>创建新班级</h3>
            <div className="form-group">
              <label>年级</label>
              <select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}>
                <option value="">请选择年级</option>
                {['一年级','二年级','三年级','四年级','五年级','六年级','初一','初二','初三','高一','高二','高三'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>班级名称</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="如：一班、二班" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setShowCreate(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>{loading ? '创建中...' : '创建'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
