import { User } from "@prisma/client";
import { oauth2_v2 } from "googleapis";
import { PRISMA } from "../config";
import { GoogleTokenInfo } from "./tokens";

type Input = {
  tokenInfo: GoogleTokenInfo;
  userInfo: oauth2_v2.Schema$Userinfo;
};

export async function getOrCreateUserFromGoogleProfile(
  input: Input
): Promise<User> {
  const { tokenInfo, userInfo } = input;
  const { email, family_name, given_name, name, picture } = userInfo;
  if (!email || !family_name || !given_name || !name) {
    throw new Error("Not enough info to create user");
  }
  const data = {
    emailAddress: email,
    familyName: family_name,
    givenName: given_name,
    displayName: name,
    photoURL: picture,
    googleAccessToken: tokenInfo.accessToken,
    googleAccessTokenExpiresAt: tokenInfo.accessTokenExpiresAt,
    googleRefreshToken: tokenInfo.refreshToken,
    notionDatabaseID: process.env.NOTION_DATABASE_ID, // TODO: let users select instead
  };
  return await PRISMA.user.upsert({
    where: {
      emailAddress: email,
    },
    create: data,
    update: data,
  });
}
