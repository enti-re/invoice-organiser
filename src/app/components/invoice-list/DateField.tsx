import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";

import { formatIsoDate, parseIsoDate } from "@/lib/date";

const dayPickerClassNames = {
  months: "relative flex",
  month: "space-y-2",
  month_caption: "flex justify-center py-1 text-sm font-medium text-neutral-100",
  nav: "flex items-center justify-between absolute inset-x-1 top-1",
  button_previous: "cursor-pointer p-1 text-neutral-400 hover:text-white",
  button_next: "cursor-pointer p-1 text-neutral-400 hover:text-white",
  month_grid: "border-collapse",
  weekdays: "flex",
  weekday: "w-9 text-xs font-normal text-neutral-500",
  week: "flex",
  day: "w-9 h-9 p-0 text-center text-sm text-neutral-300",
  day_button: "w-9 h-9 cursor-pointer hover:border hover:border-neutral-600",
  selected: "bg-white text-black hover:border-transparent",
  today: "font-semibold underline",
  outside: "text-neutral-700",
};

export const DateField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = formatIsoDate(new Date());

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative flex flex-col gap-1 text-xs text-neutral-500">
      {label}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`cursor-pointer border border-neutral-700 bg-transparent px-3 py-2 text-left text-sm hover:border-white ${
          value ? "text-neutral-100" : "text-neutral-500"
        }`}
      >
        {value || today}
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-1.5 border border-neutral-700 bg-neutral-950 p-3 shadow-lg">
          <DayPicker
            mode="single"
            selected={value ? parseIsoDate(value) : undefined}
            onSelect={(date) => {
              onChange(date ? formatIsoDate(date) : "");
              setOpen(false);
            }}
            classNames={dayPickerClassNames}
          />
        </div>
      )}
    </div>
  );
};
