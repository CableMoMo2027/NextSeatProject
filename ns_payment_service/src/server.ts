import 'dotenv/config';
import app from './app';

const PORT = Number(process.env.PORT) || 3002;

app.listen(PORT, () => {
  console.log(`ns-payment-service listening on http://localhost:${PORT}`);
  console.log(`Health: GET  http://localhost:${PORT}/health`);
  console.log(`Create: POST http://localhost:${PORT}/internal/payments/intent`);
  console.log(`Confirm: POST http://localhost:${PORT}/internal/payments/:id/confirm`);
  console.log(`Refund: POST http://localhost:${PORT}/internal/payments/:id/refund`);
});
