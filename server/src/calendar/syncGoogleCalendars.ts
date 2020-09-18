import { calendar_v3, google } from "googleapis";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import { Context } from "../auth/context";
import { BASE_URI, GOOGLE_API_KEY } from "../config";
import {
  AttendeeInfo,
  CalendarEventInfo,
  CalendarEventInfos,
} from "./calendarEventInfo";

type Input = {
  syncToken: string | null;
  resultsHandler: (calendarEventInfos: CalendarEventInfos) => Promise<any>;
};

export type WebhookChannelInfo = {
  id: string;
  resourceID: string;
  expiresAt: string; // ISO 8601, no fractional seconds
};

type Output = {
  syncToken: string;
  webhookChannelInfo: WebhookChannelInfo | null;
};

export async function syncGoogleCalendars(
  ctx: Context,
  input: Input
): Promise<Output> {
  const { googleAccessToken } = ctx;
  let syncToken: string | undefined = input.syncToken || undefined;

  let numCalendarEvents = 0;
  let hasMore = true;
  let pageToken: string | undefined;
  while (hasMore) {
    console.log("Fetching new page of calendar events");
    let eventsResponse;
    try {
      eventsResponse = await google.calendar("v3").events.list({
        auth: GOOGLE_API_KEY,
        oauth_token: googleAccessToken,
        calendarId: "primary",
        singleEvents: true,
        maxResults: 2500,
        syncToken,
        pageToken,
      });
    } catch (err) {
      let error = err as any; // HACK
      console.error("Error syncing calendar events:", error.message);
      if (error.errors[0].message.indexOf("Sync token") === 0) {
        console.log("Running without sync token");
        return syncGoogleCalendars(ctx, {
          ...input,
          syncToken: null,
        });
      }
      break;
    }

    const { items, nextPageToken, nextSyncToken } = eventsResponse.data;
    const googleCalendarEvents = items || [];

    numCalendarEvents += googleCalendarEvents.length;
    console.log(
      `Fetched ${googleCalendarEvents.length} calendar events (${numCalendarEvents} total)...`
    );

    const calendarEventInfos: CalendarEventInfos = { events: [], deleted: [] };
    for (let googleCalendarEvent of googleCalendarEvents) {
      if (!googleCalendarEvent.id) {
        throw new Error(
          `No id for calendar event: ${JSON.stringify(googleCalendarEvent)}`
        );
      }

      if (googleCalendarEvent.status === "cancelled") {
        calendarEventInfos.deleted.push(googleCalendarEvent.id);
        continue;
      }

      if (!googleCalendarEvent.creator?.self) {
        // Ignore events created by others.
        // No other elegant way to control attendees.
        continue;
      }

      let calendarEventInfo =
        calendarEventInfoForGoogleCalendarEvent(googleCalendarEvent);
      if (calendarEventInfo) {
        calendarEventInfos.events.push(calendarEventInfo);
      }
    }

    await input.resultsHandler(calendarEventInfos);

    pageToken = nextPageToken || undefined;
    syncToken = nextSyncToken || undefined;
    hasMore = !!pageToken;
  }

  if (!syncToken) {
    throw new Error("Expected sync token at end of Google contacts sync");
  }

  const webhookChannelInfo = await subscribeToGoogleCalendarChanges(ctx);

  return { syncToken, webhookChannelInfo };
}

function calendarEventInfoForGoogleCalendarEvent(
  googleCalendarEvent: calendar_v3.Schema$Event
): CalendarEventInfo | null {
  if (
    !googleCalendarEvent.id ||
    !googleCalendarEvent.summary ||
    !googleCalendarEvent.start ||
    !googleCalendarEvent.end
  ) {
    throw new Error(
      `Insufficient data for calendar event: ${JSON.stringify(
        googleCalendarEvent
      )}`
    );
  }

  let start: Date;
  if (googleCalendarEvent.start.dateTime) {
    start = new Date(googleCalendarEvent.start.dateTime);
  } else if (googleCalendarEvent.start.date) {
    start = new Date(googleCalendarEvent.start.date);
  } else {
    throw new Error(
      `Could not determine start time for calendar event: ${JSON.stringify(
        googleCalendarEvent
      )}`
    );
  }

  let end: Date;
  if (googleCalendarEvent.end.dateTime) {
    end = new Date(googleCalendarEvent.end.dateTime);
  } else if (googleCalendarEvent.end.date) {
    end = new Date(googleCalendarEvent.end.date);
  } else {
    throw new Error(
      `Could not determine end time for calendar event: ${JSON.stringify(
        googleCalendarEvent
      )}`
    );
  }

  const attendees = (googleCalendarEvent.attendees || [])
    .filter((googleAttendee) => {
      return googleAttendee.responseStatus !== "declined";
    })
    .map((googleAttendee): AttendeeInfo => {
      if (!googleAttendee.email) {
        throw new Error(
          "Expected email address for google calendar event attendee"
        );
      }
      return {
        email: googleAttendee.email,
      };
    });

  return {
    providerID: googleCalendarEvent.id,
    title: googleCalendarEvent.summary,
    description: googleCalendarEvent.description || "",
    start,
    end,
    attendees,
  };
}

async function subscribeToGoogleCalendarChanges(
  ctx: Context
): Promise<WebhookChannelInfo | null> {
  const address = `${BASE_URI}/webhooks/google-calendar`;
  if (!address?.startsWith("https")) {
    return null; // Subscriptions must be https
  }

  const { user, googleAccessToken } = ctx;

  const channelInfoJSON = user.calendarWebhookChannelInfo;
  if (channelInfoJSON) {
    const channelInfo = channelInfoJSON as unknown as WebhookChannelInfo;
    const soon = moment().add(1, "day"); // Re-subscribe if we're about to expire within a day
    if (moment(channelInfo.expiresAt).isAfter(soon)) {
      return null; // Channel is in good shape
    }
    try {
      console.log(
        "Unsubscribing from Google calendar webhooks channel",
        channelInfo
      );
      await google.calendar("v3").channels.stop({
        auth: GOOGLE_API_KEY,
        oauth_token: googleAccessToken,
        requestBody: {
          id: channelInfo.id,
          resourceId: channelInfo.resourceID,
        },
      });
    } catch (e) {
      // Catch error and proceed, since the channel might just not exist anymore.
      console.error(
        "Could not unsubscribe from Google calendar webhooks channel",
        e
      );
    }
  }

  console.log(`Registering for Google calendar webhooks channel at ${address}`);
  const watchResponse = await google.calendar("v3").events.watch({
    auth: GOOGLE_API_KEY,
    oauth_token: googleAccessToken,
    calendarId: "primary",
    requestBody: {
      id: uuidv4(),
      token: user.id,
      type: "web_hook",
      address,
      // params: {
      //   ttl: `${604800}`,
      // },
    },
  });
  const channelInfo = watchResponse.data;
  if (!channelInfo.id || !channelInfo.resourceId || !channelInfo.expiration) {
    throw new Error(`Insufficient channel info: ${channelInfo}`);
  }
  const expiresAtDate = new Date(parseInt(channelInfo.expiration));
  const expiresAt = moment(expiresAtDate).format();
  return {
    id: channelInfo.id,
    resourceID: channelInfo.resourceId,
    expiresAt,
  };
}

export type WebhookInfo = {
  channelID: string;
  resourceID: string;
  resourceState: string;
};

export async function handleGoogleCalendarWebhook(
  ctx: Context,
  webhookInfo: WebhookInfo
): Promise<boolean> {
  console.log("Received Google Calendar webhook", webhookInfo);

  const { user, googleAccessToken } = ctx;
  const { channelID, resourceID, resourceState } = webhookInfo;

  // Make sure it's the matching channel
  let savedChannelID;
  const channelInfoJSON = user.calendarWebhookChannelInfo;
  if (channelInfoJSON) {
    const channelInfo = channelInfoJSON as unknown as WebhookChannelInfo;
    savedChannelID = channelInfo.id;
  }
  if (savedChannelID !== channelID) {
    // Delete the webhook and ignore
    console.log("Unsubscribing from Google calendar webhooks channel", {
      channelID,
      resourceID,
    });
    await google.calendar("v3").channels.stop({
      auth: GOOGLE_API_KEY,
      oauth_token: googleAccessToken,
      requestBody: {
        id: channelID,
        resourceId: resourceID,
      },
    });
    return false;
  }

  if (resourceState === "sync") {
    // Just a notification confirming subscription; nothing to do
    return false;
  }

  return true; // Should sync
}
