export const isValidIsoDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

// Local-time formatting deliberately, not toISOString() (UTC) -- a date
// picker's selected day must round-trip to the same calendar day regardless
// of the viewer's timezone offset.
export const formatIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseIsoDate = (value: string): Date | undefined => {
  if (!isValidIsoDate(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};
