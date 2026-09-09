export const uid = (): string => {
  // crypto.randomUUID is available everywhere the app targets; the Math.random
  // form is kept as a fallback for insecure origins, where it is undefined.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
};
