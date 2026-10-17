// חבילות קרדיטים. המחירים באגורות (Stripe עובד ביחידה הקטנה של המטבע).
export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceAgorot: number;
  popular?: boolean;
  perks: string[];
}

export const CURRENCY = "ils";

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "starter",
    name: "מתחילים",
    credits: 100,
    priceAgorot: 2900,
    perks: ["כ-6 סרטונים של 5 שניות", "כל המודלים", "ללא תוקף"],
  },
  {
    id: "creator",
    name: "יוצרים",
    credits: 300,
    priceAgorot: 7900,
    popular: true,
    perks: ["כ-20 סרטונים של 5 שניות", "חיסכון של 9%", "ללא תוקף"],
  },
  {
    id: "studio",
    name: "סטודיו",
    credits: 1000,
    priceAgorot: 22900,
    perks: ["כ-66 סרטונים של 5 שניות", "חיסכון של 21%", "ללא תוקף"],
  },
];

export function getPack(id: string | null | undefined) {
  return CREDIT_PACKS.find((p) => p.id === id);
}

export function formatPrice(agorot: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(agorot / 100);
}
