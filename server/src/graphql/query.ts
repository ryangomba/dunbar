import { Contact, User } from "@prisma/client";
import { nonNull, objectType, stringArg } from "nexus";
import { PRISMA } from "../config";

export const Query = objectType({
  name: "Query",
  definition(t) {
    t.field("viewer", {
      type: "User",
      resolve: (_, args, { user }): User | null => {
        return user;
      },
    });
    t.field("contact", {
      type: "Contact",
      args: {
        id: nonNull(stringArg()),
      },
      resolve: (_, { id }, ctx): Promise<Contact | null> => {
        return getContactWithID(id);
      },
    });
  },
});

async function getContactWithID(id: string): Promise<Contact | null> {
  return PRISMA.contact.findUnique({
    where: {
      id,
    },
  });
}
