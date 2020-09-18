import {
  AddressType,
  ContactAffinity,
  EmailAddresssType,
  PhoneNumberType,
} from "@prisma/client";
import { google, people_v1 } from "googleapis";
import { GOOGLE_API_KEY } from "../config";
import {
  AddressInfo,
  ContactInfo,
  ContactInfos,
  EmailAddressInfo,
  PhoneNumberInfo,
} from "./contactInfo";

type Input = {
  accessToken: string;
  syncToken: string | null;
  resultsHandler: (contactInfos: ContactInfos) => Promise<any>;
};

type Output = {
  syncToken: string;
};

export async function syncGoogleContacts(input: Input): Promise<Output> {
  let syncToken: string | undefined = input.syncToken || undefined;

  let numContacts = 0;
  let hasMore = true;
  let pageToken: string | undefined;
  while (hasMore) {
    console.log("Fetching new page of contacts");
    let peopleResponse;
    try {
      peopleResponse = await google.people("v1").people.connections.list({
        auth: GOOGLE_API_KEY,
        oauth_token: input.accessToken,
        resourceName: "people/me",
        personFields:
          "addresses,emailAddresses,names,phoneNumbers,photos,biographies,userDefined",
        pageSize: 1000,
        pageToken,
        syncToken,
        requestSyncToken: true,
      });
    } catch (err) {
      let error = err as any; // HACK
      console.error("Error syncing contacts:", error.message);
      if (error.errors[0].message.indexOf("Sync token") === 0) {
        console.log("Running without sync token");
        return syncGoogleContacts({
          ...input,
          syncToken: null,
        });
      }
      break;
    }

    const { connections, nextPageToken, nextSyncToken } = peopleResponse.data;
    const googleContacts = connections || [];

    numContacts += googleContacts.length;
    console.log(
      `Fetched ${googleContacts.length} contacts (${numContacts} total)...`
    );

    const contactInfos: ContactInfos = { contacts: [], deleted: [] };
    for (let person of googleContacts) {
      if (person.metadata?.deleted) {
        if (!person.resourceName) {
          throw new Error("No resource name for deleted person");
        }
        contactInfos.deleted.push(person.resourceName);
      } else {
        let contactInfo = contactInfoForPerson(person);
        if (contactInfo) {
          contactInfos.contacts.push(contactInfo);
        }
      }
    }

    await input.resultsHandler(contactInfos);

    pageToken = nextPageToken || undefined;
    syncToken = nextSyncToken || undefined;
    hasMore = !!pageToken;
  }

  if (!syncToken) {
    throw new Error("Expected sync token at end of Google contacts sync");
  }
  return {
    syncToken,
  };
}

function contactInfoForPerson(
  person: people_v1.Schema$Person
): ContactInfo | null {
  const resourceName = person.resourceName;
  if (!resourceName) {
    throw new Error("No resource name for person");
  }

  const eTag = person.etag;
  if (!eTag) {
    throw new Error("No eTag name for person");
  }

  if (!person.names || person.names.length === 0) {
    // no name, skip!
    return null;
  }
  const name = person.names[0];
  if (!name.displayName) {
    throw new Error("Unsuficient name fields for person");
  }

  const photo = person.photos?.find((p) => true);

  let notes = "";
  if (person.biographies && person.biographies.length > 0) {
    notes = person.biographies[0].value || "";
  }

  let affinity: ContactAffinity = ContactAffinity.UNDEFINED;
  const affinityField = person.userDefined?.find((f) => f.key === "affinity");
  if (affinityField) {
    switch (affinityField.value) {
      case "NEW":
        affinity = ContactAffinity.NEW;
        break;
      case "BEST":
        affinity = ContactAffinity.BEST;
        break;
      case "CLOSE":
        affinity = ContactAffinity.CLOSE;
        break;
      case "SOLID":
        affinity = ContactAffinity.SOLID;
        break;
      case "DISTANT":
        affinity = ContactAffinity.DISTANT;
        break;
      case "KEEP":
        affinity = ContactAffinity.KEEP;
        break;
    }
  }

  const addresses = (person.addresses || []).map((a): AddressInfo => {
    return {
      type: addressTypeForGoogleAddressType(a.type),
    };
  });

  const emailAddresses = (person.emailAddresses || []).map(
    (e): EmailAddressInfo => {
      const value = e.value?.toLowerCase();
      if (!value) {
        throw new Error("Insufficient data for email address");
      }
      return {
        type: emailAddressTypeForGoogleEmailAddressType(e.type),
        value,
      };
    }
  );

  const phoneNumbers = (person.phoneNumbers || []).map((p): PhoneNumberInfo => {
    if (!p.value) {
      throw new Error("Insufficient data for phone number");
    }
    return {
      type: phoneNumberTypeForGooglePhoneNumberType(p.type),
      value: p.value,
    };
  });

  return {
    eTag,
    resourceName,
    familyName: name.familyName || "",
    givenName: name.familyName || "",
    displayName: name.displayName || "",
    photoURL: photo?.url || null,
    notes,
    affinity,
    addresses,
    emailAddresses,
    phoneNumbers,
  };
}

function phoneNumberTypeForGooglePhoneNumberType(
  type?: string | null
): PhoneNumberType {
  switch (type) {
    case "home":
      return PhoneNumberType.HOME;
    case "work":
      return PhoneNumberType.WORK;
    case "mobile":
      return PhoneNumberType.MOBILE;
    case "main":
      return PhoneNumberType.MAIN;
    default:
      return PhoneNumberType.OTHER;
  }
}

function emailAddressTypeForGoogleEmailAddressType(
  type?: string | null
): EmailAddresssType {
  switch (type) {
    case "home":
      return EmailAddresssType.HOME;
    case "work":
      return EmailAddresssType.WORK;
    case "alias":
      return EmailAddresssType.ALIAS;
    default:
      return EmailAddresssType.OTHER;
  }
}

function addressTypeForGoogleAddressType(type?: string | null): AddressType {
  switch (type) {
    case "home":
      return AddressType.HOME;
    case "work":
      return AddressType.WORK;
    default:
      return AddressType.OTHER;
  }
}
