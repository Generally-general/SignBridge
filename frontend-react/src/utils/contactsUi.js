// Small pure helpers for the contact screens. The server is the authority on usernames;
// these only avoid sending requests that are certain to be refused.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

const VALID_CHARS = /^[a-z0-9_]+$/;
const RESERVED = new Set([
  "admin", "administrator", "root", "support", "help", "signbridge", "system",
  "null", "undefined", "api", "www", "me", "settings", "login", "signup",
  "contact", "contacts", "user", "users", "official", "staff",
]);

// "  @Rushi_01 " -> "rushi_01"
export const normalizeUsername = (raw) =>
  String(raw ?? "").trim().toLowerCase().replace(/^@+/, "");

// Why a username cannot be used, or null when it looks fine.
export const usernameProblem = (raw) => {
  const name = normalizeUsername(raw);
  if (name.length < USERNAME_MIN || name.length > USERNAME_MAX) {
    return `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`;
  }
  if (!VALID_CHARS.test(name)) return "Use only lowercase letters, numbers and underscore";
  if (RESERVED.has(name)) return "That username is reserved";
  return null;
};

// What the button next to a search result should say and do.
export const relationshipAction = (relationship) => {
  switch (relationship) {
    case "OUTGOING_PENDING":
      return { label: "Requested", disabled: true, tone: "muted" };
    case "INCOMING_PENDING":
      return { label: "Accept", disabled: false, tone: "success" };
    case "CONTACT":
      return { label: "Contact", disabled: true, tone: "muted" };
    default:
      return { label: "Add", disabled: false, tone: "primary" };
  }
};

export const initialOf = (name) => (String(name || "?").trim().charAt(0) || "?").toUpperCase();