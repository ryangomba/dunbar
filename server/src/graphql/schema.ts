import { makeSchema } from "nexus";
import { CalendarEventNode } from "./graph/calendarEventNode";
import { ContactNode } from "./graph/contactNode";
import { UserNode } from "./graph/userNode";
import { Mutation } from "./mutation";
import { Query } from "./query";

export const schema = makeSchema({
  types: [Query, Mutation, UserNode, ContactNode, CalendarEventNode],
  outputs: {
    schema: __dirname + "/generated/schema.graphql",
    typegen: __dirname + "/generated/schema.d.ts",
  },
});
