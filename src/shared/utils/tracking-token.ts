export const generateTrackingToken = (): string =>
  `trk_${crypto.randomUUID().replaceAll("-", "")}`;
