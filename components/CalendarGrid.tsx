"use client";

import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export type CalendarGridEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: string | null;
  resource?: unknown;
};

type CalendarGridProps = {
  events: CalendarGridEvent[];
  viewDate: Date;
  onNavigate: (date: Date) => void;
  onSelectSlot: (slot: { start: Date; end: Date }) => void;
  onSelectEvent: (event: CalendarGridEvent) => void;
};

export function CalendarGrid({ events, viewDate, onNavigate, onSelectSlot, onSelectEvent }: CalendarGridProps) {
  return (
    <div className="rbc-calendar rbc-deco">
      <BigCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ minHeight: 500 }}
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        onNavigate={onNavigate}
        date={viewDate}
        selectable
      />
    </div>
  );
}
