import { PrismaClient, Contact, LinkPrecedence } from '@prisma/client';

interface ContactDTO {
  primaryContatctId: number;
  emails: string[];
  phoneNumbers: string[];
  secondaryContactIds: number[];
}

export class ContactService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  private async findContactsByEmailOrPhone(email?: string, phoneNumber?: string): Promise<Contact[]> {
    return this.prisma.contact.findMany({
      where: {
        OR: [
          { email: email || undefined },
          { phoneNumber: phoneNumber?.toString() || undefined },
        ],
      },
    });
  }

  private async getAllRelatedContacts(contactIds: Set<number>): Promise<Contact[]> {
    return this.prisma.contact.findMany({
      where: {
        OR: [
          { id: { in: [...contactIds] } },
          { linkedId: { in: [...contactIds] } },
        ],
      },
    });
  }

  private async createPrimaryContact(email?: string, phoneNumber?: string): Promise<Contact> {
    return this.prisma.contact.create({
      data: {
        email: email || null,
        phoneNumber: phoneNumber?.toString() || null,
      },
    });
  }

  private async createSecondaryContact(
    email: string | null,
    phoneNumber: string | null,
    primaryId: number
  ): Promise<Contact> {
    return this.prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: 'secondary',
        linkedId: primaryId,
      },
    });
  }  private async updateContactsToPrimary(primary: Contact, contacts: Contact[]): Promise<void> {
    // Get the IDs of all other primary contacts
    const otherPrimaryIds = contacts
      .filter(c => c.linkPrecedence === 'primary' && c.id !== primary.id)
      .map(c => c.id);

    if (otherPrimaryIds.length === 0) return;

    // Find all secondaries linked to these primaries
    const secondaryIds = contacts
      .filter(c => c.linkedId && otherPrimaryIds.includes(c.linkedId))
      .map(c => c.id);

    // list of rows to be updated
    const allIdsToUpdate = [...otherPrimaryIds, ...secondaryIds];

    console.log(allIdsToUpdate);

    if (allIdsToUpdate.length === 0) return;

    // Single batch update for all contacts
    await this.prisma.contact.updateMany({
      where: {
        id: {
          in: allIdsToUpdate
        }
      },
      data: {
        linkPrecedence: 'secondary',
        linkedId: primary.id,
      }
    });
  }

  private formatResponse(primary: Contact, relatedContacts: Contact[]): ContactDTO {
    const allContacts = [primary, ...relatedContacts];    const emails = Array.from(
      new Set(allContacts.map(c => c.email).filter((email): email is string => email !== null))
    );
    const phoneNumbers = Array.from(
      new Set(allContacts.map(c => c.phoneNumber).filter((phone): phone is string => phone !== null))
    );
    const secondaryIds = allContacts
      .filter(c => c.linkPrecedence === 'secondary')
      .map(c => c.id);

    return {
      primaryContatctId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaryIds,
    };
  }
  public async identifyContact(email?: string, phoneNumber?: string): Promise<ContactDTO> {
    if (!email && !phoneNumber) {
      throw new Error('Email or phoneNumber required');
    }

    return await this.prisma.$transaction(async (prisma) => {
      // Find all contacts with matching email or phone
      const contacts = await this.findContactsByEmailOrPhone(email, phoneNumber);

      // If no existing links found create new
      if (contacts.length === 0) {
        const newContact = await this.createPrimaryContact(email, phoneNumber);
        return this.formatResponse(newContact, []);
      }

      // Get all related contacts
      const contactIds = new Set<number>();
      for (const c of contacts) {
        if (c.linkedId) contactIds.add(c.linkedId);
        contactIds.add(c.id);
      }

      const allRelated = await this.getAllRelatedContacts(contactIds);

      // Find the oldest primary
      const primary = allRelated.reduce((oldest, curr) => {
        return oldest.createdAt < curr.createdAt ? oldest : curr;
      });

      await this.updateContactsToPrimary(primary, allRelated);

      const exactMatchExists = allRelated.some(
        c => 
          c.email === (email || null) && 
          c.phoneNumber === (phoneNumber?.toString() || null)
      );

      // if we have partial match but with new info
      const hasPartialMatchWithNewInfo = !exactMatchExists && allRelated.some(
        c =>
          (email && c.email === email && c.phoneNumber !== (phoneNumber?.toString() || null)) ||
          (phoneNumber && c.phoneNumber === phoneNumber.toString() && c.email !== (email || null))
      );

      // Create secondary contact for a partial match
      if (hasPartialMatchWithNewInfo) {
        await this.createSecondaryContact(
          email || null,
          phoneNumber?.toString() || null,
          primary.id
        );
      }

      // Get final result
      const finalContacts = await prisma.contact.findMany({
        where: {
          OR: [{ id: primary.id }, { linkedId: primary.id }],
        },
      });

      return this.formatResponse(primary, finalContacts);
    });
  }
}
