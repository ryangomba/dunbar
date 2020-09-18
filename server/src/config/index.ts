import { PrismaClient } from "@prisma/client";
import moment from "moment";

export const BASE_URI = process.env.BASE_URI;
export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

export const PRISMA = new PrismaClient();
PRISMA.$use(async (params, next) => {
  // 100ms artificial delay in development to mimic DB latency in production
  if (process.env.TS_NODE_DEV === "true") {
    await new Promise((r) => setTimeout(r, 100));
  }
  const startTime = moment();
  // Perform query
  const result = await next(params);
  // Calculate time spent
  if (process.env.DB_LOGGING_ENABLED) {
    const duration = moment.duration(moment().diff(startTime));
    const durationString = `${duration.asMilliseconds()}ms`;
    console.log(
      `Query ${params.model}.${params.action} took ${durationString}`
    );
  }
  // Return results
  return result;
});
