import cors from "cors";
import { config } from "dotenv";
import express from "express";
import { createServer } from "http";
import morgan from "morgan";
import { newContextForUserIDRequest } from "./auth/context";
import { syncUserData } from "./auth/syncUserData";
import { handleGoogleCalendarWebhook } from "./calendar/syncGoogleCalendars";
import { apolloServer } from "./graphql";

config();

async function startApolloServer() {
  const app = express();
  app.use(cors());
  app.use(morgan("tiny"));

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: "/graphql" });

  app.post("/webhooks/google-calendar", async function (req, res) {
    try {
      const channelID = req.get("X-Goog-Channel-ID")!;
      const resourceID = req.get("X-Goog-Resource-ID")!;
      const resourceState = req.get("X-Goog-Resource-State")!;
      const userID =
        req.get("X-Goog-Channel-Token") ||
        "e06259e2-eccd-4ddd-88df-39670aa2cbbd"; // TEMP HACK
      const ctx = await newContextForUserIDRequest(userID);
      const shouldSync = await handleGoogleCalendarWebhook(ctx, {
        channelID,
        resourceID,
        resourceState,
      });
      if (shouldSync) {
        await syncUserData(ctx, {
          contacts: true, // TODO: use contact-specific webook or cron
          calendars: true,
          notion: true,
        });
      }
      res.sendStatus(200);
    } catch (e) {
      console.error("Error handling Google calendar webhook", e);
      res.sendStatus(500);
    }
  });

  const port = process.env.PORT;
  const httpServer = createServer(app);
  httpServer.listen({ port }, () => {
    console.log(`🚀 Server is now running on port ${port}`);
  });
}

startApolloServer();
