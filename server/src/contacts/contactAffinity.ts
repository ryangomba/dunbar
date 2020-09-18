import { Contact, ContactAffinity } from "@prisma/client";
import { google } from "googleapis";
import { Context } from "../auth/context";
import { GOOGLE_API_KEY, PRISMA } from "../config";

export async function updateContactAffinity(
  ctx: Context,
  contactID: string,
  affinity: ContactAffinity
): Promise<Contact> {
  const { googleAccessToken } = ctx;

  const contact = await PRISMA.contact.findUnique({
    where: {
      id: contactID,
    },
  });
  if (!contact) {
    throw new Error("No contact for ID");
  }

  const googleContactResponse = await google.people("v1").people.get({
    auth: GOOGLE_API_KEY,
    oauth_token: googleAccessToken,
    resourceName: contact.resourceName,
    personFields: "userDefined",
  });

  let googleContact = googleContactResponse.data;
  const userDefined =
    googleContact.userDefined?.filter((d) => d.key !== "affinity") || [];
  userDefined.push({
    key: "affinity",
    value: affinity.toString(),
  });
  googleContact = {
    ...googleContact,
    userDefined,
  };

  await google.people("v1").people.updateContact({
    auth: GOOGLE_API_KEY,
    oauth_token: googleAccessToken,
    resourceName: contact.resourceName,
    updatePersonFields: "userDefined",
    requestBody: googleContact,
  });

  return PRISMA.contact.update({
    where: {
      id: contactID,
    },
    data: {
      affinity,
    },
  });
}
