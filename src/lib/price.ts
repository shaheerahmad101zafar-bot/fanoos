export type PriceDiscount = {
  type: string;
  value: number;
  minAmount?: number;
} | null | undefined;

export function money(n: number) {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

export function applyDiscount(amount: number, discount: PriceDiscount) {
  const price = money(amount);
  if (!discount || !discount.value) return { discountAmt: 0, after: price };
  if (discount.minAmount && price < discount.minAmount) return { discountAmt: 0, after: price };
  const discountAmt = money(discount.type === "PERCENT" ? (price * discount.value) / 100 : discount.value);
  return { discountAmt, after: money(Math.max(0, price - discountAmt)) };
}

export function unitTotals(price: number, taxPercent: number, discount: PriceDiscount) {
  const { discountAmt, after } = applyDiscount(price, discount);
  const taxAmt = money((after * (Number(taxPercent) || 0)) / 100);
  return {
    price: money(price),
    discountAmt,
    afterDiscount: after,
    taxAmt,
    final: money(after + taxAmt),
  };
}

export type OrderType = "TAKEAWAY" | "DELIVERY";

export function billTotals(input: {
  subtotal: number;
  discountAmt?: number;
  taxAmt?: number;
  orderType?: OrderType | string | null;
  serviceTaxPercent?: number;
  deliveryCharge?: number;
}) {
  const subtotal = money(input.subtotal);
  const discountAmt = money(input.discountAmt || 0);
  const afterDiscount = money(Math.max(0, subtotal - discountAmt));
  const taxAmt = money(input.taxAmt || 0);
  const orderType = input.orderType === "DELIVERY" ? "DELIVERY" : "TAKEAWAY";
  const serviceTaxPercent = orderType === "TAKEAWAY" ? Number(input.serviceTaxPercent || 0) : 0;
  const serviceTaxAmt = money((afterDiscount * serviceTaxPercent) / 100);
  const deliveryCharge = orderType === "DELIVERY" ? money(input.deliveryCharge || 0) : 0;
  const total = money(afterDiscount + taxAmt + serviceTaxAmt + deliveryCharge);
  return { subtotal, discountAmt, afterDiscount, taxAmt, orderType, serviceTaxPercent, serviceTaxAmt, deliveryCharge, total };
}
