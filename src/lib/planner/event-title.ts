// Kept free of node imports so both server and client code can use it.
/** "Busy" stands in for empty titles, and for every imported title when the user hides them. */
export function displayTitle(title: string, source: string, showTitles: boolean | undefined): string {
  if (source !== "manual" && showTitles === false) return "Busy";
  return title.trim() === "" ? "Busy" : title;
}
