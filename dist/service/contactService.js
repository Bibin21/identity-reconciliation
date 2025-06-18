"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactService = void 0;
const client_1 = require("@prisma/client");
class ContactService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    findContactsByEmailOrPhone(email, phoneNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.prisma.contact.findMany({
                where: {
                    OR: [
                        { email: email || undefined },
                        { phoneNumber: (phoneNumber === null || phoneNumber === void 0 ? void 0 : phoneNumber.toString()) || undefined },
                    ],
                },
            });
        });
    }
    getAllRelatedContacts(contactIds) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.prisma.contact.findMany({
                where: {
                    OR: [
                        { id: { in: [...contactIds] } },
                        { linkedId: { in: [...contactIds] } },
                    ],
                },
            });
        });
    }
    createPrimaryContact(email, phoneNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.prisma.contact.create({
                data: {
                    email: email || null,
                    phoneNumber: (phoneNumber === null || phoneNumber === void 0 ? void 0 : phoneNumber.toString()) || null,
                },
            });
        });
    }
    createSecondaryContact(email, phoneNumber, primaryId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.prisma.contact.create({
                data: {
                    email,
                    phoneNumber,
                    linkPrecedence: 'secondary',
                    linkedId: primaryId,
                },
            });
        });
    }
    updateContactsToPrimary(primary, contacts) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get the IDs of all other primary contacts
            const otherPrimaryIds = contacts
                .filter(c => c.linkPrecedence === 'primary' && c.id !== primary.id)
                .map(c => c.id);
            if (otherPrimaryIds.length === 0)
                return;
            // Find all secondaries linked to these primaries
            const secondaryIds = contacts
                .filter(c => c.linkedId && otherPrimaryIds.includes(c.linkedId))
                .map(c => c.id);
            // list of rows to be updated
            const allIdsToUpdate = [...otherPrimaryIds, ...secondaryIds];
            console.log(allIdsToUpdate);
            if (allIdsToUpdate.length === 0)
                return;
            // Single batch update for all contacts
            yield this.prisma.contact.updateMany({
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
        });
    }
    formatResponse(primary, relatedContacts) {
        const allContacts = [primary, ...relatedContacts];
        const emails = Array.from(new Set(allContacts.map(c => c.email).filter((email) => email !== null)));
        const phoneNumbers = Array.from(new Set(allContacts.map(c => c.phoneNumber).filter((phone) => phone !== null)));
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
    identifyContact(email, phoneNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!email && !phoneNumber) {
                throw new Error('Email or phoneNumber required');
            }
            return yield this.prisma.$transaction((prisma) => __awaiter(this, void 0, void 0, function* () {
                // Find all contacts with matching email or phone
                const contacts = yield this.findContactsByEmailOrPhone(email, phoneNumber);
                // If no existing links found create new
                if (contacts.length === 0) {
                    const newContact = yield this.createPrimaryContact(email, phoneNumber);
                    return this.formatResponse(newContact, []);
                }
                // Get all related contacts
                const contactIds = new Set();
                for (const c of contacts) {
                    if (c.linkedId)
                        contactIds.add(c.linkedId);
                    contactIds.add(c.id);
                }
                const allRelated = yield this.getAllRelatedContacts(contactIds);
                // Find the oldest primary
                const primary = allRelated.reduce((oldest, curr) => {
                    return oldest.createdAt < curr.createdAt ? oldest : curr;
                });
                yield this.updateContactsToPrimary(primary, allRelated);
                const exactMatchExists = allRelated.some(c => c.email === (email || null) &&
                    c.phoneNumber === ((phoneNumber === null || phoneNumber === void 0 ? void 0 : phoneNumber.toString()) || null));
                // if we have partial match but with new info
                const hasPartialMatchWithNewInfo = !exactMatchExists && allRelated.some(c => (email && c.email === email && c.phoneNumber !== ((phoneNumber === null || phoneNumber === void 0 ? void 0 : phoneNumber.toString()) || null)) ||
                    (phoneNumber && c.phoneNumber === phoneNumber.toString() && c.email !== (email || null)));
                // Create secondary contact for a partial match
                if (hasPartialMatchWithNewInfo) {
                    yield this.createSecondaryContact(email || null, (phoneNumber === null || phoneNumber === void 0 ? void 0 : phoneNumber.toString()) || null, primary.id);
                }
                // Get final result
                const finalContacts = yield prisma.contact.findMany({
                    where: {
                        OR: [{ id: primary.id }, { linkedId: primary.id }],
                    },
                });
                return this.formatResponse(primary, finalContacts);
            }));
        });
    }
}
exports.ContactService = ContactService;
