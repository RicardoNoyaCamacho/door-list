import { AttendeeTable } from "./attendee-table";

export default function EventDashboardLoading() {
  return (
    <section aria-busy="true" aria-labelledby="loading-attendees-heading" className="mt-10">
      <h2 id="loading-attendees-heading" className="text-2xl font-semibold">Asistentes registrados</h2>
      <AttendeeTable state={{ status: "loading" }} />
    </section>
  );
}
