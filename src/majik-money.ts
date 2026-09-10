import Decimal from "decimal.js";
import { CURRENCIES, CurrencyDefinition } from "./currency";

/**
 * Configure Decimal for consistent behaviour across the library.
 * - precision high enough for financial calculations
 * - rounding uses ROUND_HALF_EVEN (bankers rounding)
 */
Decimal.set({
  precision: 100, // increased to support extended-precision division and operations
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -20,
  toExpPos: 50,
});

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

/**
 * Represents a monetary value with arbitrary precision and currency awareness.
 * <br/>
 * **Key Features:**
 * - Immutable: all operations return new `MajikMoney` instances.
 * - Arbitrary precision arithmetic via [decimal.js](https://mikemcl.github.io/decimal.js/).
 * - Supports currency-aware calculations (ISO 4217 codes).
 * - Provides factory methods, conversions, allocation, pricing/tax helpers, rounding, and FX conversion.
 */
export class MajikMoney {
  private readonly amount: Decimal;
  readonly currency: CurrencyDefinition;

  constructor(
    amount: Decimal.Value,
    currency: CurrencyDefinition = CURRENCIES["PHP"],
  ) {
    this.amount = new Decimal(amount).toDecimalPlaces(0);
    this.currency = currency;
  }

  // ---------------------------------------------------------------------------
  // 🏗️ Construction
  // ---------------------------------------------------------------------------

  static zero(currencyCode: string): MajikMoney {
    const currency = CURRENCIES[currencyCode];
    if (!currency) throw new Error(`Unsupported currency ${currencyCode}`);
    return new MajikMoney(0, currency);
  }

  static fromMinor(minor: Decimal.Value, currencyCode: string): MajikMoney {
    const currency = CURRENCIES[currencyCode];
    if (!currency) throw new Error(`Unsupported currency ${currencyCode}`);
    return new MajikMoney(minor, currency);
  }

  static fromMajor(
    amount: Decimal.Value,
    currencyCode: string,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    const currency = CURRENCIES[currencyCode];
    if (!currency) throw new Error(`Unsupported currency ${currencyCode}`);

    const factor = new Decimal(10).pow(currency.minorUnits);
    const minor = new Decimal(amount).mul(factor);

    return new MajikMoney(minor.toDecimalPlaces(0, rounding), currency);
  }

  static parseFromJSON(data: MajikMoneyJSON): MajikMoney {
    if (typeof data.currency !== "string") {
      throw new Error("Invalid currency type. Expected string.");
    }

    const currency = CURRENCIES[data.currency];
    if (!currency) throw new Error(`Unsupported currency ${data.currency}`);
    return new MajikMoney(data.amount, currency);
  }

  // ---------------------------------------------------------------------------
  // 🔎 Representation
  // ---------------------------------------------------------------------------

  toMinor(): number {
    return this.amount.toNumber();
  }
  toMinorDecimal(): Decimal {
    return this.amount;
  }
  toMinorString(): string {
    return this.amount.toFixed(0);
  }
  toMinorBigInt(): bigint {
    return BigInt(this.amount.toFixed(0));
  }
  toMajor(): number {
    return this.toMajorDecimal().toNumber();
  }

  toMajorDecimal(): Decimal {
    return this.amount.div(new Decimal(10).pow(this.currency.minorUnits));
  }

  toMajorString(
    dp?: number,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): string {
    const places = dp ?? this.currency.minorUnits;
    return this.toMajorDecimal().toFixed(places, rounding);
  }

  toString(): string {
    return `${this.toMajorString()} ${this.currency.code}`;
  }

  toCanonicalString(): string {
    return `${this.currency.code} ${this.toMinorString()}`;
  }

  toJSON(): MajikMoneyJSON {
    return {
      __type: "MajikMoney",
      amount: this.amount.toString(),
      currency: this.currency.code,
    };
  }

  format(locale = "en-PH"): string {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: this.currency.code,
      minimumFractionDigits: this.currency.minorUnits,
      maximumFractionDigits: this.currency.minorUnits,
    }).format(this.toMajor());
  }

  // ---------------------------------------------------------------------------
  // ➕ Arithmetic (immutable)
  // ---------------------------------------------------------------------------

  add(other: MajikMoney): MajikMoney {
    this.assertSameCurrency(other);
    return new MajikMoney(this.amount.add(other.amount), this.currency);
  }

  subtract(other: MajikMoney, min?: number, max?: number): MajikMoney {
    this.assertSameCurrency(other);

    let result = this.amount.sub(other.amount);

    if (min !== undefined) result = Decimal.max(result, new Decimal(min));
    if (max !== undefined) result = Decimal.min(result, new Decimal(max));

    return new MajikMoney(result, this.currency);
  }

  multiply(
    factor: Decimal.Value,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    const dFactor = new Decimal(factor);
    if (!dFactor.isFinite()) throw new Error("Factor must be finite");
    const result = this.amount.mul(dFactor);
    return new MajikMoney(result.toDecimalPlaces(0, rounding), this.currency);
  }

  divide(
    divisor: Decimal.Value,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    const d = new Decimal(divisor);
    if (!d.isFinite()) throw new Error("Divisor must be finite");
    if (d.isZero()) throw new Error("Cannot divide MajikMoney by zero");
    const result = this.amount.div(d);
    return new MajikMoney(result.toDecimalPlaces(0, rounding), this.currency);
  }

  multiplyDecimal(factor: Decimal.Value): Decimal {
    const dFactor = new Decimal(factor);
    if (!dFactor.isFinite()) throw new Error("Factor must be finite");
    return this.amount.mul(dFactor);
  }

  divideDecimal(divisor: Decimal.Value): Decimal {
    const d = new Decimal(divisor);
    if (!d.isFinite()) throw new Error("Divisor must be finite");
    if (d.isZero()) throw new Error("Cannot divide MajikMoney by zero");
    return this.amount.div(d);
  }

  invertDivide(
    dividend: Decimal.Value,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    const dDividend = new Decimal(dividend);
    if (!dDividend.isFinite()) throw new Error("Dividend must be finite");
    const majorThis = this.toMajorDecimal();
    if (majorThis.isZero()) {
      throw new Error("Cannot divide by zero money amount");
    }

    const resultMajor = dDividend.div(majorThis);
    return MajikMoney.fromMajor(resultMajor, this.currency.code, rounding);
  }

  ratio(other: MajikMoney): number {
    this.assertSameCurrency(other);
    if (other.amount.isZero()) {
      throw new Error("Division by zero in MajikMoney.ratio()");
    }
    return this.amount.div(other.amount).toNumber();
  }

  compound(
    rate: Decimal.Value,
    periods: number,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    const dRate = new Decimal(rate);
    if (!dRate.isFinite()) throw new Error("Rate must be finite");
    const factor = new Decimal(1).add(dRate).pow(periods);
    return this.multiply(factor, rounding);
  }

  // ---------------------------------------------------------------------------
  // 📐 Percentage
  // ---------------------------------------------------------------------------

  percentage(
    rate: Decimal.Value,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    const dRate = new Decimal(rate);
    if (!dRate.isFinite()) throw new Error("Rate must be finite");
    return this.multiply(dRate, rounding);
  }

  applyPercentage(
    rate: Decimal.Value,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    return this.percentage(rate, rounding);
  }

  addPercentage(
    rate: Decimal.Value,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    return this.add(this.percentage(rate, rounding));
  }

  subtractPercentage(
    rate: Decimal.Value,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    return this.subtract(this.percentage(rate, rounding));
  }

  removePercentage(
    rate: Decimal.Value,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    const divisor = new Decimal(1).add(rate);
    if (divisor.isZero()) {
      throw new Error("Invalid rate: 1 + rate cannot be zero");
    }
    return this.divide(divisor, rounding);
  }

  percentageOf(total: MajikMoney): Decimal {
    this.assertSameCurrency(total);
    if (total.amount.isZero()) {
      throw new Error("Cannot compute percentageOf a zero amount");
    }
    return this.amount.div(total.amount).mul(100);
  }

  // ---------------------------------------------------------------------------
  // 🏷️ Pricing mathematics
  // ---------------------------------------------------------------------------

  discount(rate: Decimal.Value, rounding?: Decimal.Rounding): MajikMoney {
    return this.subtractPercentage(rate, rounding ?? Decimal.ROUND_HALF_EVEN);
  }

  discountAmount(rate: Decimal.Value, rounding?: Decimal.Rounding): MajikMoney {
    return this.percentage(rate, rounding ?? Decimal.ROUND_HALF_EVEN);
  }

  markup(rate: Decimal.Value, rounding?: Decimal.Rounding): MajikMoney {
    return this.addPercentage(rate, rounding ?? Decimal.ROUND_HALF_EVEN);
  }

  markupAmount(rate: Decimal.Value, rounding?: Decimal.Rounding): MajikMoney {
    return this.percentage(rate, rounding ?? Decimal.ROUND_HALF_EVEN);
  }

  // ---------------------------------------------------------------------------
  // 🧾 Tax / fee mathematics
  // ---------------------------------------------------------------------------

  tax(rate: Decimal.Value, rounding?: Decimal.Rounding): MajikMoney {
    return this.percentage(rate, rounding ?? Decimal.ROUND_HALF_EVEN);
  }

  taxInclusive(rate: Decimal.Value, rounding?: Decimal.Rounding): MajikMoney {
    return this.addPercentage(rate, rounding ?? Decimal.ROUND_HALF_EVEN);
  }

  taxExclusive(rate: Decimal.Value, rounding?: Decimal.Rounding): MajikMoney {
    return this.removePercentage(rate, rounding ?? Decimal.ROUND_HALF_EVEN);
  }

  taxComponent(
    rate: Decimal.Value,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    return this.subtract(this.taxExclusive(rate, rounding));
  }

  feePercentage(rate: Decimal.Value, rounding?: Decimal.Rounding): MajikMoney {
    return this.percentage(rate, rounding ?? Decimal.ROUND_HALF_EVEN);
  }

  feeAmount(flatFee: MajikMoney): MajikMoney {
    return this.add(flatFee);
  }

  // ---------------------------------------------------------------------------
  // 🧩 Allocation
  // ---------------------------------------------------------------------------

  allocate(ratios: number[]): MajikMoney[] {
    if (ratios.length === 0) throw new Error("At least one ratio is required");

    let total = 0;
    for (const r of ratios) {
      if (typeof r !== "number" || !Number.isFinite(r) || r < 0) {
        throw new Error("Ratios must be non-negative and finite");
      }
      total += r;
    }

    if (total <= 0) throw new Error("Sum of ratios must be greater than zero");

    let remainder = this.amount;
    let remainingTotal = total;

    return ratios.map((ratio, i) => {
      let share: Decimal;

      if (i === ratios.length - 1) {
        share = remainder;
      } else if (remainingTotal === 0) {
        share = new Decimal(0);
      } else {
        share = remainder
          .mul(ratio)
          .div(remainingTotal)
          .toDecimalPlaces(0, Decimal.ROUND_HALF_DOWN);
      }

      remainder = remainder.sub(share);
      remainingTotal -= ratio;

      return new MajikMoney(share, this.currency);
    });
  }

  allocatePercentages(percentages: number[], tolerance = 0.01): MajikMoney[] {
    const total = percentages.reduce((a, b) => a + b, 0);
    if (total === 0) {
      throw new Error("Sum of ratios must be greater than zero");
    }
    if (Math.abs(total - 100) > tolerance) {
      throw new Error(`Percentages must sum to 100 (got ${total})`);
    }
    return this.allocate(percentages);
  }

  evenSplit(parts: number): MajikMoney[] {
    if (!Number.isFinite(parts) || parts <= 0 || !Number.isInteger(parts)) {
      throw new Error("Number of parts must be > 0");
    }
    return this.allocate(Array(parts).fill(1));
  }

  // ---------------------------------------------------------------------------
  // 🔁 Rounding
  // ---------------------------------------------------------------------------

  round(rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN): MajikMoney {
    const roundedMajor = this.toMajorDecimal().toDecimalPlaces(0, rounding);
    return MajikMoney.fromMajor(roundedMajor, this.currency.code, rounding);
  }

  roundTo(
    increment: Decimal.Value,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    const inc = new Decimal(increment);
    if (inc.lte(0)) throw new Error("increment must be greater than zero");
    const majorValue = this.toMajorDecimal();
    const roundedMajor = majorValue
      .div(inc)
      .toDecimalPlaces(0, rounding)
      .mul(inc);
    return MajikMoney.fromMajor(roundedMajor, this.currency.code, rounding);
  }

  cashRound(rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN): MajikMoney {
    const increment =
      this.currency.cashRoundingIncrement ??
      new Decimal(1)
        .div(new Decimal(10).pow(this.currency.minorUnits))
        .toNumber();
    return this.roundTo(increment, rounding);
  }

  // ---------------------------------------------------------------------------
  // ⚖️ Comparison
  // ---------------------------------------------------------------------------

  equals(other: MajikMoney): boolean {
    return (
      this.currency.code === other.currency.code &&
      this.amount.equals(other.amount)
    );
  }

  equalsWithin(other: MajikMoney, toleranceMinorUnits: number = 0): boolean {
    this.assertSameCurrency(other);
    return this.amount.sub(other.amount).abs().lte(toleranceMinorUnits);
  }

  compare(other: MajikMoney): -1 | 0 | 1 {
    this.assertSameCurrency(other);
    if (this.amount.lt(other.amount)) return -1;
    if (this.amount.gt(other.amount)) return 1;
    return 0;
  }

  greaterThan(other: MajikMoney): boolean {
    this.assertSameCurrency(other);
    return this.amount.gt(other.amount);
  }

  greaterThanOrEqual(other: MajikMoney): boolean {
    this.assertSameCurrency(other);
    return this.amount.gte(other.amount);
  }

  lessThan(other: MajikMoney): boolean {
    this.assertSameCurrency(other);
    return this.amount.lt(other.amount);
  }

  lessThanOrEqual(other: MajikMoney): boolean {
    this.assertSameCurrency(other);
    return this.amount.lte(other.amount);
  }

  // ---------------------------------------------------------------------------
  // ➖➕ Sign
  // ---------------------------------------------------------------------------

  isZero(): boolean {
    return this.amount.isZero();
  }
  isPositive(): boolean {
    return this.amount.gt(0);
  }
  isNegative(): boolean {
    return this.amount.lt(0);
  }
  isNonPositive(): boolean {
    return this.amount.lte(0);
  }
  isNonNegative(): boolean {
    return this.amount.gte(0);
  }

  sign(): -1 | 0 | 1 {
    if (this.amount.isZero()) return 0;
    return this.amount.isNegative() ? -1 : 1;
  }

  negate(): MajikMoney {
    return new MajikMoney(this.amount.neg(), this.currency);
  }

  abs(): MajikMoney {
    return new MajikMoney(this.amount.abs(), this.currency);
  }

  // ---------------------------------------------------------------------------
  // 📏 Bounds
  // ---------------------------------------------------------------------------

  min(other: MajikMoney): MajikMoney {
    this.assertSameCurrency(other);
    return this.lessThanOrEqual(other) ? this : other;
  }

  max(other: MajikMoney): MajikMoney {
    this.assertSameCurrency(other);
    return this.greaterThanOrEqual(other) ? this : other;
  }

  clamp(min: MajikMoney, max: MajikMoney): MajikMoney {
    this.assertSameCurrency(min);
    this.assertSameCurrency(max);
    if (min.greaterThan(max)) {
      throw new Error("clamp: min cannot be greater than max");
    }
    return this.max(min).min(max);
  }

  // ---------------------------------------------------------------------------
  // 💱 Currency
  // ---------------------------------------------------------------------------

  isSameCurrency(other: MajikMoney): boolean {
    return this.currency.code === other.currency.code;
  }

  convert(
    rate: Decimal.Value,
    targetCurrency: CurrencyDefinition,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    const dRate = new Decimal(rate);
    if (!dRate.isFinite()) throw new Error("Conversion rate must be finite");
    const majorSource = this.toMajorDecimal();
    const majorTarget = majorSource.mul(dRate);
    return MajikMoney.fromMajor(majorTarget, targetCurrency.code, rounding);
  }

  convertFromQuoted(
    quotedRate: Decimal.Value,
    targetCurrency: CurrencyDefinition,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    const dQuoted = new Decimal(quotedRate);
    if (!dQuoted.isFinite() || dQuoted.isZero()) {
      throw new Error("Quoted rate must be non-zero and finite");
    }
    const rate = new Decimal(1).div(dQuoted);
    return this.convert(rate, targetCurrency, rounding);
  }

  // ---------------------------------------------------------------------------
  // 📊 Extended Statistics (Static Helpers)
  // ---------------------------------------------------------------------------

  static sum(values: MajikMoney[]): MajikMoney {
    if (values.length === 0) throw new Error("No values provided");
    const currency = values[0].currency;
    const total = values.reduce(
      (acc, m) => {
        if (m.currency.code !== currency.code)
          throw new Error("Currency mismatch in sum");
        return acc.add(m);
      },
      MajikMoney.fromMinor(0, currency.code),
    );
    return total;
  }

  static average(values: MajikMoney[]): MajikMoney {
    return MajikMoney.sum(values).divide(values.length);
  }

  static weightedAverage(values: MajikMoney[], weights: number[]): MajikMoney {
    if (values.length === 0) throw new Error("No values provided");
    if (values.length !== weights.length)
      throw new Error("Values and weights length mismatch");

    const currency = values[0].currency;
    let totalWeight = new Decimal(0);
    let weightedSumMinor = new Decimal(0);

    values.forEach((value, i) => {
      if (value.currency.code !== currency.code)
        throw new Error("Currency mismatch in weightedAverage");

      const weight = new Decimal(weights[i]);
      weightedSumMinor = weightedSumMinor.add(
        value.toMinorDecimal().mul(weight),
      );
      totalWeight = totalWeight.add(weight);
    });

    if (totalWeight.isZero()) throw new Error("Total weight cannot be zero");

    const finalMinor = weightedSumMinor
      .div(totalWeight)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN);
    return new MajikMoney(finalMinor, currency);
  }

  static median(values: MajikMoney[]): MajikMoney {
    if (values.length === 0) throw new Error("No values provided");

    const currency = values[0].currency;
    values.forEach((value) => {
      if (value.currency.code !== currency.code) {
        throw new Error("Currency mismatch in median");
      }
    });
    const sorted = [...values].sort((a, b) => a.compare(b));
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return sorted[mid - 1].add(sorted[mid]).divide(2);
    } else {
      return sorted[mid];
    }
  }

  static min(values: MajikMoney[]): MajikMoney {
    if (values.length === 0) throw new Error("No values provided");
    return values.reduce((prev, curr) => prev.min(curr));
  }

  static max(values: MajikMoney[]): MajikMoney {
    if (values.length === 0) throw new Error("No values provided");
    return values.reduce((prev, curr) => prev.max(curr));
  }

  static variance(values: MajikMoney[]): MajikMoney {
    if (values.length === 0) throw new Error("No values provided");
    const currency = values[0].currency;

    const sumExact = values.reduce((acc, m) => {
      if (m.currency.code !== currency.code)
        throw new Error("Currency mismatch");
      return acc.add(m.toMajorDecimal());
    }, new Decimal(0));

    const mean = sumExact.div(values.length);

    const sumSquared = values.reduce((acc, m) => {
      const diff = m.toMajorDecimal().sub(mean);
      return acc.add(diff.mul(diff));
    }, new Decimal(0));

    const varianceMajor = sumSquared.div(values.length);
    return MajikMoney.fromMajor(varianceMajor, currency.code);
  }

  static standardDeviation(values: MajikMoney[]): MajikMoney {
    if (values.length === 0) throw new Error("No values provided");
    const currency = values[0].currency;

    const sumExact = values.reduce((acc, m) => {
      if (m.currency.code !== currency.code)
        throw new Error("Currency mismatch");
      return acc.add(m.toMajorDecimal());
    }, new Decimal(0));

    const mean = sumExact.div(values.length);

    const sumSquared = values.reduce((acc, m) => {
      const diff = m.toMajorDecimal().sub(mean);
      return acc.add(diff.mul(diff));
    }, new Decimal(0));

    const exactVariance = sumSquared.div(values.length);
    return MajikMoney.fromMajor(exactVariance.sqrt(), currency.code);
  }

  private assertSameCurrency(other: MajikMoney) {
    if (this.currency.code !== other.currency.code) {
      throw new Error(
        `Currency mismatch: ${this.currency.code} vs ${other.currency.code}`,
      );
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeMoney(obj: any): any {
  if (obj instanceof MajikMoney) {
    return obj.toJSON();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeMoney);
  }

  if (obj && typeof obj === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = serializeMoney(obj[key]);
    }
    return result;
  }

  return obj;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deserializeMoney(obj: any): any {
  if (obj && typeof obj === "object" && obj.__type === "MajikMoney") {
    return MajikMoney.parseFromJSON(obj as MajikMoneyJSON);
  }

  if (Array.isArray(obj)) {
    return obj.map(deserializeMoney);
  }

  if (obj && typeof obj === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = deserializeMoney(obj[key]);
    }
    return result;
  }

  return obj;
}
