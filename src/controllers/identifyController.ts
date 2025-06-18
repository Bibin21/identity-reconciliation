import { Request, Response, NextFunction } from 'express';
import { ContactService } from '../service/contactService';

const contactService = new ContactService();

export const handleIdentify = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      res.status(400).json({ error: 'Email or phoneNumber required' });
      return;
    }

    const result = await contactService.identifyContact(email, phoneNumber?.toString());
    res.json({ contact: result });
  } catch (error) {
    console.error('Error in handleIdentify:', error);
    next(error);
  }
};
