import { Contact } from "@prisma/client";
import { PRISMA } from "../config";

export async function getContactsForUserID(userID: string): Promise<Contact[]> {
  return PRISMA.contact.findMany({
    where: {
      userID: userID,
    },
    orderBy: [
      {
        affinity: "asc",
      },
    ],
  });
}
