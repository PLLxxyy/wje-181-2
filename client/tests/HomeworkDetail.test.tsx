import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import React from 'react';

vi.mock('../src/utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from '../src/utils/api';
import HomeworkDetail from '../src/pages/HomeworkDetail';

const teacherUser = { id: 2, username: 'teacher1', role: 'teacher', name: '张老师' } as any;
const parentUser = { id: 5, username: 'parent1', role: 'parent', name: '赵家长' } as any;

const FIXED_TODAY = '2026-06-17';

function daysFromFixedToday(days: number): string {
  const base = new Date(FIXED_TODAY + 'T00:00:00');
  base.setDate(base.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
}

function buildHwPayload(dueDate: string, submissions: any[] = []) {
  return {
    id: 1,
    class_id: 1,
    teacher_id: 2,
    title: '语文作业',
    content: '完成练习',
    due_date: dueDate,
    attachment: '',
    created_at: '2026-06-10 10:00:00',
    teacher_name: '张老师',
    class_name: '一班',
    submissions,
  };
}

describe('HomeworkDetail - 一键催交按钮显示逻辑', () => {
  const navigate = vi.fn();
  const showToast = vi.fn();
  let OriginalDate: DateConstructor;

  function setMockDateTime(localDateTimeStr: string) {
    const fixedNow = new OriginalDate(localDateTimeStr).getTime();
    class MockDate extends OriginalDate {
      constructor(...args: any[]) {
        if (args.length === 0) super(fixedNow as any);
        else super(...(args as [any]));
      }
      static now() { return fixedNow; }
    }
    global.Date = MockDate as DateConstructor;
  }

  beforeEach(() => {
    OriginalDate = global.Date;
    setMockDateTime(FIXED_TODAY + 'T10:00:00');

    (api.get as any).mockReset();
    (api.post as any).mockReset();
    navigate.mockReset();
    showToast.mockReset();
  });

  afterEach(() => {
    global.Date = OriginalDate;
  });

  describe('基础截止日期显示', () => {
    it('老师视角、有未提交学生且已过截止日期 -> 显示一键催交按钮', async () => {
      const dueDate = daysFromFixedToday(-1);
      const submissions = [
        { id: 1, student_no: '001', student_name: '赵小明', status: 'pending' },
        { id: 2, student_no: '002', student_name: '赵小红', status: 'submitted' },
      ];
      (api.get as any).mockResolvedValue(buildHwPayload(dueDate, submissions));

      render(<HomeworkDetail user={teacherUser} homeworkId={1} navigate={navigate} showToast={showToast} />);

      await waitFor(() => {
        expect(screen.getByText(/提交情况/)).toBeInTheDocument();
      });

      const remindBtn = screen.getByRole('button', { name: /一键催交/ });
      expect(remindBtn).toBeInTheDocument();
      expect(remindBtn).not.toBeDisabled();
    });

    it('老师视角、截止日期在 5 天后（未到期）-> 不显示一键催交按钮', async () => {
      const dueDate = daysFromFixedToday(5);
      const submissions = [
        { id: 1, student_no: '001', student_name: '赵小明', status: 'pending' },
      ];
      (api.get as any).mockResolvedValue(buildHwPayload(dueDate, submissions));

      render(<HomeworkDetail user={teacherUser} homeworkId={1} navigate={navigate} showToast={showToast} />);

      await waitFor(() => {
        expect(screen.getByText(/提交情况/)).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /一键催交/ })).not.toBeInTheDocument();
    });

    it('老师视角、截止日期就是今天（未到期）-> 不显示一键催交按钮', async () => {
      const dueDate = daysFromFixedToday(0);
      const submissions = [
        { id: 1, student_no: '001', student_name: '赵小明', status: 'pending' },
      ];
      (api.get as any).mockResolvedValue(buildHwPayload(dueDate, submissions));

      render(<HomeworkDetail user={teacherUser} homeworkId={1} navigate={navigate} showToast={showToast} />);

      await waitFor(() => {
        expect(screen.getByText(/提交情况/)).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /一键催交/ })).not.toBeInTheDocument();
    });

    it('老师视角、已过截止日期但所有学生已提交 -> 不显示一键催交按钮', async () => {
      const dueDate = daysFromFixedToday(-2);
      const submissions = [
        { id: 1, student_no: '001', student_name: '赵小明', status: 'submitted' },
        { id: 2, student_no: '002', student_name: '赵小红', status: 'reviewed' },
      ];
      (api.get as any).mockResolvedValue(buildHwPayload(dueDate, submissions));

      render(<HomeworkDetail user={teacherUser} homeworkId={1} navigate={navigate} showToast={showToast} />);

      await waitFor(() => {
        expect(screen.getByText(/提交情况/)).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /一键催交/ })).not.toBeInTheDocument();
    });

    it('家长视角、任何情况都不显示一键催交按钮', async () => {
      const dueDate = daysFromFixedToday(-1);
      const submissions = [
        { id: 1, student_no: '001', student_name: '赵小明', status: 'pending' },
      ];
      (api.get as any).mockResolvedValue(buildHwPayload(dueDate, submissions));

      render(<HomeworkDetail user={parentUser} homeworkId={1} navigate={navigate} showToast={showToast} />);

      await waitFor(() => {
        expect(screen.getByText('提交状态')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /一键催交/ })).not.toBeInTheDocument();
    });
  });

  describe('凌晨跨日场景（本地时区口径一致性）', () => {
    it('凌晨 00:30，本地日期 17 号，截止日期 17 号（今天）-> 不显示催交按钮', async () => {
      setMockDateTime('2026-06-17T00:30:00');
      const submissions = [
        { id: 1, student_no: '001', student_name: '赵小明', status: 'pending' },
      ];
      (api.get as any).mockResolvedValue(buildHwPayload('2026-06-17', submissions));

      render(<HomeworkDetail user={teacherUser} homeworkId={1} navigate={navigate} showToast={showToast} />);

      await waitFor(() => {
        expect(screen.getByText(/提交情况/)).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /一键催交/ })).not.toBeInTheDocument();
    });

    it('凌晨 00:30，本地日期 17 号，截止日期 16 号（昨天）-> 显示催交按钮', async () => {
      setMockDateTime('2026-06-17T00:30:00');
      const submissions = [
        { id: 1, student_no: '001', student_name: '赵小明', status: 'pending' },
      ];
      (api.get as any).mockResolvedValue(buildHwPayload('2026-06-16', submissions));

      render(<HomeworkDetail user={teacherUser} homeworkId={1} navigate={navigate} showToast={showToast} />);

      await waitFor(() => {
        expect(screen.getByText(/提交情况/)).toBeInTheDocument();
      });

      const btn = screen.getByRole('button', { name: /一键催交/ });
      expect(btn).toBeInTheDocument();
      expect(btn).not.toBeDisabled();
    });

    it('深夜 23:59，本地日期 17 号，截止日期 17 号 -> 不显示催交按钮', async () => {
      setMockDateTime('2026-06-17T23:59:00');
      const submissions = [
        { id: 1, student_no: '001', student_name: '赵小明', status: 'pending' },
      ];
      (api.get as any).mockResolvedValue(buildHwPayload('2026-06-17', submissions));

      render(<HomeworkDetail user={teacherUser} homeworkId={1} navigate={navigate} showToast={showToast} />);

      await waitFor(() => {
        expect(screen.getByText(/提交情况/)).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /一键催交/ })).not.toBeInTheDocument();
    });

    it('深夜 23:59，本地日期 17 号，截止日期 16 号 -> 显示催交按钮', async () => {
      setMockDateTime('2026-06-17T23:59:00');
      const submissions = [
        { id: 1, student_no: '001', student_name: '赵小明', status: 'pending' },
      ];
      (api.get as any).mockResolvedValue(buildHwPayload('2026-06-16', submissions));

      render(<HomeworkDetail user={teacherUser} homeworkId={1} navigate={navigate} showToast={showToast} />);

      await waitFor(() => {
        expect(screen.getByText(/提交情况/)).toBeInTheDocument();
      });

      const btn = screen.getByRole('button', { name: /一键催交/ });
      expect(btn).toBeInTheDocument();
    });
  });

  describe('按钮交互', () => {
    it('点击一键催交按钮后调用催交接口并显示成功提示', async () => {
      const dueDate = daysFromFixedToday(-1);
      const submissions = [
        { id: 1, student_no: '001', student_name: '赵小明', status: 'pending' },
        { id: 2, student_no: '002', student_name: '赵小红', status: 'pending' },
      ];
      (api.get as any).mockResolvedValue(buildHwPayload(dueDate, submissions));
      (api.post as any).mockResolvedValue({ success: true, count: 2 });

      render(<HomeworkDetail user={teacherUser} homeworkId={1} navigate={navigate} showToast={showToast} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /一键催交/ })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /一键催交/ }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(1);
      });
      expect(api.post).toHaveBeenCalledWith('/homework/1/remind', {});
      expect(showToast).toHaveBeenCalledWith('已催交2位学生');
    });

    it('一键催交按钮在请求中显示 催交中... 并禁用', async () => {
      const dueDate = daysFromFixedToday(-1);
      const submissions = [{ id: 1, student_no: '001', student_name: '赵小明', status: 'pending' }];
      (api.get as any).mockResolvedValue(buildHwPayload(dueDate, submissions));
      let resolvePost: any = null;
      (api.post as any).mockImplementation(() => new Promise(resolve => { resolvePost = resolve; }));

      render(<HomeworkDetail user={teacherUser} homeworkId={1} navigate={navigate} showToast={showToast} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /一键催交/ })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /一键催交/ }));

      await waitFor(() => {
        const btn = screen.getByRole('button', { name: /催交中/ });
        expect(btn).toBeInTheDocument();
        expect(btn).toBeDisabled();
      });

      await act(async () => {
        resolvePost({ success: true, count: 1 });
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /一键催交/ })).toBeInTheDocument();
      });
    });
  });
});
