import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import internalRoutes from './routes/internal.routes';

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({
        service: 'ns-cinema-service',
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});

// ─── Internal routes (consumed by ns_backend) ────────────────────────────────
app.use('/internal', internalRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

export default app;
