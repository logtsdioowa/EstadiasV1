export function roundUpToNextTen(value) {
  const n = Number(value || 0);
  return Math.ceil(n / 10) * 10;
}

export default roundUpToNextTen;
