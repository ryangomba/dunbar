import { User } from "@prisma/client";
import { PRISMA } from "../config";
import { ContactPair, PhoneNumberInfo, PhoneNumberPair } from "./contactInfo";

type PhoneNumberInsertInfo = {
  contactID: string;
  phoneNumberInfo: PhoneNumberInfo;
};

type Input = {
  user: User;
  contactPairs: ContactPair[];
};

export async function syncPhoneNumbersForContacts(input: Input): Promise<void> {
  const { user, contactPairs } = input;

  const allPhoneNumbers = await PRISMA.phoneNumber.findMany({
    where: {
      userID: user.id,
      contactID: {
        in: contactPairs.map((c) => c.contact.id),
      },
    },
  });

  const phoneNumberIDsToDelete: string[] = [];
  const phoneNumbersToInsert: PhoneNumberInsertInfo[] = [];
  const phoneNumbersToUpdate: PhoneNumberPair[] = [];
  contactPairs.forEach((contactPair) => {
    const { contact, contactInfo } = contactPair;
    const existingPhoneNumbers = allPhoneNumbers.filter(
      (p) => (p.contactID = contact.id)
    );
    const deletedPhoneNumbers = existingPhoneNumbers.filter((phoneNumber) => {
      return contactInfo.phoneNumbers.find(
        (p) => p.value === phoneNumber.value
      );
    });
    phoneNumberIDsToDelete.push(...deletedPhoneNumbers.map((p) => p.id));
    contactInfo.phoneNumbers.forEach((phoneNumberInfo) => {
      const existingPhoneNumber = existingPhoneNumbers.find(
        (p) => p.value === phoneNumberInfo.value
      );
      if (existingPhoneNumber) {
        if (existingPhoneNumber.type === phoneNumberInfo.type) {
          return; // No changes
        }
        phoneNumbersToUpdate.push({
          phoneNumber: existingPhoneNumber,
          phoneNumberInfo,
        });
      } else {
        phoneNumbersToInsert.push({
          contactID: contact.id,
          phoneNumberInfo,
        });
      }
    });
  });

  await Promise.all<any>([
    PRISMA.phoneNumber.deleteMany({
      where: {
        id: {
          in: phoneNumberIDsToDelete,
        },
      },
    }),
    await PRISMA.phoneNumber.createMany({
      data: phoneNumbersToInsert.map((input) => {
        return {
          userID: user.id,
          contactID: input.contactID,
          type: input.phoneNumberInfo.type,
          value: input.phoneNumberInfo.value,
        };
      }),
    }),
    ...phoneNumbersToUpdate.map((phoneNumberPair) => {
      return PRISMA.phoneNumber.update({
        where: {
          id: phoneNumberPair.phoneNumber.id,
        },
        data: {
          type: phoneNumberPair.phoneNumberInfo.type,
        },
      });
    }),
  ]);
}
