export function positionSize(capital: number, riskPct: number, entry: number, stopLoss: number) {
  const riskAmount = capital * (riskPct / 100);
  const riskPerUnit = Math.abs(entry - stopLoss);
  if (riskPerUnit === 0) return { riskAmount: 0, quantity: 0 };
  const quantity = Math.max(0, Math.floor((riskAmount / riskPerUnit) * 100000) / 100000);
  return { riskAmount, quantity };
}
