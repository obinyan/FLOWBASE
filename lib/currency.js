import { useEffect, useState } from "react";

export const CURRENCIES = [
  { code: "USD", label: "US Dollar (USD)" },
  { code: "GBP", label: "British Pound (GBP)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "NGN", label: "Nigerian Naira (NGN)" },
];

export function formatCurrency(value, currency = "USD", options = {}) {
  const code = CURRENCIES.some((item) => item.code === currency) ? currency : "USD";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: code,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    ...options,
  }).format(Number(value || 0));
}

export function formatCurrencyTotals(records, fallbackCurrency = "USD") {
  const totals = new Map();
  for (const record of records || []) {
    const currency = CURRENCIES.some((item) => item.code === record.currency) ? record.currency : fallbackCurrency;
    totals.set(currency, (totals.get(currency) || 0) + Number(record.amount || 0));
  }
  return [...totals].map(([currency, amount]) => formatCurrency(amount, currency, { maximumFractionDigits: 0 })).join(" · ") || formatCurrency(0, fallbackCurrency, { maximumFractionDigits: 0 });
}

export function readWorkspaceCurrency() {
  if (typeof window === "undefined") return "USD";
  try {
    const settings = JSON.parse(localStorage.getItem("flowbase:settings") || "{}");
    return CURRENCIES.some((item) => item.code === settings.currency) ? settings.currency : "USD";
  } catch { return "USD"; }
}
export function useWorkspaceCurrency() {
  const [currency, setCurrency] = useState("USD");
  useEffect(() => {
    const update = () => setCurrency(readWorkspaceCurrency());
    update();
    window.addEventListener("flowbase:currency-updated", update);
    window.addEventListener("flowbase:records-ready", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("flowbase:currency-updated", update);
      window.removeEventListener("flowbase:records-ready", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return currency;
}
