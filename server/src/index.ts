import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import classRoutes from './routes/classes';
import homeworkRoutes from './routes/homework';
import gradeRoutes from './routes/grades';
import noticeRoutes from './routes/notices';
import leaveRoutes from './routes/leave';
import parentRoutes from './routes/parent';
import adminRoutes from './routes/admin';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
