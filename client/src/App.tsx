import { useState, useEffect, useCallback } from 'react';
import { getStoredUser, User } from './utils/auth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TeacherDashboard from './pages/TeacherDashboard';
import ClassDetail from './pages/ClassDetail';
import HomeworkCreate from './pages/HomeworkCreate';
import HomeworkDetail from './pages/HomeworkDetail';
import GradeEntry from './pages/GradeEntry';
import NoticeCreate from './pages/NoticeCreate';
import NoticeDetail from './pages/NoticeDetail';
import LeaveManagement from './pages/LeaveManagement';
import ParentDashboard from './pages/ParentDashboard';
import ParentHomework from './pages/ParentHomework';
import ParentGrades from './pages/ParentGrades';
import AdminDashboard from './pages/AdminDashboard';

type Page =
  | 'login' | 'register'
  | 'teacher-dashboard' | 'class-detail' | 'homework-create' | 'homework-detail'
  | 'grade-entry' | 'notice-create' | 'notice-detail' | 'leave-management'
  | 'parent-dashboard' | 'parent-homework' | 'parent-grades'
  | 'admin-dashboard';

interface PageState {
  page: Page;
  params?: Record<string, any>;
}

function App() {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [pageState, setPageState] = useState<PageState>({ page: 'login' });
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (user) {
      if (user.role === 'teacher') setPageState({ page: 'teacher-dashboard' });
      else if (user.role === 'parent') setPageState({ page: 'parent-dashboard' });
      else if (user.role === 'admin') setPageState({ page: 'admin-dashboard' });
    }
  }, [user]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  const navigate = useCallback((page: string, params?: Record<string, any>) => {
    setPageState({ page, params } as PageState);
  }, []);

  const handleLogin = useCallback((u: User) => {
    setUser(u);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setPageState({ page: 'login' });
  }, []);

  if (!user) {
    if (pageState.page === 'register') {
      return <RegisterPage onSwitch={() => navigate('login')} onLogin={handleLogin} showToast={showToast} />;
    }
    return <LoginPage onSwitch={() => navigate('register')} onLogin={handleLogin} showToast={showToast} />;
  }

  const renderPage = () => {
    switch (pageState.page) {
      case 'teacher-dashboard':
        return <TeacherDashboard user={user} navigate={navigate} showToast={showToast} />;
      case 'class-detail':
        return <ClassDetail user={user} classId={pageState.params?.classId} navigate={navigate} showToast={showToast} />;
      case 'homework-create':
        return <HomeworkCreate user={user} classId={pageState.params?.classId} navigate={navigate} showToast={showToast} />;
      case 'homework-detail':
        return <HomeworkDetail user={user} homeworkId={pageState.params?.homeworkId} navigate={navigate} showToast={showToast} />;
      case 'grade-entry':
        return <GradeEntry user={user} classId={pageState.params?.classId} navigate={navigate} showToast={showToast} />;
      case 'notice-create':
        return <NoticeCreate user={user} classId={pageState.params?.classId} navigate={navigate} showToast={showToast} />;
      case 'notice-detail':
        return <NoticeDetail user={user} noticeId={pageState.params?.noticeId} navigate={navigate} showToast={showToast} />;
      case 'leave-management':
        return <LeaveManagement user={user} classId={pageState.params?.classId} navigate={navigate} showToast={showToast} />;
      case 'parent-dashboard':
        return <ParentDashboard user={user} navigate={navigate} showToast={showToast} />;
      case 'parent-homework':
        return <ParentHomework user={user} studentId={pageState.params?.studentId} navigate={navigate} showToast={showToast} />;
      case 'parent-grades':
        return <ParentGrades user={user} studentId={pageState.params?.studentId} navigate={navigate} showToast={showToast} />;
      case 'admin-dashboard':
        return <AdminDashboard user={user} navigate={navigate} showToast={showToast} />;
      default:
        return <div className="empty">页面不存在</div>;
    }
  };

  const getSidebarItems = () => {
    if (user.role === 'teacher') {
      return [
        { key: 'teacher-dashboard', label: '我的班级' },
      ];
    }
    if (user.role === 'parent') {
      return [
        { key: 'parent-dashboard', label: '个人中心' },
      ];
    }
    if (user.role === 'admin') {
      return [
        { key: 'admin-dashboard', label: '管理后台' },
      ];
    }
    return [];
  };

  const sidebarItems = getSidebarItems();

  return (
    <div className="app">
      <div className="header">
        <h1>家校沟通平台</h1>
        <div className="header-right">
          <span>{user.name} ({user.role === 'admin' ? '管理员' : user.role === 'teacher' ? '老师' : '家长'})</span>
          <button onClick={handleLogout}>退出登录</button>
        </div>
      </div>
      <div className="layout">
        <div className="sidebar">
          {sidebarItems.map(item => (
            <div
              key={item.key}
              className={`sidebar-item ${pageState.page === item.key ? 'active' : ''}`}
              onClick={() => navigate(item.key as Page)}
            >
              {item.label}
            </div>
          ))}
        </div>
        <div className="content">
          {renderPage()}
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;
