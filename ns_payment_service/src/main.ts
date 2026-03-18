import 'dotenv/config';
import app from './app';
import { connectToMongo } from './db/mongo';

const PORT = Number(process.env.PORT) || 3002;

async function bootstrap(): Promise<void> {
  await connectToMongo();

  app.listen(PORT, () => {
    console.log(`ns-payment-service listening on http://localhost:${PORT}`);
    console.log(`Health: GET  http://localhost:${PORT}/health`);
    console.log(`Create: POST http://localhost:${PORT}/internal/payments/intent`);
    console.log(`Confirm: POST http://localhost:${PORT}/internal/payments/:id/confirm`);
    console.log(`Refund: POST http://localhost:${PORT}/internal/payments/:id/refund`);
  });
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`Failed to start ns-payment-service: ${message}`);
  process.exit(1);
});
