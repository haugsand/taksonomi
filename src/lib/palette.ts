const HUE_COUNT = 45;

export function randomHue(): number {
  return Math.floor(Math.random() * HUE_COUNT) * (360 / HUE_COUNT);
}
