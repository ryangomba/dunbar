Set up your environment by creating a `.env` file:

```
DATABASE_URL=url/to/postgres/database
```

To develop:

```
yarn dev
```

To build and run:

```
yarn build
yarn start
```

To re-generate typescript definitons after a schema change:

```
yarn prisma format
yarn prisma generate
```

To generate a database migration after a schema change:

```
yarn prisma migrate dev
```

