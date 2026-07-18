import clsx from "clsx";

export function MeetingStatusBadge({
  status,
}) {
  return (
    <span
      className={clsx(
        "px-3 py-1 rounded-full text-xs font-semibold",

        status === "live" &&
          "bg-red-100 text-red-700",

        status === "completed" &&
          "bg-green-100 text-green-700",

        status === "scheduled" &&
          "bg-brand-100 text-brand-700",

        status === "cancelled" &&
          "bg-gray-200 text-gray-700",

        status === "missed" &&
          "bg-yellow-100 text-yellow-700"
      )}
    >
      {status?.toUpperCase()}
    </span>
  );
}