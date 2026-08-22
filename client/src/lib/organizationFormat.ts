export type OrganizationFormatSettings = {
  locale?: string | null;
  currency?: string | null;
  timezone?: string | null;
};

export type NormalizedOrganizationFormat = {
  locale: string;
  currency: string;
  timezone: string;
};

export const DEFAULT_ORGANIZATION_FORMAT: NormalizedOrganizationFormat = {
  locale: "en-ZA",
  currency: "ZAR",
  timezone: "Africa/Johannesburg",
};

export function normalizeOrganizationFormat(settings?: OrganizationFormatSettings): NormalizedOrganizationFormat {
  return {
    locale: settings?.locale || DEFAULT_ORGANIZATION_FORMAT.locale,
    currency: settings?.currency || DEFAULT_ORGANIZATION_FORMAT.currency,
    timezone: settings?.timezone || DEFAULT_ORGANIZATION_FORMAT.timezone,
  };
}

export function formatOrganizationMoney(value: number | null | undefined, settings?: OrganizationFormatSettings, options: Intl.NumberFormatOptions = {}) {
  const format = normalizeOrganizationFormat(settings);
  return new Intl.NumberFormat(format.locale, {
    style: "currency",
    currency: format.currency,
    maximumFractionDigits: 2,
    ...options,
  }).format(Number(value ?? 0));
}

export function formatOrganizationDate(value: Date | string | null | undefined, settings?: OrganizationFormatSettings, options: Intl.DateTimeFormatOptions = {}) {
  if (!value) return "—";
  const format = normalizeOrganizationFormat(settings);
  return new Intl.DateTimeFormat(format.locale, {
    timeZone: format.timezone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(new Date(value));
}

export function formatOrganizationDateTime(value: Date | string | null | undefined, settings?: OrganizationFormatSettings) {
  return formatOrganizationDate(value, settings, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}
