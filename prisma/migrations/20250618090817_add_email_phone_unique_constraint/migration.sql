/*
  Warnings:

  - A unique constraint covering the columns `[email,phoneNumber]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Contact_email_phoneNumber_key` ON `Contact`(`email`, `phoneNumber`);
