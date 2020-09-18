-- CreateEnum
CREATE TYPE "EmailAddresssType" AS ENUM ('HOME', 'WORK', 'OTHER');

-- CreateEnum
CREATE TYPE "PhoneNumberType" AS ENUM ('MAIN', 'HOME', 'WORK', 'MOBILE', 'OTHER');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('HOME', 'WORK', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactAffinity" AS ENUM ('NEW', 'BEST', 'CLOSE', 'SOLID', 'DISTANT', 'KEEP', 'UNDEFINED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailAddress" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "givenName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "photoURL" TEXT,
    "googleAuthToken" TEXT NOT NULL,
    "contactsSyncToken" TEXT,
    "calendarEventsSyncToken" TEXT,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAddress" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "EmailAddresssType" NOT NULL,
    "value" TEXT NOT NULL,
    "contactID" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneNumber" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "PhoneNumberType" NOT NULL,
    "value" TEXT NOT NULL,
    "contactID" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "AddressType" NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "region" TEXT,
    "streetAddress" TEXT,
    "contactID" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resourceName" TEXT NOT NULL,
    "familyName" TEXT,
    "givenName" TEXT,
    "displayName" TEXT NOT NULL,
    "photoURL" TEXT,
    "notes" TEXT NOT NULL,
    "affinity" "ContactAffinity" NOT NULL,
    "userID" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerID" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "userID" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEventAttendee" (
    "userID" TEXT NOT NULL,
    "calendarEventID" TEXT NOT NULL,
    "contactID" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User.emailAddress_unique" ON "User"("emailAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User.googleAuthToken_unique" ON "User"("googleAuthToken");

-- CreateIndex
CREATE UNIQUE INDEX "Contact.resourceName_unique" ON "Contact"("resourceName");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent.userID_providerID_unique" ON "CalendarEvent"("userID", "providerID");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEventAttendee.calendarEventID_contactID_unique" ON "CalendarEventAttendee"("calendarEventID", "contactID");

-- AddForeignKey
ALTER TABLE "EmailAddress" ADD FOREIGN KEY ("contactID") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneNumber" ADD FOREIGN KEY ("contactID") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD FOREIGN KEY ("contactID") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEventAttendee" ADD FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEventAttendee" ADD FOREIGN KEY ("calendarEventID") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEventAttendee" ADD FOREIGN KEY ("contactID") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
