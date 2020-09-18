import { CalendarEvent, Prisma, User } from "@prisma/client";
import moment from "moment";
import { Context } from "../auth/context";
import { PRISMA } from "../config";
import { CalendarEventInfo, CalendarEventInfos } from "./calendarEventInfo";
import { syncCalendarAttendees } from "./syncAttendees";
import { syncGoogleCalendars } from "./syncGoogleCalendars";

export async function syncCalendarsForUser(ctx: Context): Promise<number> {
  const { user } = ctx;

  const startTime = moment();
  console.log(`Syncing calendar events for user ${user.displayName}...`);

  if (!user.calendarEventsSyncToken) {
    console.log("No sync token; clearing calendar event records");
    await PRISMA.calendarEventAttendee.deleteMany({});
    await PRISMA.calendarEvent.deleteMany({});
  } else {
    console.log(
      `Fetching calendar events with sync token: ${user.calendarEventsSyncToken}`
    );
  }

  let numCalendarEvents = 0;
  async function resultsHandler(
    calendarEventInfos: CalendarEventInfos
  ): Promise<any> {
    numCalendarEvents += await processCalendarEvents(user!, calendarEventInfos);
  }
  const output = await syncGoogleCalendars(ctx, {
    syncToken: user.calendarEventsSyncToken,
    resultsHandler,
  });

  let userUpdates: Prisma.UserUpdateInput = {};
  if (output.syncToken !== user.calendarEventsSyncToken) {
    console.log("New sync token for calendar events:", output.syncToken);
    userUpdates.calendarEventsSyncToken = output.syncToken;
  }
  if (output.webhookChannelInfo) {
    console.log(
      "New webhook info for calendar events:",
      output.webhookChannelInfo
    );
    userUpdates.calendarWebhookChannelInfo = output.webhookChannelInfo;
  }
  if (Object.values(userUpdates).length > 0) {
    ctx.user = await PRISMA.user.update({
      where: {
        id: user.id,
      },
      data: userUpdates,
    });
  }

  const duration = moment.duration(moment().diff(startTime));
  const durationString = `${duration.minutes()}m ${duration.seconds()}.${duration.milliseconds()}s`;
  console.log(
    `Synced ${numCalendarEvents} calendar events in ${durationString}`
  );
  return numCalendarEvents;
}

async function processCalendarEvents(
  user: User,
  calendarEventInfos: CalendarEventInfos
): Promise<number> {
  const existingCalendarEvents = await PRISMA.calendarEvent.findMany({
    where: {
      userID: user.id,
      providerID: {
        in: calendarEventInfos.events.map((c) => c.providerID),
      },
    },
  });
  const insertOperations: CalendarEventInfo[] = [];
  const updateOperations: {
    eventInfo: CalendarEventInfo;
    existingEvent: CalendarEvent;
  }[] = [];
  calendarEventInfos.events.forEach((calendarEventInfo) => {
    const existingEvent = existingCalendarEvents.find(
      (c) => c.providerID === calendarEventInfo.providerID
    );
    if (existingEvent) {
      if (
        calendarEventInfo.title === existingEvent.title &&
        calendarEventInfo.description === existingEvent.description &&
        calendarEventInfo.start.getTime() === existingEvent.start.getTime() &&
        calendarEventInfo.end.getTime() === existingEvent.end.getTime()
      ) {
        return; // Record doesn't need to be updated
      }
      updateOperations.push({
        eventInfo: calendarEventInfo,
        existingEvent,
      });
    } else {
      insertOperations.push(calendarEventInfo);
    }
  });
  const numToInsert = insertOperations.length;
  const numToUpdate = updateOperations.length;
  const numToDelete = calendarEventInfos.deleted.length;
  const numToSync = numToInsert + numToUpdate + numToDelete;
  console.log(
    `Syncing ${numToSync} calendar events: ${numToInsert} inserts, ${numToUpdate} updates, ${numToDelete} deletes`
  );

  const crudOperations: Promise<any>[] = [];
  if (numToDelete > 0) {
    crudOperations.push(
      PRISMA.calendarEvent.deleteMany({
        where: {
          userID: user.id,
          providerID: {
            in: calendarEventInfos.deleted,
          },
        },
      })
    );
  }
  if (numToInsert > 0) {
    crudOperations.push(
      PRISMA.calendarEvent.createMany({
        data: insertOperations.map((calendarEventInfo) => {
          return {
            userID: user.id,
            providerID: calendarEventInfo.providerID,
            title: calendarEventInfo.title,
            description: calendarEventInfo.description,
            start: calendarEventInfo.start,
            end: calendarEventInfo.end,
          };
        }),
      })
    );
  }
  crudOperations.push(
    ...updateOperations.map(({ eventInfo, existingEvent }) => {
      return PRISMA.calendarEvent.update({
        where: {
          id: existingEvent.id,
        },
        data: {
          title: eventInfo.title,
          description: eventInfo.description,
          start: eventInfo.start,
          end: eventInfo.end,
        },
      });
    })
  );
  await Promise.all<any>(crudOperations);

  await syncCalendarAttendees({
    user,
    calendarEventInfos,
  });

  return numToSync;
}
