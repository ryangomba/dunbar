export type AttendeeInfo = {
  email: string;
};

export type CalendarEventInfo = {
  providerID: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  attendees: AttendeeInfo[];
};

export type CalendarEventInfos = {
  events: CalendarEventInfo[];
  deleted: string[];
};
