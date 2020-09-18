# Dunbar

A server-side app to help you stay in touch with friends.

Log in via Google once, after which your contacts and calendars will continuously sync as they update. Your contacts will automatically be updated with an email "alias", which you can use to add people to calendar events without actually sending them an email invitation. Based on your calendar, the app determines the last time you spent time with each person, then updates a Notion database with this field. This can make it easy to see who you're due to spend time with.

### Components

The `server` directory is an Express server written in Typescript. It runs Apollo Server to serve a GraphQL endpoint. Prisma is used to manage the (Postgres) database schema and to interact with the database from Typescript. Given a Google auth token, the server can sync contacts and calendar with Google and populate the database. It can also apply email aliases to contacts, and sync data to a Notion database.

The `web` directory is a simple React web client written in Typescript. It was created with Create React App. It uses Apollo Client to query our GraphQL backend. Currently, it just shows a big page of data for inspecting whether things are working, plus a few buttons to log into Google and start the sync routine.

