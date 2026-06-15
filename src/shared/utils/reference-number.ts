const referenceAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const randomSuffix = (length: number): string => {
  const values = crypto.getRandomValues(new Uint8Array(length));

  return Array.from(
    values,
    (value) => referenceAlphabet[value % referenceAlphabet.length],
  ).join("");
};

export const generateComplaintReferenceNo = (date = new Date()): string => {
  const datePart = date.toISOString().slice(0, 10).replaceAll("-", "");
  return `ACC-${datePart}-${randomSuffix(4)}`;
};
