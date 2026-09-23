export function remainingBudget(budget: number, spent: number) {
  return Math.round((budget - spent) * 100) / 100
}

export function spentFromReceipts(receipts: { totalAmount: number | null }[]) {
  return receipts.reduce((sum, receipt) => sum + (receipt.totalAmount ?? 0), 0)
}
