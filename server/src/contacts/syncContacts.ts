import { Contact } from "@prisma/client";
import moment from "moment";
import { Context } from "../auth/context";
import { PRISMA } from "../config";
import { applyEmailAliasFromContactInfo } from "./contactAliases";
import { ContactInfo, ContactInfos, ContactPair } from "./contactInfo";
import { syncAddressesForContacts } from "./syncAddresses";
import { syncEmailAddressesForContacts } from "./syncEmailAddresses";
import { syncGoogleContacts } from "./syncGoogleContacts";
import { syncPhoneNumbersForContacts } from "./syncPhoneNumbers";

export async function syncContactsForUser(ctx: Context): Promise<number> {
  const { user, googleAccessToken } = ctx;

  const startTime = moment();
  console.log(`Syncing contacts for user ${user.displayName}...`);

  if (!user.contactsSyncToken) {
    console.log("No sync token; clearing contact records");
    await PRISMA.calendarEventAttendee.deleteMany({});
    await PRISMA.calendarEvent.deleteMany({});
    await PRISMA.phoneNumber.deleteMany({});
    await PRISMA.address.deleteMany({});
    await PRISMA.emailAddress.deleteMany({});
    await PRISMA.contact.deleteMany({});
  } else {
    console.log(`Fetching contacts with sync token: ${user.contactsSyncToken}`);
  }

  let numContacts = 0;
  async function resultsHandler(contactInfos: ContactInfos): Promise<any> {
    numContacts += await processContacts(ctx, contactInfos);
    return true;
  }
  const output = await syncGoogleContacts({
    syncToken: user.contactsSyncToken,
    accessToken: googleAccessToken,
    resultsHandler,
  });

  if (output.syncToken !== user.contactsSyncToken) {
    console.log("New sync token for contacts:", output.syncToken);
    ctx.user = await PRISMA.user.update({
      where: {
        id: user.id,
      },
      data: {
        contactsSyncToken: output.syncToken,
      },
    });
  }

  const duration = moment.duration(moment().diff(startTime));
  const durationString = `${duration.minutes()}m ${duration.seconds()}.${duration.milliseconds()}s`;
  console.log(`Synced ${numContacts} contacts in ${durationString}`);
  return numContacts;
}

async function processContacts(
  ctx: Context,
  contactInfos: ContactInfos
): Promise<number> {
  const { user, googleAccessToken } = ctx;

  const existingContacts = await PRISMA.contact.findMany({
    where: {
      userID: user.id,
      resourceName: {
        in: contactInfos.contacts.map((c) => c.resourceName),
      },
    },
  });

  const insertOperations: ContactInfo[] = [];
  const updateOperations: {
    contactInfo: ContactInfo;
    existingContact: Contact;
  }[] = [];
  contactInfos.contacts.forEach((contactInfo) => {
    const existingContact = existingContacts.find(
      (c) => c.resourceName === contactInfo.resourceName
    );
    if (existingContact) {
      if (
        contactInfo.familyName === existingContact.familyName &&
        contactInfo.givenName === existingContact.givenName &&
        contactInfo.displayName === existingContact.displayName &&
        contactInfo.photoURL === existingContact.photoURL &&
        contactInfo.notes === existingContact.notes &&
        contactInfo.affinity === existingContact.affinity
      ) {
        return; // Record doesn't need to be updated
      }
      updateOperations.push({
        contactInfo: contactInfo,
        existingContact,
      });
    } else {
      insertOperations.push(contactInfo);
    }
  });
  const numToInsert = insertOperations.length;
  const numToUpdate = updateOperations.length;
  const numToDelete = contactInfos.deleted.length;
  const numToSync = numToInsert + numToUpdate + numToDelete;
  console.log(
    `Syncing ${numToSync} contacts: ${numToInsert} inserts, ${numToUpdate} updates, ${numToDelete} deletes`
  );

  const crudOperations: Promise<any>[] = [];
  if (numToDelete > 0) {
    crudOperations.push(
      PRISMA.contact.deleteMany({
        where: {
          userID: user.id,
          resourceName: {
            in: contactInfos.deleted,
          },
        },
      })
    );
  }
  if (numToInsert > 0) {
    crudOperations.push(
      PRISMA.contact.createMany({
        data: insertOperations.map((contactInfo) => {
          return {
            userID: user.id,
            resourceName: contactInfo.resourceName,
            familyName: contactInfo.familyName,
            givenName: contactInfo.givenName,
            displayName: contactInfo.displayName,
            photoURL: contactInfo.photoURL,
            notes: contactInfo.notes,
            affinity: contactInfo.affinity,
          };
        }),
      })
    );
  }
  crudOperations.push(
    ...updateOperations.map(({ contactInfo, existingContact }) => {
      return PRISMA.contact.update({
        where: {
          id: existingContact.id,
        },
        data: {
          familyName: contactInfo.familyName,
          givenName: contactInfo.givenName,
          displayName: contactInfo.displayName,
          photoURL: contactInfo.photoURL,
          notes: contactInfo.notes,
          affinity: contactInfo.affinity,
        },
      });
    })
  );
  await Promise.all<any>(crudOperations);

  const contactPairs: ContactPair[] = [];
  const contacts = await PRISMA.contact.findMany({
    where: {
      userID: user.id,
      resourceName: {
        in: contactInfos.contacts.map((c) => c.resourceName),
      },
    },
  });
  contactInfos.contacts.forEach((contactInfo) => {
    const contact = contacts.find(
      (c) => c.resourceName == contactInfo.resourceName
    )!;
    contactPairs.push({
      contactInfo,
      contact,
    });
  });

  await Promise.all<any>([
    syncPhoneNumbersForContacts({
      user,
      contactPairs,
    }),
    syncEmailAddressesForContacts({
      user,
      contactPairs,
    }),
    syncAddressesForContacts({
      user,
      contactPairs,
    }),
    ...contactPairs.map((contactPair) => {
      return applyEmailAliasFromContactInfo(
        contactPair.contactInfo,
        googleAccessToken
      );
    }),
  ]);

  return numToSync + numToDelete;
}
