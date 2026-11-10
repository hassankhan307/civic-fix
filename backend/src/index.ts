import http from 'http';
import app from './app';
import { env } from './config/env';
import { initSocketIO } from './services/socket.service';
import prisma from './prisma';

const server = http.createServer(app);

// Initialize Socket.IO real-time server
initSocketIO(server);

const PORT = env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` CivicFix Backend API & Real-Time Engine Active`);
  console.log(` Port: ${PORT}`);
  console.log(` Environment: ${env.NODE_ENV}`);
  console.log(` OpenAPI Docs: http://localhost:${PORT}/api/docs`);
  console.log(` Health: http://localhost:${PORT}/health`);
  console.log(`====================================================`);
});

// Graceful shutdown handling
const shutdown = async () => {
  console.log('Shutting down CivicFix server gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database disconnected. Process terminated.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
