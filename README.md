# 家校沟通平台

全栈家校沟通平台，连接老师与家长，实现作业管理、成绩管理、通知公告、请假审批等功能。

## 技术栈

- **前端**: React 18 + TypeScript + Vite (端口 5173)
- **后端**: Express + TypeScript + better-sqlite3 (端口 3000)
- **认证**: JWT + bcryptjs
- **开发工具**: concurrently 同时启动前后端

## 快速开始

```bash
# 安装依赖（会自动安装 server 和 client 的依赖）
npm install

# 填充测试数据
npm run seed

# 启动开发服务器
npm run dev
```

启动后访问 http://localhost:5173

## 测试账号

| 角色 | 用户名 | 密码 | 说明 |
|------|--------|------|------|
| 管理员 | admin | 123456 | 管理全校班级和教师 |
| 老师 | teacher1 | 123456 | 张老师，管理一班 |
| 老师 | teacher2 | 123456 | 李老师，管理二班 |
| 家长 | parent1 | 123456 | 赵家长，有两个孩子 |
| 家长 | parent2 | 123456 | 钱家长，有一个孩子 |

## 班级邀请码

| 班级 | 年级 | 邀请码 |
|------|------|--------|
| 一班 | 三年级 | CLASS001A |
| 二班 | 三年级 | CLASS002B |
| 三班 | 四年级 | CLASS003C |

## 功能模块

### 老师端
- 创建班级，生成邀请码
- 发布作业（标题、内容、截止日期、附件）
- 批改作业（评分、写评语）
- 录入考试成绩（按学生逐个或按科目批量）
- 查看全班成绩分布统计和排名
- 发布班级通知公告
- 审批请假申请（批准/驳回）
- 查看班级花名册和作业完成率统计

### 家长端
- 用邀请码绑定学生和班级
- 查看孩子作业列表，标记已交
- 查看作业批改结果（评分、评语）
- 查看孩子成绩和成绩趋势图
- 查看出勤记录
- 签收班级通知
- 提交请假申请

### 管理员端
- 查看全校数据汇总
- 管理班级信息
- 管理教师信息

## 项目结构

```
wje-181/
├── package.json          # 根配置，concurrently 启动
├── README.md
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts      # Express 服务入口
│       ├── db.ts         # SQLite 数据库初始化
│       ├── seed.ts       # 测试数据填充
│       ├── middleware/
│       │   └── auth.ts   # JWT 认证中间件
│       └── routes/
│           ├── auth.ts       # 登录注册
│           ├── classes.ts    # 班级管理
│           ├── homework.ts   # 作业管理
│           ├── grades.ts     # 成绩管理
│           ├── notices.ts    # 通知管理
│           ├── leave.ts      # 请假管理
│           ├── parent.ts     # 家长相关接口
│           └── admin.ts      # 管理员接口
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html         # 入口 HTML（含所有样式）
    └── src/
        ├── main.tsx
        ├── App.tsx        # 主应用（路由和布局）
        ├── utils/
        │   ├── api.ts     # API 请求封装
        │   └── auth.ts    # 认证工具
        └── pages/
            ├── LoginPage.tsx
            ├── RegisterPage.tsx
            ├── TeacherDashboard.tsx
            ├── ClassDetail.tsx
            ├── HomeworkCreate.tsx
            ├── HomeworkDetail.tsx
            ├── GradeEntry.tsx
            ├── NoticeCreate.tsx
            ├── NoticeDetail.tsx
            ├── LeaveManagement.tsx
            ├── ParentDashboard.tsx
            ├── ParentHomework.tsx
            ├── ParentGrades.tsx
            └── AdminDashboard.tsx
```
