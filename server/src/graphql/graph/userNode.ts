import { Contact, User } from ".prisma/client";
import { nonNull, objectType } from "nexus";
import { getContactsForUserID } from "../../contacts/getContacts";

export const UserNode = objectType({
  name: "User",
  sourceType: {
    module: "@prisma/client",
    export: "User",
  },
  definition(t) {
    t.field("id", {
      type: nonNull("String"),
      resolve(c: User): string {
        return c.id;
      },
    });
    t.field("displayName", {
      type: nonNull("String"),
      resolve(c: User): string {
        return c.displayName;
      },
    });
    t.list.field("contacts", {
      type: "Contact",
      resolve: (user: User): Promise<Contact[]> => {
        return getContactsForUserID(user.id);
      },
    });
  },
});
