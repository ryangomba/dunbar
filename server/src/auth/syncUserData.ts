import { Context } from "../auth/context";
import { syncCalendarsForUser } from "../calendar/syncCalendars";
import { PRISMA } from "../config";
import { syncContactsForUser } from "../contacts/syncContacts";
import { syncNotionForUser } from "../notion/syncNotion";

// HACK: something resembling a serial, de-duping queue for now
// Based on https://github.com/jsoendermann/semaphore-async-await
// Note: per-instance, not distributed, cross-user
class TaskQueue {
  private permits: number;
  private promiseResolverQueue: Array<(v: boolean) => void> = [];
  constructor(permits: number) {
    this.permits = permits;
  }
  public async wait(): Promise<boolean> {
    if (this.permits > 0) {
      this.permits -= 1;
      return Promise.resolve(true);
    }
    return new Promise<boolean>((resolver) =>
      this.promiseResolverQueue.push(resolver)
    );
  }
  public signal(): void {
    this.permits += 1;
    if (this.permits > 1 && this.promiseResolverQueue.length > 0) {
      console.warn(
        "Semaphore.permits should never be > 0 when there is someone waiting."
      );
    } else if (this.permits === 1 && this.promiseResolverQueue.length > 0) {
      this.permits -= 1;
      const nextResolver = this.promiseResolverQueue.shift();
      if (nextResolver) {
        nextResolver(true);
      }
    }
  }
  private enqueuedTaskIDs = new Set<string>([]);
  public async execute<T>(
    taskID: string,
    func: () => T | PromiseLike<T>
  ): Promise<T | null> {
    if (this.enqueuedTaskIDs.has(taskID)) {
      return null;
    }
    this.enqueuedTaskIDs.add(taskID);
    await this.wait();
    try {
      return await func();
    } finally {
      this.enqueuedTaskIDs.delete(taskID);
      this.signal();
    }
  }
}

const syncQueue = new TaskQueue(1);

type Input = {
  clear?: boolean;
  contacts?: boolean;
  calendars?: boolean;
  notion?: boolean;
};

export async function syncUserData(
  ctx: Context,
  input: Input
): Promise<string> {
  const taskID = `sync-${ctx.user.id}:${JSON.stringify(input)}`;
  const result = await syncQueue.execute(taskID, async () =>
    doSyncUserData(ctx, input)
  );
  if (result === null) {
    console.log(
      "Skipping user sync because a matching sync operation is already in the queue"
    );
    return "SKIPPED";
  }
  return "OK";
}

async function doSyncUserData(ctx: Context, input: Input): Promise<void> {
  if (input.clear) {
    ctx.user = await PRISMA.user.update({
      where: {
        id: ctx.user.id,
      },
      data: {
        contactsSyncToken: null,
        calendarEventsSyncToken: null,
      },
    });
  }
  input.contacts && (await syncContactsForUser(ctx));
  input.calendars && (await syncCalendarsForUser(ctx));
  input.notion && (await syncNotionForUser(ctx));
}
