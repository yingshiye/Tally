// Pure helpers for the settings screens. No clock, no database.

/** "09:00" or "09:00:00" -> "9 am"; "21:30" -> "9:30 pm". */
export function formatClock(value: string): string {
  const [h, m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, "0")} ${suffix}` : `${hour} ${suffix}`;
}

export function formatWorkRange(start: string, end: string): string {
  return `${formatClock(start)} to ${formatClock(end)}`;
}

/** "America/Los_Angeles" -> "Los Angeles". Falls back to the raw value. */
export function zoneCity(timezone: string): string {
  const last = timezone.split("/").pop() ?? timezone;
  return last.replace(/_/g, " ");
}

export type PrefsForm = {
  timezone: string;
  workStart: string;
  workEnd: string;
  bufferMin: number;
  starterMin: number;
  topN: number;
};

/** Returns an error message for the first problem, or null when the form can be saved. */
export function validatePrefsForm(f: PrefsForm, isKnownZone: (z: string) => boolean): string | null {
  if (!isKnownZone(f.timezone)) return "Pick a time zone from the list.";
  if (!/^\d{2}:\d{2}$/.test(f.workStart) || !/^\d{2}:\d{2}$/.test(f.workEnd)) return "Enter both work hours.";
  if (f.workEnd <= f.workStart) return "Work hours must end after they start.";
  const ints: [number, number, number, string][] = [
    [f.bufferMin, 0, 120, "Buffer"],
    [f.starterMin, 5, 60, "Starter length"],
    [f.topN, 1, 10, "Top priorities"],
  ];
  for (const [v, min, max, label] of ints) {
    if (!Number.isInteger(v) || v < min || v > max) return `${label} must be a whole number from ${min} to ${max}.`;
  }
  return null;
}

export function isKnownTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}
