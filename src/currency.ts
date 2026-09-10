export interface CurrencyDefinition {
  code: string;
  symbol: string;
  minorUnits: number;
  name: string;
  /**
   * The smallest physical denomination in major units (e.g., 0.05 for CAD, 1 for JPY).
   * Used as the explicit increment for `MajikMoney.cashRound()`.
   *
   * ⚠️ For a handful of currencies undergoing rapid inflation or active coin
   * withdrawal (flagged inline below), this reflects the smallest *officially
   * issued* denomination, not necessarily what cash transactions round to in
   * practice today. Those entries drift faster than the rest of this table —
   * re-verify against the issuing central bank before relying on them for
   * anything price-sensitive.
   */
  cashRoundingIncrement: number;
}

export const CURRENCIES: Record<string, CurrencyDefinition> = {
  // ---------------------------------------------------------------------------
  // North America
  // ---------------------------------------------------------------------------
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    minorUnits: 2,
    cashRoundingIncrement: 0.01,
  },
  CAD: {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "$",
    minorUnits: 2,
    cashRoundingIncrement: 0.05,
  }, // penny discontinued 2013

  // ---------------------------------------------------------------------------
  // Europe
  // ---------------------------------------------------------------------------
  EUR: {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    minorUnits: 2,
    cashRoundingIncrement: 0.01,
  },
  GBP: {
    code: "GBP",
    name: "Pound Sterling",
    symbol: "£",
    minorUnits: 2,
    cashRoundingIncrement: 0.01,
  },
  CHF: {
    code: "CHF",
    name: "Swiss Franc",
    symbol: "CHF",
    minorUnits: 2,
    cashRoundingIncrement: 0.05,
  }, // 5 Rappen
  SEK: {
    code: "SEK",
    name: "Swedish Krona",
    symbol: "kr",
    minorUnits: 2,
    cashRoundingIncrement: 1,
  }, // öre discontinued 2010
  NOK: {
    code: "NOK",
    name: "Norwegian Krone",
    symbol: "kr",
    minorUnits: 2,
    cashRoundingIncrement: 1,
  }, // øre discontinued 2012
  DKK: {
    code: "DKK",
    name: "Danish Krone",
    symbol: "kr.",
    minorUnits: 2,
    cashRoundingIncrement: 0.5,
  }, // 50 øre
  ISK: {
    code: "ISK",
    name: "Icelandic Króna",
    symbol: "kr",
    minorUnits: 0,
    cashRoundingIncrement: 1,
  }, // aurar subdivisions discontinued 2003; treated as a zero-decimal currency
  RUB: {
    code: "RUB",
    name: "Russian Ruble",
    symbol: "₽",
    minorUnits: 2,
    cashRoundingIncrement: 0.01,
  },
  UAH: {
    code: "UAH",
    name: "Ukrainian Hryvnia",
    symbol: "₴",
    minorUnits: 2,
    cashRoundingIncrement: 0.1,
  }, // ⚠️ in flux: 1/2/5/25 kopiyky already demonetized, 10 kopiyky withdrawal began Oct 2025 — verify before relying on this
  TRY: {
    code: "TRY",
    name: "Turkish Lira",
    symbol: "₺",
    minorUnits: 2,
    cashRoundingIncrement: 0.01,
  },
  PLN: {
    code: "PLN",
    name: "Zloty",
    symbol: "zł",
    minorUnits: 2,
    cashRoundingIncrement: 0.01,
  },
  CZK: {
    code: "CZK",
    name: "Czech Koruna",
    symbol: "Kč",
    minorUnits: 2,
    cashRoundingIncrement: 1,
  },
  HUF: {
    code: "HUF",
    name: "Forint",
    symbol: "Ft",
    minorUnits: 2,
    cashRoundingIncrement: 5,
  }, // 5 Forint
  RON: {
    code: "RON",
    name: "Romanian Leu",
    symbol: "lei",
    minorUnits: 2,
    cashRoundingIncrement: 0.1,
  }, // 1 and 5 bani coins withdrawn 2018
  BGN: {
    code: "BGN",
    name: "Bulgarian Lev",
    symbol: "лв",
    minorUnits: 2,
    cashRoundingIncrement: 0.01,
  },

  // ---------------------------------------------------------------------------
  // Asia Pacific
  // ---------------------------------------------------------------------------
  JPY: {
    code: "JPY",
    name: "Yen",
    symbol: "¥",
    minorUnits: 0,
    cashRoundingIncrement: 1,
  },
  CNY: {
    code: "CNY",
    name: "Yuan Renminbi",
    symbol: "¥",
    minorUnits: 2,
    cashRoundingIncrement: 0.01,
  },
  HKD: {
    code: "HKD",
    name: "Hong Kong Dollar",
    symbol: "$",
    minorUnits: 2,
    cashRoundingIncrement: 0.1,
  }, // 10 cents
  SGD: {
    code: "SGD",
    name: "Singapore Dollar",
    symbol: "$",
    minorUnits: 2,
    cashRoundingIncrement: 0.05,
  }, // 5 cents
  AUD: {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "$",
    minorUnits: 2,
    cashRoundingIncrement: 0.05,
  }, // 5 cents
  NZD: {
    code: "NZD",
    name: "New Zealand Dollar",
    symbol: "$",
    minorUnits: 2,
    cashRoundingIncrement: 0.1,
  }, // 10 cents
  PHP: {
    code: "PHP",
    name: "Philippine Peso",
    symbol: "₱",
    minorUnits: 2,
    cashRoundingIncrement: 0.01,
  }, // 1 centavo
  KRW: {
    code: "KRW",
    name: "Won",
    symbol: "₩",
    minorUnits: 0,
    cashRoundingIncrement: 10,
  }, // 10 Won
  INR: {
    code: "INR",
    name: "Indian Rupee",
    symbol: "₹",
    minorUnits: 2,
    cashRoundingIncrement: 0.5,
  }, // 50 Paise — confirmed still legal tender (RBI, Dec 2025), though rarely accepted in practice
  PKR: {
    code: "PKR",
    name: "Pakistani Rupee",
    symbol: "₨",
    minorUnits: 2,
    cashRoundingIncrement: 1,
  }, // paisa coins ceased to be legal tender in 2013; smallest coin is Re. 1
  BDT: {
    code: "BDT",
    name: "Bangladeshi Taka",
    symbol: "৳",
    minorUnits: 2,
    cashRoundingIncrement: 1,
  }, // ⚠️ poisha coins are effectively out of use — verify before relying on this
  LKR: {
    code: "LKR",
    name: "Sri Lankan Rupee",
    symbol: "Rs",
    minorUnits: 2,
    cashRoundingIncrement: 1,
  }, // ⚠️ cent subdivisions long obsolete; post-2022 crisis practice may round higher — verify
  NPR: {
    code: "NPR",
    name: "Nepalese Rupee",
    symbol: "रू",
    minorUnits: 2,
    cashRoundingIncrement: 1,
  }, // ⚠️ paisa coins effectively unused — verify before relying on this
  IDR: {
    code: "IDR",
    name: "Rupiah",
    symbol: "Rp",
    minorUnits: 2,
    cashRoundingIncrement: 100,
  }, // 100 Rupiah
  THB: {
    code: "THB",
    name: "Baht",
    symbol: "฿",
    minorUnits: 2,
    cashRoundingIncrement: 0.25,
  }, // 25 Satang
  MYR: {
    code: "MYR",
    name: "Ringgit",
    symbol: "RM",
    minorUnits: 2,
    cashRoundingIncrement: 0.05,
  }, // 5 Sen
  VND: {
    code: "VND",
    name: "Dong",
    symbol: "₫",
    minorUnits: 0,
    cashRoundingIncrement: 100,
  }, // ⚠️ 100–200 VND notes/coins are essentially obsolete in practice — verify before relying on this
  TWD: {
    code: "TWD",
    name: "New Taiwan Dollar",
    symbol: "NT$",
    minorUnits: 2,
    cashRoundingIncrement: 1,
  }, // 1 NT$
  FJD: {
    code: "FJD",
    name: "Fijian Dollar",
    symbol: "$",
    minorUnits: 2,
    cashRoundingIncrement: 0.05,
  }, // smallest coin since the 2010 coinage change

  // ---------------------------------------------------------------------------
  // Middle East
  // ---------------------------------------------------------------------------
  KWD: {
    code: "KWD",
    name: "Kuwaiti Dinar",
    symbol: "د.ك",
    minorUnits: 3,
    cashRoundingIncrement: 0.005,
  }, // 5 Fils
  BHD: {
    code: "BHD",
    name: "Bahraini Dinar",
    symbol: ".د.ب",
    minorUnits: 3,
    cashRoundingIncrement: 0.005,
  }, // 5 Fils
  JOD: {
    code: "JOD",
    name: "Jordanian Dinar",
    symbol: "د.ا",
    minorUnits: 3,
    cashRoundingIncrement: 0.01,
  }, // 1 qirsh/piastre — fils subdivisions are obsolete; there is no ½-piastre coin in the current series
  QAR: {
    code: "QAR",
    name: "Qatari Riyal",
    symbol: "ر.ق",
    minorUnits: 2,
    cashRoundingIncrement: 0.25,
  }, // 25 dirhams — verify before relying on this
  OMR: {
    code: "OMR",
    name: "Omani Rial",
    symbol: "ر.ع.",
    minorUnits: 3,
    cashRoundingIncrement: 0.05,
  }, // 50 baisa — verify before relying on this
  AED: {
    code: "AED",
    name: "UAE Dirham",
    symbol: "د.إ",
    minorUnits: 2,
    cashRoundingIncrement: 0.25,
  }, // 25 Fils
  ILS: {
    code: "ILS",
    name: "Israeli New Shekel",
    symbol: "₪",
    minorUnits: 2,
    cashRoundingIncrement: 0.1,
  }, // 10 Agorot
  SAR: {
    code: "SAR",
    name: "Saudi Riyal",
    symbol: "ر.س",
    minorUnits: 2,
    cashRoundingIncrement: 0.05,
  }, // 5 Halalas. Note: SAMA approved an official new riyal symbol (Unicode U+20C1) in Feb 2025;
  // rollout alongside "ر.س" is gradual, so this ISO-style symbol is still safe to display.

  // ---------------------------------------------------------------------------
  // South America
  // ---------------------------------------------------------------------------
  CLP: {
    code: "CLP",
    name: "Chilean Peso",
    symbol: "$",
    minorUnits: 0,
    cashRoundingIncrement: 10,
  }, // 10 Pesos
  COP: {
    code: "COP",
    name: "Colombian Peso",
    symbol: "$",
    minorUnits: 2,
    cashRoundingIncrement: 50,
  }, // 50 Pesos
  MXN: {
    code: "MXN",
    name: "Mexican Peso",
    symbol: "$",
    minorUnits: 2,
    cashRoundingIncrement: 0.5,
  }, // 50 Centavos
  BRL: {
    code: "BRL",
    name: "Brazilian Real",
    symbol: "R$",
    minorUnits: 2,
    cashRoundingIncrement: 0.05,
  }, // 5 Centavos
  ARS: {
    code: "ARS",
    name: "Argentine Peso",
    symbol: "$",
    minorUnits: 2,
    cashRoundingIncrement: 1,
  }, // ⚠️ severely outdated by design: with ~10 ARS ≈ 1 US cent (early 2025), coins below
  // peso-level are no longer issued or used at all — this field needs a deliberate business
  // decision (e.g. round to the nearest 100), not this ISO-style "smallest coin" default.

  // ---------------------------------------------------------------------------
  // Africa
  // ---------------------------------------------------------------------------
  ZAR: {
    code: "ZAR",
    name: "Rand",
    symbol: "R",
    minorUnits: 2,
    cashRoundingIncrement: 0.1,
  }, // 10 Cents — SARB-recommended cash rounding
  NGN: {
    code: "NGN",
    name: "Naira",
    symbol: "₦",
    minorUnits: 2,
    cashRoundingIncrement: 1,
  }, // ⚠️ kobo subdivisions are entirely defunct and low-denomination naira coins are rarely
  // seen due to inflation — verify before relying on this
  KES: {
    code: "KES",
    name: "Kenyan Shilling",
    symbol: "KSh",
    minorUnits: 2,
    cashRoundingIncrement: 1,
  }, // 1 Shilling
  GHS: {
    code: "GHS",
    name: "Ghanaian Cedi",
    symbol: "₵",
    minorUnits: 2,
    cashRoundingIncrement: 0.1,
  }, // ⚠️ post-2007 redenomination pesewa coins exist down to 1 pesewa, but ongoing
  // depreciation may push practical cash rounding higher — verify before relying on this
  MAD: {
    code: "MAD",
    name: "Moroccan Dirham",
    symbol: "DH",
    minorUnits: 2,
    cashRoundingIncrement: 0.1,
  }, // 10 centimes commonly used; 5-centime coin is rare
  ETB: {
    code: "ETB",
    name: "Ethiopian Birr",
    symbol: "Br",
    minorUnits: 2,
    cashRoundingIncrement: 1,
  }, // ⚠️ santim coins are essentially unused given inflation — verify before relying on this
  TZS: {
    code: "TZS",
    name: "Tanzanian Shilling",
    symbol: "TSh",
    minorUnits: 2,
    cashRoundingIncrement: 50,
  }, // ⚠️ no active cent subdivision in practice — verify before relying on this
  UGX: {
    code: "UGX",
    name: "Ugandan Shilling",
    symbol: "USh",
    minorUnits: 0,
    cashRoundingIncrement: 100,
  }, // ⚠️ no active cent subdivision in practice — verify before relying on this
  EGP: {
    code: "EGP",
    name: "Egyptian Pound",
    symbol: "£",
    minorUnits: 2,
    cashRoundingIncrement: 0.25,
  }, // 25 Piastres
};
