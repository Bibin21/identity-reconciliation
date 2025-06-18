import { Request, Response,NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const handleIdentify = (req: Request, res: Response, next: NextFunction) => {
  // function implementation here
  const { email, phoneNumber } = req.body;

  // Example placeholder
  return res.status(200).json({
    contact: {
      primaryContatctId: 1,
      emails: [email],
      phoneNumbers: [phoneNumber],
      secondaryContactIds: []
    }
  });
};
