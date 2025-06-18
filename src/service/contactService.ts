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
    const contactMap = new Map<number, Contact>();
    contacts.forEach(c => contactMap.set(c.id, c));

    // Get the IDs of all other primary contacts
    const otherPrimaryIds = new Set<number>();
    contacts.forEach(c => {
      if (c.linkPrecedence === 'primary' && c.id !== primary.id) {
        otherPrimaryIds.add(c.id);
      }
    });

    // Find contacts that need to be updated (Primary and Seconadries linked to primaries)
    const contactsToUpdate = contacts.filter(c =>
      (c.linkPrecedence === 'primary' && c.id !== primary.id) || // other primaries
      (c.linkedId && otherPrimaryIds.has(c.linkedId))           // secondaries linked to other primaries
    );

    // updating all contacts to point to new primary
    for (const contact of contactsToUpdate) {
      await this.prisma.contact.update({
        where: { id: contact.id },
        data: {
          linkPrecedence: 'secondary' as LinkPrecedence,
          linkedId: primary.id,
        },
      });
    }
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

    // Find the oldest primaru
    const primary = allRelated.reduce((oldest, curr) => {
      return oldest.createdAt < curr.createdAt ? oldest : curr;
    });


    await this.updateContactsToPrimary(primary, allRelated); // we have a unique constraint + a check
    const exactMatchExists = allRelated.some(
      c => 
        c.email === (email || null) && 
        c.phoneNumber === (phoneNumber?.toString() || null)
    );

    // Check if we have partial match but with new information
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

    // return result with primary contact and all related contacts
    const finalContacts = await this.prisma.contact.findMany({
      where: {
        OR: [{ id: primary.id }, { linkedId: primary.id }],
      },
    });

    return this.formatResponse(primary, finalContacts);
  }
}
