export const toDiscoverySlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const matchesDiscoveryDeclaration = (
  value: string,
  declaredValues: string[]
) =>
  declaredValues.some(item => toDiscoverySlug(item) === toDiscoverySlug(value));
