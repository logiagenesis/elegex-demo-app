export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Begin authentication from an event handler. The server owns provider choice,
 * CSRF-state issuance, and the redirect destination so browser code remains
 * provider-neutral and existing Manus sessions stay valid.
 */
export const startLogin = () => {
  const params = new URLSearchParams({ origin: window.location.origin });
  window.location.assign(`/api/auth/login?${params.toString()}`);
};
