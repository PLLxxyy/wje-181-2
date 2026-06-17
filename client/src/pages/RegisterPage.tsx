import { useState } from 'react';
import { api } from '../utils/api';
import { storeAuth, User } from '../utils/auth';

interface Props {
  onSwitch: () => void;
  onLogin: (user: User) => void;
  showToast: (msg: string) => void;
}

export default function RegisterPage({ onSwitch, onLogin, showToast }: Props) {
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'parent', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password || !form.name) { setError('请填写完整信息'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/auth/register', form);
      storeAuth(data.token, data.user);
      onLogin(data.user);
      showToast('注册成功');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h2>注册账号</h2>
        <p className="subtitle">加入家校沟通平台</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>角色</label>
            <div className="role-selector">
              <div className={`role-option ${form.role === 'parent' ? 'active' : ''}`} onClick={() => setForm({ ...form, role: 'parent' })}>家长</div>
              <div className={`role-option ${form.role === 'teacher' ? 'active' : ''}`} onClick={() => setForm({ ...form, role: 'teacher' })}>老师</div>
            </div>
          </div>
          <div className="form-group">
            <label>姓名</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="请输入真实姓名" />
          </div>
          <div className="form-group">
            <label>用户名</label>
            <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="请输入用户名" />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="请输入密码" />
          </div>
          <div className="form-group">
            <label>手机号（可选）</label>
            <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="请输入手机号" />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? '注册中...' : '注 册'}
          </button>
        </form>
        <div className="switch-link">
          已有账号？<a onClick={onSwitch}>返回登录</a>
        </div>
      </div>
    </div>
  );
}
