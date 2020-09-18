/*
  Warnings:

  - A unique constraint covering the columns `[userID,resourceName]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Contact.userID_resourceName_unique" ON "Contact"("userID", "resourceName");
