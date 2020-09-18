import { CalendarEvent, Contact, ContactAffinity } from "@prisma/client";
import moment from "moment";
import { nonNull, objectType } from "nexus";
import { getRecentCalendarEventsForContact } from "../../calendar/getCalendarEvents";
import { PRISMA } from "../../config";

export const ContactNode = objectType({
  name: "Contact",
  sourceType: {
    module: "@prisma/client",
    export: "Contact",
  },
  definition(t) {
    t.field("id", {
      type: nonNull("String"),
      resolve(c: Contact): string {
        return c.id;
      },
    });
    t.field("displayName", {
      type: nonNull("String"),
      resolve(c: Contact): string {
        return c.displayName;
      },
    });
    t.field("photoURL", {
      type: nonNull("String"),
      resolve(c: Contact): string {
        return c.photoURL || "";
      },
    });
    t.field("displayName", {
      type: nonNull("String"),
      resolve(c: Contact): string {
        return c.displayName;
      },
    });
    t.field("percentPastDue", {
      type: nonNull("Int"),
      resolve(c: Contact): Promise<number> {
        return getPercentPastDueForContact(c);
      },
    });
    t.list.field("calendarEvents", {
      type: "CalendarEvent",
      resolve: (c: Contact): Promise<CalendarEvent[]> => {
        return getRecentCalendarEventsForContact(c.id);
      },
    });
  },
});

async function getPercentPastDueForContact(contact: Contact): Promise<number> {
  const contactEvery = contactFrequencyForAffinity(contact.affinity);
  const mostRecentEvent = (
    await PRISMA.calendarEvent.findMany({
      where: {
        start: {
          lt: moment().add(30, "days").toDate(),
        },
        attendees: {
          some: {
            contactID: contact.id,
          },
        },
      },
      orderBy: {
        start: "desc",
      },
      take: 1,
    })
  )[0];
  const daysSince = mostRecentEvent
    ? moment().diff(moment(mostRecentEvent.start), "days")
    : 1000;
  const percentPastDue =
    (Math.round(daysSince - contactEvery) / contactEvery) * 100;
  return Math.round(percentPastDue);
}

function contactFrequencyForAffinity(affinity: ContactAffinity): number {
  switch (affinity) {
    case ContactAffinity.NEW:
      return 14; // ?
    case ContactAffinity.BEST:
      return 7;
    case ContactAffinity.CLOSE:
      return 14;
    case ContactAffinity.SOLID:
      return 30;
    case ContactAffinity.DISTANT:
      return 60;
    case ContactAffinity.KEEP:
      return 120;
    default:
      return 1000;
  }
}
