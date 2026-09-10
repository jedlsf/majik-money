/**
 * @interface MajikMoneyJSON
 * Represents the JSON shape returned by {@link MajikMoney.toJSON} or accepted by {@link MajikMoney.parseFromJSON}.
 */
export interface MajikMoneyJSON {
  /** Amount as a string in minor units (e.g., centavos) */
  amount: string | number;
  /** ISO 4217 currency code (e.g., "PHP", "USD") */
  currency: string;
  /** Internal type hint for deserialization */
  __type?: "MajikMoney";
}
