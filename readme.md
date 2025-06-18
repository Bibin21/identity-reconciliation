# Identity Reconciliation Service

A service that helps identify and link customer identities across multiple transactions with different contact information. This is particularly useful for e-commerce platforms where customers might use different email addresses or phone numbers across purchases.

## Endpoint

Hit POST Request on - https://identity-reconciliation-evlc.onrender.com/identify

Body
```json
{
  "email": "sample@gmail.com",
  "phoneNumber": "718271827"
}
```

## Problem Statement

E-commerce platforms need to track customer identities across multiple purchases, even when customers use different contact information. This service provides a way to:
- Link different contact information to the same customer
- Maintain a primary contact record with associated secondary contacts
- Consolidate customer information for better customer experience

## Features

- Link contacts based on matching email or phone number
- Maintain hierarchy of primary and secondary contacts
- Automatically consolidate customer information
- Handle concurrent updates safely with transactions
- Prevent duplicate entries with unique constraints

## Tech Stack

- Node.js with TypeScript
- Express.js for REST API
- Prisma ORM with MySQL
- REST API endpoints
- Database transactions for data consistency

## Database Schema

```prisma
model Contact {
  id             Int             @id @default(autoincrement())
  phoneNumber    String?
  email          String?
  linkedId       Int?                                     
  linkPrecedence LinkPrecedence  @default(primary)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  deletedAt      DateTime?

  linkedContact  Contact?        @relation("Link", fields: [linkedId], references: [id])
  relatedContacts Contact[]      @relation("Link")

  @@unique([email, phoneNumber])
}

enum LinkPrecedence {
  primary
  secondary
}
```

## API Documentation

### POST /identify

Identifies and consolidates contact information.

#### Request
```json
{
  "email": string | null,
  "phoneNumber": string | null
}
```

#### Response
```json
{
  "contact": {
    "primaryContatctId": number,
    "emails": string[],
    "phoneNumbers": string[],
    "secondaryContactIds": number[]
  }
}
```

#### Examples

1. New Contact Creation
```json
Request:
{
  "email": "lorraine@hillvalley.edu",
  "phoneNumber": "123456"
}

Response:
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
```

2. Linking Existing Contacts
```json
Request:
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}

Response:
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

## Setup Instructions

1. Clone the repository
```bash
git clone <repository-url>
cd Identity-Reconciliation
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Run database migrations
```bash
npx prisma migrate dev
```

5. Start the server
```bash
npm run dev
```




