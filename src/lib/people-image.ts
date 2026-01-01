export function peopleImageSrc(image: string): string {
  const v = (image ?? "").trim();
  if (!v) return "/people/_placeholder.svg";
  if (v.startsWith("/")) return v; // allow /photos/... and other absolute public paths
  if (v.startsWith("people/")) return `/${v}`;
  return `/people/${v}`;
}

export function normalizePeopleImage(image: string): string {
  const v = (image ?? "").trim();
  if (!v) return "_placeholder.svg";
  if (v.startsWith("/people/")) return v.slice("/people/".length);
  // keep other absolute paths as-is (e.g. /photos/people/daigo.jpg)
  if (v.startsWith("/")) return v;
  return v;
}


