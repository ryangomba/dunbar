import { gql, useMutation, useQuery } from "@apollo/client";
import React, { Fragment } from "react";
import { GoogleLogin } from "react-google-login";
import "./App.css";

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

const QUERY = gql`
  query GetContacts {
    viewer {
      displayName
      contacts {
        id
        displayName
        calendarEvents {
          id
          title
          start
        }
      }
    }
  }
`;
const LOGIN = gql`
  mutation Login($googleAuthCode: String!) {
    login(googleAuthCode: $googleAuthCode)
  }
`;
const SYNC = gql`
  mutation Sync(
    $clear: Boolean
    $contacts: Boolean
    $calendars: Boolean
    $notion: Boolean
  ) {
    sync(
      clear: $clear
      contacts: $contacts
      calendars: $calendars
      notion: $notion
    )
  }
`;

function App() {
  const { loading, error, data, refetch } = useQuery(QUERY);
  if (error) {
    console.log(error);
  }

  const [doLogin] = useMutation(LOGIN);
  const [sync] = useMutation(SYNC);

  function login(response: any) {
    console.log("Logging in with google auth code", response.code);
    doLogin({
      variables: {
        googleAuthCode: response.code,
      },
    }).then(({ data }) => {
      console.log("Received auth response", data);
      const authToken = data.login as string;
      localStorage.setItem("AUTH_TOKEN", authToken);
      refetch();
    });
  }

  function logout() {
    console.log("Logging out");
    localStorage.removeItem("AUTH_TOKEN");
    refetch();
  }

  function handleLoginFailure(error: any) {
    console.error("Failed to log in", error);
  }

  const user = data?.viewer;
  const contacts = user?.contacts || [];
  const people = contacts
    .filter((c: any) => {
      return c.displayName !== user.displayName;
    })
    .map((c: any) => {
      const calendarEvents = c.calendarEvents.filter((calendarEvent: any) => {
        return new Date(calendarEvent.start) < new Date();
      });
      return {
        ...c,
        calendarEvents,
        mostRecentlySeen: calendarEvents.reduce(
          (mostRecentlySeen: Date, calendarEvent: any) => {
            const start = new Date(calendarEvent.start);
            return start > mostRecentlySeen ? start : mostRecentlySeen;
          },
          new Date(0)
        ),
      };
    })
    .sort((p1: any, p2: any) => {
      return p1.mostRecentlySeen < p2.mostRecentlySeen;
    });

  function renderUserData() {
    return (
      <div>
        <h5>Logged in as {user.displayName}</h5>
        <h5>
          <button onClick={() => sync({ variables: { calendars: true } })}>
            Sync calendars
          </button>
          <button
            onClick={() =>
              sync({
                variables: { contacts: true, calendars: true, notion: true },
              })
            }
          >
            Sync all
          </button>
          <button
            onClick={() =>
              sync({
                variables: {
                  clear: true,
                  contacts: true,
                  calendars: true,
                  notion: true,
                },
              })
            }
          >
            Clear & sync all
          </button>
        </h5>
        <h3>Contacts</h3>
        {loading && <p>Loading...</p>}
        {error && <p>Error :(</p>}
        {people.map((person: any) => {
          return (
            <div key={person.id}>
              <h5>{person.displayName}</h5>
              <p>{person.mostRecentlySeen.toString()}</p>
              {person.calendarEvents.map((event: any) => {
                return (
                  <p key={event.id}>
                    {event.title} {event.start}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  function renderContent() {
    if (user) {
      return (
        <Fragment>
          <button onClick={logout}>Logout</button>
          {renderUserData()}
        </Fragment>
      );
    }
    if (loading) {
      return <p>Loading...</p>;
    }
    return (
      <GoogleLogin
        clientId={CLIENT_ID}
        scope={
          "https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/calendar"
        }
        buttonText="Login"
        onSuccess={login}
        onFailure={handleLoginFailure}
        accessType={"offline"}
        prompt="consent"
        responseType="code"
      />
    );
  }

  return <div className="App">{renderContent()}</div>;
}

export default App;
