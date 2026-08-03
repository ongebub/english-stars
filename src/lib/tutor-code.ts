/**
 * Single source of truth for tutor invite code format.
 * Imported by both the code generator and the join validator.
 */

export const TUTOR_CODE_PREFIX = "TCH-";
export const TUTOR_CODE_BODY_LENGTH = 6;
export const TUTOR_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const TUTOR_CODE_MAX_LENGTH =
  TUTOR_CODE_PREFIX.length + TUTOR_CODE_BODY_LENGTH; // 10

/** Regex that matches a full tutor code (e.g. TCH-MV264T) */
export const TUTOR_CODE_REGEX = new RegExp(
  `^${TUTOR_CODE_PREFIX}[${TUTOR_CODE_ALPHABET}]{${TUTOR_CODE_BODY_LENGTH}}$`
);

/** Regex that matches just the body part (e.g. MV264T) */
export const TUTOR_CODE_BODY_REGEX = new RegExp(
  `^[${TUTOR_CODE_ALPHABET}]{${TUTOR_CODE_BODY_LENGTH}}$`
);

/**
 * Returns true if the input looks like a tutor invite code
 * (with or without the TCH- prefix).
 */
export function isTutorCode(input: string): boolean {
  const cleaned = input.toUpperCase().trim().replace(/\s/g, "");
  return TUTOR_CODE_REGEX.test(cleaned) || TUTOR_CODE_BODY_REGEX.test(cleaned);
}

/**
 * Normalises user input into the canonical TCH-XXXXXX format.
 * Accepts input with or without the prefix.
 * Returns null if the input doesn't match either form.
 */
export function normaliseTutorCode(input: string): string | null {
  const cleaned = input.toUpperCase().trim().replace(/\s/g, "");
  if (TUTOR_CODE_REGEX.test(cleaned)) return cleaned;
  if (TUTOR_CODE_BODY_REGEX.test(cleaned))
    return `${TUTOR_CODE_PREFIX}${cleaned}`;
  return null;
}

/**
 * Generate a random tutor invite code in TCH-XXXXXX format.
 */
export function generateTutorCode(): string {
  let code = TUTOR_CODE_PREFIX;
  for (let i = 0; i < TUTOR_CODE_BODY_LENGTH; i++) {
    code += TUTOR_CODE_ALPHABET[Math.floor(Math.random() * TUTOR_CODE_ALPHABET.length)];
  }
  return code;
}
