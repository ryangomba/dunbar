import { ContactAffinity } from "@prisma/client";
import { booleanArg, nonNull, objectType, stringArg } from "nexus";
import { login } from "../auth/login";
import { syncUserData } from "../auth/syncUserData";
import { updateContactAffinity } from "../contacts/contactAffinity";

export const Mutation = objectType({
  name: "Mutation",
  definition(t) {
    t.field("login", {
      type: "String",
      args: {
        googleAuthCode: nonNull(stringArg()),
      },
      resolve: async (_, { googleAuthCode }, ctx) => {
        const response = await login(googleAuthCode);
        return response.authToken;
      },
    });
    t.field("sync", {
      type: "String",
      args: {
        clear: booleanArg(),
        contacts: booleanArg(),
        calendars: booleanArg(),
        notion: booleanArg(),
      },
      resolve: (_, { clear, contacts, calendars, notion }, ctx) => {
        return syncUserData(ctx, {
          clear: clear || false,
          contacts: contacts || false,
          calendars: calendars || false,
          notion: notion || false,
        });
      },
    });
    t.field("updateContactAffinity", {
      type: "Contact",
      args: {
        contactID: nonNull(stringArg()),
        affinity: nonNull(stringArg()),
      },
      resolve: (_, { contactID, affinity }, ctx) => {
        return updateContactAffinity(
          ctx,
          contactID,
          affinity as ContactAffinity
        );
      },
    });
  },
});
