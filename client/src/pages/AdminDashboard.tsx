import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { User } from '../utils/auth';

interface Props {
  user: User;
  navigate: (page: string, params?: Record<string, any>) => void;
  showToast: (msg: string) => void;
}

export default function AdminDashboard({ user, navigate, showToast }: Props) {
  const [tab, setTab] = useState<'summary' | 'classes' | 'teachers'>('summary');
  const [summary, setSummary] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [sumData, clsData, teacherData] = await Promise.all([
        api.get('/admin/summary'),
        api.get('/admin/classes'),
        api.get('/admin/teachers')
      ]);
      setSummary(sumData);
      setClasses(clsData);
      setTeachers(teacherData);
    } catch (err: any) { showToast(err.message); }
  };

  const handleDeleteTeacher = async (id: number) => {
    if (!confirm('确定删除该教师？')) return;
    try {
      await api.del(`/admin/teachers/${id}`);
      showToast('删除成功');
      loadData();
    } catch (err: any) { showToast(err.message); }
  };

  return (
    <div>
      <h2 className="mb-16">管理后台</h2>

      {/* Stats */}
      {summary && (
        <div className="stat-cards mb-16">
          <div className="stat-card">
            <div className="label">班级总数</div>
            <div className="value">{summary.stats.total_classes}</div>
          </div>
          <div className="stat-card">
            <div className="label">教师总数</div>
            <div className="value green">{summary.stats.total_teachers}</div>
          </div>
          <div className="stat-card">
            <div className="label">学生总数</div>
            <div className="value" style={{ color: '#722ed1' }}>{summary.stats.total_students}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e8e8e8' }}>
        {[
          { key: 'summary', label: '数据汇总' },
          { key: 'classes', label: '班级管理' },
          { key: 'teachers', label: '教师管理' },
        ].map(item => (
          <div key={item.key} onClick={() => setTab(item.key as any)} style={{
            padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: tab === item.key ? 600 : 400,
            color: tab === item.key ? '#1890ff' : '#666', borderBottom: tab === item.key ? '2px solid #1890ff' : '2px solid transparent', marginBottom: -2
          }}>{item.label}</div>
        ))}
      </div>

      {/* Summary tab */}
      {tab === 'summary' && summary && (
        <div className="card">
          <div className="card-title">各班数据汇总</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>年级</th><th>班级</th><th>班主任</th><th>学生数</th><th>作业数</th><th>考试数</th><th>通知数</th></tr></thead>
              <tbody>
                {summary.classes.map((cls: any) => (
                  <tr key={cls.id}>
                    <td>{cls.grade}</td>
                    <td>{cls.name}</td>
                    <td>{cls.teacher_name}</td>
                    <td>{cls.student_count}</td>
                    <td>{cls.homework_count}</td>
                    <td>{cls.exam_count}</td>
                    <td>{cls.notice_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Classes tab */}
      {tab === 'classes' && (
        <div className="card">
          <div className="card-title">全校班级列表</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>年级</th><th>班级</th><th>班主任</th><th>联系电话</th><th>学生数</th><th>邀请码</th><th>创建时间</th></tr></thead>
              <tbody>
                {classes.map((cls: any) => (
                  <tr key={cls.id}>
                    <td>{cls.id}</td>
                    <td>{cls.grade}</td>
                    <td>{cls.name}</td>
                    <td>{cls.teacher_name}</td>
                    <td>{cls.teacher_phone || '-'}</td>
                    <td>{cls.student_count}</td>
                    <td><span style={{ fontWeight: 600, color: '#1890ff' }}>{cls.invite_code}</span></td>
                    <td>{cls.created_at?.split('T')[0] || cls.created_at?.split(' ')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Teachers tab */}
      {tab === 'teachers' && (
        <div className="card">
          <div className="card-title">教师列表</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>姓名</th><th>用户名</th><th>手机号</th><th>班级数</th><th>学生数</th><th>注册时间</th><th>操作</th></tr></thead>
              <tbody>
                {teachers.map((t: any) => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{t.name}</td>
                    <td>{t.username}</td>
                    <td>{t.phone || '-'}</td>
                    <td>{t.class_count}</td>
                    <td>{t.student_count}</td>
                    <td>{t.created_at?.split('T')[0] || t.created_at?.split(' ')[0]}</td>
                    <td>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteTeacher(t.id)}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
