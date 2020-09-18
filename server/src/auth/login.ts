import { User } from "@prisma/client";
import { google } from "googleapis";
import { GOOGLE_API_KEY } from "../config";
import { getTokenInfoFromGoogleAuthCode } from "./tokens";
import { getOrCreateUserFromGoogleProfile } from "./user";

export async function login(
  googleAuthCode: string
): Promise<{ user: User; authToken: string }> {
  const tokenInfo = await getTokenInfoFromGoogleAuthCode(googleAuthCode);
  const userInfoResponse = await google.oauth2("v2").userinfo.get({
    auth: GOOGLE_API_KEY,
    oauth_token: tokenInfo.accessToken,
  });
  const user = await getOrCreateUserFromGoogleProfile({
    tokenInfo,
    userInfo: userInfoResponse.data,
  });
  const authToken = user.id; // TODO: generate real JWT
  return {
    user,
    authToken,
  };
}
