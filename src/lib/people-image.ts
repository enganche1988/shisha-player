export function peopleImageSrc(image: string): string {
  const v = (image ?? "").trim();
  if (!v) return "/people/_placeholder.svg";
  if (v.startsWith("/people/")) return v;
  if (v.startsWith("/")) return v;
  return `/people/${v}`;
}

export function normalizePeopleImage(image: string): string {
  const v = (image ?? "").trim();
  if (!v) return "_placeholder.svg";
  if (v.startsWith("/people/")) return v.slice("/people/".length);
  if (v.startsWith("/")) return v.replace(/^\//, "");
  return v;
}


