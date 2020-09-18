import { User } from "@prisma/client";
import { PRISMA } from "../config";
import { ContactPair, EmailAddressInfo, EmailAddressPair } from "./contactInfo";

type EmailAddressInsertInfo = {
  contactID: string;
  emailAddressInfo: EmailAddressInfo;
};

type Input = {
  user: User;
  contactPairs: ContactPair[];
};

export async function syncEmailAddressesForContacts(
  input: Input
): Promise<void> {
  const { user, contactPairs } = input;

  const allEmailAddresses = await PRISMA.emailAddress.findMany({
    where: {
      userID: user.id,
      contactID: {
        in: contactPairs.map((c) => c.contact.id),
      },
    },
  });

  const emailAddressIDsToDelete: string[] = [];
  const emailAddressesToInsert: EmailAddressInsertInfo[] = [];
  const emailAddressesToUpdate: EmailAddressPair[] = [];
  contactPairs.forEach((contactPair) => {
    const { contact, contactInfo } = contactPair;
    const existingEmailAddresses = allEmailAddresses.filter(
      (p) => (p.contactID = contact.id)
    );
    const deletedEmailAddresses = existingEmailAddresses.filter(
      (emailAddress) => {
        return contactInfo.emailAddresses.find(
          (p) => p.value === emailAddress.value
        );
      }
    );
    emailAddressIDsToDelete.push(...deletedEmailAddresses.map((p) => p.id));
    contactInfo.emailAddresses.forEach((emailAddressInfo) => {
      const existingEmailAddress = existingEmailAddresses.find(
        (p) => p.value === emailAddressInfo.value
      );
      if (existingEmailAddress) {
        if (existingEmailAddress.type === emailAddressInfo.type) {
          return; // No changes
        }
        emailAddressesToUpdate.push({
          emailAddress: existingEmailAddress,
          emailAddressInfo,
        });
      } else {
        emailAddressesToInsert.push({
          contactID: contact.id,
          emailAddressInfo,
        });
      }
    });
  });

  await Promise.all<any>([
    PRISMA.emailAddress.deleteMany({
      where: {
        id: {
          in: emailAddressIDsToDelete,
        },
      },
    }),
    await PRISMA.emailAddress.createMany({
      data: emailAddressesToInsert.map((input) => {
        return {
          userID: user.id,
          contactID: input.contactID,
          type: input.emailAddressInfo.type,
          value: input.emailAddressInfo.value,
        };
      }),
    }),
    ...emailAddressesToUpdate.map((emailAddressPair) => {
      return PRISMA.emailAddress.update({
        where: {
          id: emailAddressPair.emailAddress.id,
        },
        data: {
          type: emailAddressPair.emailAddressInfo.type,
        },
      });
    }),
  ]);
}
