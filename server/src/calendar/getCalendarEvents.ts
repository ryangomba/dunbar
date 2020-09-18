import { CalendarEvent } from "@prisma/client";
import moment from "moment";
import { PRISMA } from "../config";

export async function getRecentCalendarEventsForContact(
  contactID: string
): Promise<CalendarEvent[]> {
  return await PRISMA.calendarEvent.findMany({
    where: {
      start: {
        lt: moment().add(30, "days").toDate(),
      },
      attendees: {
        some: {
          contactID,
        },
      },
    },
    orderBy: {
      start: "desc",
    },
  });
}

export async function getRecentCalendarEventForContact(
  contactID: string
): Promise<CalendarEvent | null> {
  let bestEvent: CalendarEvent | null = null;
  const events = await getRecentCalendarEventsForContact(contactID);
  for (let event of events) {
    if (!bestEvent || moment(event.start).isSameOrAfter(moment())) {
      bestEvent = event;
    }
  }
  return bestEvent;
}
