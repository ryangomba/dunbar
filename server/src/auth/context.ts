import { User } from ".prisma/client";
import { v4 as uuidv4 } from "uuid";
import { PRISMA } from "../config";
import { refreshUserGoogleTokensIfNecessary } from "./tokens";

export type Context = {
  requestID: string;
  user: User;
  googleAccessToken: string;
};

export async function newContextForUserIDRequest(
  userID: string
): Promise<Context> {
  let user = await PRISMA.user.findUnique({ where: { id: userID } });
  if (!user) {
    throw new Error("No user for ID");
  }
  user = await refreshUserGoogleTokensIfNecessary(user);
  return {
    requestID: uuidv4(),
    user,
    googleAccessToken: user.googleAccessToken,
  };
}
