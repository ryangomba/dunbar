import { Contact } from ".prisma/client";
import axios from "axios";
import moment from "moment";
import { Context } from "../auth/context";
import { getRecentCalendarEventForContact } from "../calendar/getCalendarEvents";
import { getContactsForUserID } from "../contacts/getContacts";

const NOTION_BASE_URL = `https://api.notion.com/v1`;
const NOTION_TOKEN = process.env.NOTION_TOKEN;

export async function syncNotionForUser(ctx: Context): Promise<void> {
  const { user } = ctx;
  const { notionDatabaseID } = user;
  if (!notionDatabaseID) {
    console.log("No Notion database ID specified for user");
    return;
  }

  const startTime = moment();
  console.log(`Syncing Notion database for user ${user.displayName}...`);

  // Set up headers
  const headers = {
    Authorization: `Bearer ${NOTION_TOKEN}`,
    "Content-Type": "application/json",
    "Notion-Version": "2021-05-13",
  };

  // Get database records
  const existingPages = [];
  let response;
  while (!response || response.data.has_more) {
    console.log("Fetching new batch of Notion pages");
    try {
      response = await axios.request({
        method: "post",
        url: `${NOTION_BASE_URL}/databases/${notionDatabaseID}/query`,
        headers,
        data: {
          start_cursor: response && response.data.next_cursor,
          page_size: 100,
        },
      });
    } catch (err) {
      let error = err as Error; // HACK
      console.error("Error syncing Notion:", error.message, error);
      return;
    }
    // console.log(JSON.stringify(response.data));
    const pages = response.data.results;
    existingPages.push(...pages);
  }

  console.log(`Fetched ${existingPages.length} existing pages`);

  function getContactIDForPage(page: any): string | null {
    return page.properties["Contact ID"].rich_text[0]?.plain_text;
  }
  function getNameForPage(page: any): string | null {
    return page.properties["Name"].title[0]?.plain_text;
  }
  function getDateForPage(page: any): string | null {
    return page.properties["Last/next time spent"]?.date?.start;
  }
  function getEventNameForPage(page: any): string | null {
    return page.properties["Last/next event"].rich_text[0]?.plain_text;
  }

  // Arrange by contactID
  const pagesByContactID: { [key: string]: any } = {};
  existingPages.forEach((page) => {
    const contactID = getContactIDForPage(page);
    if (contactID) {
      pagesByContactID[contactID] = page;
    }
  });

  // Arrange by name
  const pagesByName: { [key: string]: any } = {};
  existingPages.forEach((page) => {
    const name = getNameForPage(page);
    if (name) {
      pagesByName[name] = page;
    }
  });

  // Get all contacts
  const contacts = await getContactsForUserID(user.id);

  // Filter to only look at ones with existing notion pages
  type ContactPage = {
    contact: Contact;
    lookupID: string;
    page: any;
  };
  const contactPages: ContactPage[] = [];
  contacts.forEach((contact) => {
    const lookupID = contact.resourceName.split("/").pop();
    if (!lookupID) {
      throw new Error(`No resource name for person: ${contact.displayName}`);
    }
    let existingPage = pagesByContactID[lookupID];
    if (!existingPage) {
      existingPage = pagesByName[contact.displayName];
    }
    if (existingPage) {
      contactPages.push({
        page: existingPage,
        lookupID,
        contact,
      });
    }
  });

  // Get most recent events
  const latestEvents = await Promise.all(
    contactPages.map((contactPage) => {
      return getRecentCalendarEventForContact(contactPage.contact.id);
    })
  );

  // Create or update database rows
  type NotionPageUpdate = {
    pageID: string;
    properties: { [key: string]: any };
  };
  const notionPageUpdates: NotionPageUpdate[] = [];
  let numPagesUpdated = 0;
  contactPages.forEach((contactPage, i) => {
    const { contact, lookupID, page } = contactPage;

    const contactName = contact.displayName;

    let eventName, eventDate;
    const latestEvent = latestEvents[i];
    if (latestEvent) {
      eventName = latestEvent.title;
      eventDate = moment(latestEvent.end).format("YYYY-MM-DD");
    }

    const existingContactID = getContactIDForPage(page);
    const existingContactName = getNameForPage(page);
    const existingEventDate = getDateForPage(page);
    const existingEventName = getEventNameForPage(page);

    if (
      existingContactID === lookupID &&
      existingContactName === contactName &&
      existingEventDate === eventDate &&
      existingEventName === eventName
    ) {
      // No updates, skipping
      return;
    }

    console.log(`Preparing page update for ${contact.displayName}`);
    numPagesUpdated += 1;

    const properties: { [key: string]: any } = {
      Name: {
        title: [
          {
            text: {
              content: contactName,
            },
          },
        ],
      },
      "Contact ID": {
        rich_text: [
          {
            text: {
              content: lookupID,
            },
          },
        ],
      },
    };
    if (latestEvent) {
      properties["Last/next time spent"] = {
        date: {
          start: eventDate,
        },
      };
      properties["Last/next event"] = {
        rich_text: [
          {
            text: {
              content: eventName,
            },
          },
        ],
      };
    }

    notionPageUpdates.push({
      pageID: page.id,
      properties,
    });
  });

  async function updateNotionPage(input: NotionPageUpdate): Promise<void> {
    try {
      await axios.request({
        method: "patch",
        url: `${NOTION_BASE_URL}/pages/${input.pageID}`,
        headers,
        data: {
          properties: input.properties,
        },
      });
    } catch (err) {
      let error = err as Error; // HACK
      console.error("Error updating Notion page:", error.message, error);
      return;
    }
  }

  console.log(`Updating ${notionPageUpdates.length} Notion pages`);
  await Promise.all<any>(
    notionPageUpdates.map((pageUpdate) => updateNotionPage(pageUpdate))
  );

  const duration = moment.duration(moment().diff(startTime));
  const durationString = `${duration.minutes()}m ${duration.seconds()}.${duration.milliseconds()}s`;
  console.log(`Synced ${numPagesUpdated} Notion pages in ${durationString}`);
}
