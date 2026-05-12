import clsx from "clsx";

export function BotStatusBadge({
  status,
}) {
  return (
    <span
      className={clsx(
        "px-2 py-1 rounded-lg text-xs font-medium",

        status === "scheduled" &&
          "bg-slate-100 text-slate-700",

        status === "joining" &&
          "bg-yellow-100 text-yellow-700",

        status === "processing" &&
          "bg-purple-100 text-purple-700",

        status === "completed" &&
          "bg-green-100 text-green-700",

        status === "failed" &&
          "bg-red-100 text-red-700"
      )}
    >
      Bot: {status}
    </span>
  );
}