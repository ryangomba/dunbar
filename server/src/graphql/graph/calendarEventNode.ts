import { CalendarEvent } from "@prisma/client";
import { nonNull, objectType } from "nexus";

export const CalendarEventNode = objectType({
  name: "CalendarEvent",
  sourceType: {
    module: "@prisma/client",
    export: "CalendarEvent",
  },
  definition(t) {
    t.field("id", {
      type: nonNull("String"),
      resolve(c: CalendarEvent): string {
        return c.id;
      },
    });
    t.field("title", {
      type: nonNull("String"),
      resolve(c: CalendarEvent): string {
        return c.title;
      },
    });
    t.field("start", {
      type: nonNull("String"),
      resolve(c: CalendarEvent): string {
        return c.start.toString();
      },
    });
  },
});
