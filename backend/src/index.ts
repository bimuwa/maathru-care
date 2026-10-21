import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { logger } from './services/logger.service.js';

import authRoutes from './routes/auth.routes.js';
import riskRoutes from './routes/risk.routes.js';
import ctgRoutes from './routes/ctg.routes.js';
import symptomsRoutes from './routes/symptoms.routes.js';
import alertsRoutes from './routes/alerts.routes.js';
import doctorRoutes from './routes/doctor.routes.js';
import customFoodReviewRoutes from './routes/custom-food-review.routes.js';
import devDoctorReviewRoutes from './routes/dev-doctor-review.routes.js';
import chatRoutes from './routes/chat.routes.js';
import approvalRoutes from './routes/approval.routes.js';
import vitalsRoutes from './routes/vitals.routes.js';
import prescriptionsRoutes from './routes/prescriptions.routes.js';
import kicksRoutes from './routes/kicks.routes.js';
import appointmentsRoutes from './routes/appointments.routes.js';
import reportsRoutes from './routes/reports.routes.js';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const suppliedId = req.get('x-request-id')?.trim();
  const requestId = suppliedId && /^[A-Za-z0-9._:-]{1,80}$/.test(suppliedId) ? suppliedId : randomUUID();
  const startedAt = process.hrtime.bigint();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const fields = { requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Number(durationMs.toFixed(2)) };
    if (res.statusCode >= 500) logger.error('http.request.completed', undefined, fields);
    else if (res.statusCode >= 400) logger.warn('http.request.completed', fields);
    else logger.info('http.request.completed', fields);
  });
  next();
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

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
app.use('/api/v1/doctor', customFoodReviewRoutes);
app.use('/api/v1/dev-doctor-review', devDoctorReviewRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/approval', approvalRoutes);
app.use('/api/v1/vitals', vitalsRoutes);
app.use('/api/v1/prescriptions', prescriptionsRoutes);
app.use('/api/v1/kicks', kicksRoutes);
app.use('/api/v1/appointments', appointmentsRoutes);
app.use('/api/v1/reports', reportsRoutes);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('http.request.unhandled_error', err, { requestId: res.locals.requestId, status: err.status || 500 });
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : (err.message || 'Internal Server Error'),
    requestId: res.locals.requestId,
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`Maathru Care Express Backend listening on port ${PORT}`);
  console.log(`Connected with Member 2 Maternal Risk & CTG Suite`);
  console.log(`====================================================`);
  logger.info('server.started', { port: PORT, environment: process.env.NODE_ENV || 'development' });
});

export default app;
