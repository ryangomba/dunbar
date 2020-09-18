import { User } from "@prisma/client";
import { ContactPair } from "./contactInfo";

type Input = {
  user: User;
  contactPairs: ContactPair[];
};

export async function syncAddressesForContacts(input: Input): Promise<void> {
  // TODO:
  // Sync addresses.
}
