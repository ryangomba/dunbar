import {
  AddressType,
  ContactAffinity,
  EmailAddress,
  EmailAddresssType,
  PhoneNumberType,
} from ".prisma/client";
import { Contact, PhoneNumber } from "@prisma/client";

export type AddressInfo = {
  type: AddressType;
};

export type EmailAddressInfo = {
  type: EmailAddresssType;
  value: string;
};

export type EmailAddressPair = {
  emailAddressInfo: EmailAddressInfo;
  emailAddress: EmailAddress;
};

export type PhoneNumberInfo = {
  type: PhoneNumberType;
  value: string;
};

export type PhoneNumberPair = {
  phoneNumberInfo: PhoneNumberInfo;
  phoneNumber: PhoneNumber;
};

export type ContactInfo = {
  eTag: string;
  resourceName: string;
  familyName: string;
  givenName: string;
  displayName: string;
  photoURL: string | null;
  notes: string;
  affinity: ContactAffinity;
  addresses: AddressInfo[];
  emailAddresses: EmailAddressInfo[];
  phoneNumbers: PhoneNumberInfo[];
};

export type ContactInfos = {
  contacts: ContactInfo[];
  deleted: string[];
};

export type ContactPair = {
  contactInfo: ContactInfo;
  contact: Contact;
};
