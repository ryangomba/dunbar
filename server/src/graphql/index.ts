import { ApolloServer } from "apollo-server-express";
import { newContextForUserIDRequest } from "../auth/context";
import { schema } from "./schema";

export const apolloServer = new ApolloServer({
  schema,
  context: async ({ req }) => {
    const authToken = req.headers.authorization;
    const userID = authToken; // TODO: unwrap real JWT

    let ctx;
    if (userID) {
      try {
        ctx = await newContextForUserIDRequest(userID);
      } catch (e) {
        console.error("Error creating user request context", e);
      }
    }

    return ctx || {};
  },
  formatError: (error) => {
    console.error(error);
    return error;
  },
});
