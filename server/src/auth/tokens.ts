import { User } from "@prisma/client";
import { Credentials } from "google-auth-library";
import { google } from "googleapis";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  PRISMA,
} from "../config";

export type GoogleTokenInfo = {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
};

function newGoogleAuthClient() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

function tokenInfoFromCredentials(credentials: Credentials): GoogleTokenInfo {
  const { access_token, expiry_date, refresh_token } = credentials;
  if (!access_token || !expiry_date || !refresh_token) {
    throw new Error(`Insufficient token data: ${JSON.stringify(credentials)}`);
  }
  return {
    accessToken: access_token,
    accessTokenExpiresAt: new Date(expiry_date),
    refreshToken: refresh_token,
  };
}

export async function getTokenInfoFromGoogleAuthCode(
  googleAuthCode: string
): Promise<GoogleTokenInfo> {
  const client = newGoogleAuthClient();
  const tokenResponse = await client.getToken(googleAuthCode);
  return tokenInfoFromCredentials(tokenResponse.tokens);
}

export async function refreshUserGoogleTokensIfNecessary(
  user: User
): Promise<User> {
  const client = newGoogleAuthClient();
  client.setCredentials({
    access_token: user.googleAccessToken,
    expiry_date: user.googleAccessTokenExpiresAt.getTime(),
    refresh_token: user.googleRefreshToken,
  });
  await client.getAccessToken();
  const newTokenInfo = tokenInfoFromCredentials(client.credentials);
  if (newTokenInfo.accessToken === user.googleAccessToken) {
    return user;
  }
  console.log("Received new Google access token for user; saving");
  return PRISMA.user.update({
    where: {
      id: user.id,
    },
    data: {
      googleAccessToken: newTokenInfo.accessToken,
      googleAccessTokenExpiresAt: newTokenInfo.accessTokenExpiresAt,
      googleRefreshToken: newTokenInfo.refreshToken,
    },
  });
}
