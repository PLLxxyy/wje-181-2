import { useState } from 'react';
import { api } from '../utils/api';
import { storeAuth, User } from '../utils/auth';

interface Props {
  onSwitch: () => void;
  onLogin: (user: User) => void;
  showToast: (msg: string) => void;
}

export default function LoginPage({ onSwitch, onLogin, showToast }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('请输入用户名和密码'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/auth/login', { username, password });
      storeAuth(data.token, data.user);
      onLogin(data.user);
      showToast('登录成功');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h2>家校沟通平台</h2>
        <p className="subtitle">连接家庭与学校，共育未来</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>用户名</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="请输入用户名" />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入密码" />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>
        <div className="switch-link">
          还没有账号？<a onClick={onSwitch}>立即注册</a>
        </div>
        <div style={{ marginTop: 20, padding: 16, background: '#f5f5f5', borderRadius: 8, fontSize: 13, color: '#666' }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>测试账号：</div>
          <div>管理员：admin / 123456</div>
          <div>老师：teacher1 / 123456</div>
          <div>家长：parent1 / 123456</div>
        </div>
      </div>
    </div>
  );
}
