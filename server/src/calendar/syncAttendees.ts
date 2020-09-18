import { CalendarEventAttendee, EmailAddress, User } from ".prisma/client";
import { PRISMA } from "../config";
import { CalendarEventInfos } from "./calendarEventInfo";

type Input = {
  user: User;
  calendarEventInfos: CalendarEventInfos;
};

export async function syncCalendarAttendees(input: Input): Promise<void> {
  const { user, calendarEventInfos } = input;

  const calendarEvents = await PRISMA.calendarEvent.findMany({
    where: {
      userID: user.id,
      providerID: {
        in: calendarEventInfos.events.map((c) => c.providerID),
      },
    },
  });
  const attendeeEmails = new Set<string>();
  calendarEventInfos.events.forEach((calendarEventInfo) => {
    calendarEventInfo.attendees.forEach((attendeeInfo) => {
      attendeeEmails.add(attendeeInfo.email);
    });
  });
  const [allExistingAttendees, allEmailAddresses] = await Promise.all<
    CalendarEventAttendee[],
    EmailAddress[]
  >([
    PRISMA.calendarEventAttendee.findMany({
      where: {
        userID: user.id,
        calendarEventID: {
          in: calendarEvents.map((c) => c.id),
        },
      },
    }),
    PRISMA.emailAddress.findMany({
      where: {
        userID: user.id,
        value: {
          in: Array.from(attendeeEmails.values()),
        },
      },
    }),
  ]);

  type AttendeeInsertInfo = { calendarEventID: string; contactID: string };
  const allDeletedAttendeeIDs: string[] = [];
  const allAttendeeInserts: AttendeeInsertInfo[] = [];
  calendarEventInfos.events.forEach((calendarEventInfo) => {
    const calendarEvent = calendarEvents.find(
      (c) => c.providerID === calendarEventInfo.providerID
    )!;
    const attendeeEmails = new Set(
      calendarEventInfo.attendees.map((a) => a.email)
    );
    const existingAttendees = allExistingAttendees.filter(
      (a) => a.calendarEventID === calendarEvent.id
    );
    const matchedEmailAddresses = allEmailAddresses.filter((e) =>
      attendeeEmails.has(e.value)
    );
    const deletedAttendeeIDs = existingAttendees
      .filter((attendee) => {
        const matchedEmailAddress = matchedEmailAddresses.find(
          (e) => e.contactID === attendee.contactID
        );
        return !matchedEmailAddress;
      })
      .map((a) => a.id);
    allDeletedAttendeeIDs.push(...deletedAttendeeIDs);
    const newEmailAddresses = matchedEmailAddresses.filter((emailAddress) => {
      const existingAttendee = existingAttendees.find(
        (a) => a.contactID == emailAddress.contactID
      );
      return !existingAttendee;
    });
    const attendeeInserts = newEmailAddresses.map(
      (emailAddress): AttendeeInsertInfo => {
        return {
          calendarEventID: calendarEvent.id,
          contactID: emailAddress.contactID,
        };
      }
    );
    allAttendeeInserts.push(...attendeeInserts);
  });

  const numToInsert = allAttendeeInserts.length;
  const numToDelete = allDeletedAttendeeIDs.length;
  const numToSync = numToInsert + numToDelete;
  console.log(
    `Syncing ${numToSync} attendees: ${numToInsert} inserts, ${numToDelete} deletes`
  );
  await Promise.all([
    PRISMA.calendarEventAttendee.deleteMany({
      where: {
        id: {
          in: allDeletedAttendeeIDs,
        },
      },
    }),
    PRISMA.calendarEventAttendee.createMany({
      data: allAttendeeInserts.map((attendeeInsert) => {
        return {
          userID: user.id,
          calendarEventID: attendeeInsert.calendarEventID,
          contactID: attendeeInsert.contactID,
        };
      }),
      skipDuplicates: true,
    }),
  ]);
}
