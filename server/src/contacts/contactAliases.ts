import { EmailAddresssType } from ".prisma/client";
import { google } from "googleapis";
import { GOOGLE_API_KEY } from "../config";
import { ContactInfo } from "./contactInfo";

export async function applyEmailAliasFromContactInfo(
  contactInfo: ContactInfo,
  googleAccessToken: string
): Promise<ContactInfo> {
  const personID = contactInfo.resourceName.split("/").pop();
  const personName = contactInfo.displayName;
  const aliasEmailAddress = `${personID}@ryangomba.com`;

  const hasAlias = contactInfo.emailAddresses.find(
    (e) => e.value === aliasEmailAddress
  );
  if (hasAlias) {
    // console.log(`${personName}: already has alias`);
    return contactInfo;
  }

  console.log(`Updating alias for ${personName}`);
  const standardEmailAddresses = contactInfo.emailAddresses.filter((e) => {
    return e.type !== EmailAddresssType.ALIAS;
  });
  contactInfo.emailAddresses = [
    ...standardEmailAddresses,
    {
      type: EmailAddresssType.ALIAS,
      value: aliasEmailAddress,
    },
  ];

  await google.people("v1").people.updateContact({
    auth: GOOGLE_API_KEY,
    oauth_token: googleAccessToken,
    resourceName: contactInfo.resourceName,
    updatePersonFields: "emailAddresses",
    requestBody: {
      resourceName: contactInfo.resourceName,
      etag: contactInfo.eTag,
      emailAddresses: contactInfo.emailAddresses,
    },
  });

  return contactInfo;
}
