const app = require('./app');
const connectDB = require('./config/db');
const { port, nodeEnv } = require('./config/env');
const { initRollupService } = require('./services/rollupService');

const start = async () => {
  await connectDB();
  initRollupService();

  app.listen(port, () => {
    console.log(`Server running on port ${port} [${nodeEnv}]`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
