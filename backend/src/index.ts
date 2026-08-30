import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import riskRoutes from './routes/risk.routes.js';
import ctgRoutes from './routes/ctg.routes.js';
import symptomsRoutes from './routes/symptoms.routes.js';
import alertsRoutes from './routes/alerts.routes.js';
import doctorRoutes from './routes/doctor.routes.js';
import chatRoutes from './routes/chat.routes.js';
import approvalRoutes from './routes/approval.routes.js';
import vitalsRoutes from './routes/vitals.routes.js';
import prescriptionsRoutes from './routes/prescriptions.routes.js';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Request logging (sanitized)
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Maathru Care Backend Node.js Gateway',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/risk', riskRoutes);
app.use('/api/v1/ctg', ctgRoutes);
app.use('/api/v1/symptoms', symptomsRoutes);
app.use('/api/v1/alerts', alertsRoutes);
app.use('/api/v1/doctor', doctorRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/approval', approvalRoutes);
app.use('/api/v1/vitals', vitalsRoutes);
app.use('/api/v1/prescriptions', prescriptionsRoutes);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`Maathru Care Express Backend listening on port ${PORT}`);
  console.log(`Connected with Member 2 Maternal Risk & CTG Suite`);
  console.log(`====================================================`);
});

export default app;
