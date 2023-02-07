export function clamp(min: number, input: number, max: number) {
  return Math.max(min, Math.min(input, max))
}

export function truncate(value: number, decimals = 0) {
  return parseFloat(value.toFixed(decimals))
}

export function lerp(start: number, end: number, amt: number) {
  return (1 - amt) * start + amt * end
}

export function clampedModulo(dividend: number, divisor: number) {
  let remainder = dividend % divisor

  if ((divisor > 0 && remainder < 0) || (divisor < 0 && remainder > 0)) {
    remainder += divisor
  }

  return remainder
}
