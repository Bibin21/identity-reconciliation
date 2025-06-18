import express from 'express';
import { PrismaClient } from '@prisma/client';
import identifyRouter from './routes/identify';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use('/identify', identifyRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
