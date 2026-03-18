import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { join } from 'path';
import internalRoutes from './routes/internal.routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/slips', express.static(join(process.cwd(), 'slips')));

app.get('/health', (_req, res) => {
  res.json({
    service: 'ns-payment-service',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use('/internal', internalRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

export default app;
