/*
  Warnings:

  - You are about to drop the column `googleAuthToken` on the `User` table. All the data in the column will be lost.
  - Added the required column `googleAccessToken` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `googleAccessTokenExpiresAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `googleRefreshToken` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "User.googleAuthToken_unique";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "googleAuthToken",
ADD COLUMN     "googleAccessToken" TEXT NOT NULL,
ADD COLUMN     "googleAccessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "googleRefreshToken" TEXT NOT NULL;
