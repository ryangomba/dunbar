/*
  Warnings:

  - Added the required column `userID` to the `Address` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userID` to the `EmailAddress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userID` to the `PhoneNumber` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "userID" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "EmailAddress" ADD COLUMN     "userID" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PhoneNumber" ADD COLUMN     "userID" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "EmailAddress" ADD FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneNumber" ADD FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
