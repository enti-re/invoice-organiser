import { useEffect, useId, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";

import { useFocusTrap } from "@/app/components/useFocusTrap";
import { formatIsoDate, parseIsoDate } from "@/lib/date";

const dayPickerClassNames = {
  months: "relative flex",
  month: "space-y-2",
  month_caption: "flex justify-center py-1",
  nav: "flex items-center justify-between absolute inset-x-1 top-0.5",
  button_previous:
    "cursor-pointer border border-neutral-700 p-1 text-neutral-300 hover:border-white hover:text-white",
  button_next:
    "cursor-pointer border border-neutral-700 p-1 text-neutral-300 hover:border-white hover:text-white",
  chevron: "h-4 w-4 fill-current",
  dropdowns: "flex items-center gap-2",
  dropdown_root: "relative inline-flex items-center",
  dropdown: "absolute inset-0 cursor-pointer opacity-0",
  caption_label:
    "flex items-center gap-1 border border-neutral-700 px-2 py-1 text-sm font-medium text-neutral-100",
  month_grid: "border-collapse",
  weekdays: "flex",
  weekday: "w-9 text-xs font-normal text-neutral-400",
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useFocusTrap<HTMLDivElement>(open);
  const labelId = useId();
  const today = formatIsoDate(new Date());

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
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
    <div ref={wrapperRef} className="relative flex flex-col gap-1 text-xs text-neutral-400">
      <span id={labelId}>{label}</span>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${value || `${today} (not set)`}`}
        onClick={() => setOpen((v) => !v)}
        className={`cursor-pointer border border-neutral-700 bg-transparent px-3 py-2 text-left text-sm hover:border-white ${
          value ? "text-neutral-100" : "text-neutral-400"
        }`}
      >
        {value || today}
      </button>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-labelledby={labelId}
          tabIndex={-1}
          className="absolute top-full left-0 z-20 mt-1.5 w-max border border-neutral-700 bg-neutral-950 p-4 shadow-lg focus:outline-none"
        >
          <DayPicker
            mode="single"
            captionLayout="dropdown"
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
