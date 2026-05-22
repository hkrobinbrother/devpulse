import app from './app';
import initDB from './config/initDB';

const PORT = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  // Initialize database tables before starting server
  await initDB();

  app.listen(PORT, () => {
    console.log(`🚀 DevPulse server running on port ${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
