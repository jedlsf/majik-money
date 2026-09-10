import Decimal from "decimal.js";
import { CURRENCIES, CurrencyDefinition } from "./currency";
import { MajikMoneyJSON } from "./types";

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

  /**
   * Initializes a new instance of MajikMoney.
   *
   * @param {Decimal.Value} amount - The monetary amount represented in minor units (e.g., cents).
   * @param {CurrencyDefinition} [currency=CURRENCIES["PHP"]] - The currency definition. Defaults to PHP.
   */
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

  /**
   * Creates a MajikMoney instance representing zero in the specified currency.
   *
   * @param {string} currencyCode - The ISO 4217 currency code (e.g., "USD", "PHP").
   * @returns {MajikMoney} A new MajikMoney instance with a zero value.
   * @throws {Error} If the currency code is not supported.
   */
  static zero(currencyCode: string): MajikMoney {
    const currency = CURRENCIES[currencyCode];
    if (!currency) throw new Error(`Unsupported currency ${currencyCode}`);
    return new MajikMoney(0, currency);
  }

  /**
   * Creates a MajikMoney instance from an amount in minor units (e.g., cents).
   *
   * @param {Decimal.Value} minor - The monetary amount in minor units.
   * @param {string} currencyCode - The ISO 4217 currency code.
   * @returns {MajikMoney} A new MajikMoney instance.
   * @throws {Error} If the currency code is not supported.
   */
  static fromMinor(minor: Decimal.Value, currencyCode: string): MajikMoney {
    const currency = CURRENCIES[currencyCode];
    if (!currency) throw new Error(`Unsupported currency ${currencyCode}`);
    return new MajikMoney(minor, currency);
  }

  /**
   * Creates a MajikMoney instance from an amount in major units (e.g., dollars).
   *
   * @param {Decimal.Value} amount - The monetary amount in major units.
   * @param {string} currencyCode - The ISO 4217 currency code.
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode to use if precision exceeds minor units.
   * @returns {MajikMoney} A new MajikMoney instance.
   * @throws {Error} If the currency code is not supported.
   */
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

  /**
   * Rehydrates a MajikMoney instance from its serialized JSON format.
   *
   * @param {MajikMoneyJSON} data - The JSON object representing the money instance.
   * @returns {MajikMoney} A new MajikMoney instance.
   * @throws {Error} If the currency type is invalid or unsupported.
   */
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

  /**
   * Retrieves the amount as a native JavaScript number in minor units.
   *
   * @returns {number} The minor unit amount.
   */
  toMinor(): number {
    return this.amount.toNumber();
  }

  /**
   * Retrieves the minor unit amount as a Decimal instance.
   *
   * @returns {Decimal} The minor unit amount.
   */
  toMinorDecimal(): Decimal {
    return this.amount;
  }

  /**
   * Retrieves the minor unit amount as a string.
   *
   * @returns {string} The string representation of the minor unit amount.
   */
  toMinorString(): string {
    return this.amount.toFixed(0);
  }

  /**
   * Retrieves the minor unit amount as a BigInt.
   *
   * @returns {bigint} The BigInt representation of the minor unit amount.
   */
  toMinorBigInt(): bigint {
    return BigInt(this.amount.toFixed(0));
  }

  /**
   * Retrieves the amount as a native JavaScript number in major units.
   *
   * @returns {number} The major unit amount.
   */
  toMajor(): number {
    return this.toMajorDecimal().toNumber();
  }

  /**
   * Retrieves the major unit amount as a Decimal instance.
   *
   * @returns {Decimal} The major unit amount.
   */
  toMajorDecimal(): Decimal {
    return this.amount.div(new Decimal(10).pow(this.currency.minorUnits));
  }

  /**
   * Retrieves the major unit amount as a formatted string.
   *
   * @param {number} [dp] - The number of decimal places. Defaults to the currency's minor units.
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {string} The string representation of the major unit amount.
   */
  toMajorString(
    dp?: number,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): string {
    const places = dp ?? this.currency.minorUnits;
    return this.toMajorDecimal().toFixed(places, rounding);
  }

  /**
   * Formats the amount as a string with the currency code as a suffix (e.g., "10.00 USD").
   *
   * @returns {string} The standard string representation.
   */
  toString(): string {
    return `${this.toMajorString()} ${this.currency.code}`;
  }

  /**
   * Formats the amount in its canonical form using minor units (e.g., "USD 1000").
   *
   * @returns {string} The canonical string representation.
   */
  toCanonicalString(): string {
    return `${this.currency.code} ${this.toMinorString()}`;
  }

  /**
   * Serializes the instance to a JSON-compatible object.
   *
   * @returns {MajikMoneyJSON} The serialized JSON object.
   */
  toJSON(): MajikMoneyJSON {
    return {
      __type: "MajikMoney",
      amount: this.amount.toString(),
      currency: this.currency.code,
    };
  }

  /**
   * Formats the money amount according to a specified locale using `Intl.NumberFormat`.
   *
   * @param {string} [locale="en-PH"] - The locale string (e.g., "en-US", "en-PH").
   * @returns {string} The localized currency string.
   */
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

  /**
   * Adds another MajikMoney instance to this one.
   *
   * @param {MajikMoney} other - The money instance to add.
   * @returns {MajikMoney} A new MajikMoney instance representing the sum.
   * @throws {Error} If the currencies do not match.
   */
  add(other: MajikMoney): MajikMoney {
    this.assertSameCurrency(other);
    return new MajikMoney(this.amount.add(other.amount), this.currency);
  }

  /**
   * Subtracts another MajikMoney instance from this one, optionally clamping the result.
   *
   * @param {MajikMoney} other - The money instance to subtract.
   * @param {number} [min] - The optional minimum minor value to clamp the result to.
   * @param {number} [max] - The optional maximum minor value to clamp the result to.
   * @returns {MajikMoney} A new MajikMoney instance representing the difference.
   * @throws {Error} If the currencies do not match.
   */
  subtract(other: MajikMoney, min?: number, max?: number): MajikMoney {
    this.assertSameCurrency(other);

    let result = this.amount.sub(other.amount);

    if (min !== undefined) result = Decimal.max(result, new Decimal(min));
    if (max !== undefined) result = Decimal.min(result, new Decimal(max));

    return new MajikMoney(result, this.currency);
  }

  /**
   * Multiplies the amount by a specified factor.
   *
   * @param {Decimal.Value} factor - The multiplier.
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode to use for minor units.
   * @returns {MajikMoney} A new MajikMoney instance representing the product.
   * @throws {Error} If the factor is not finite.
   */
  multiply(
    factor: Decimal.Value,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    const dFactor = new Decimal(factor);
    if (!dFactor.isFinite()) throw new Error("Factor must be finite");
    const result = this.amount.mul(dFactor);
    return new MajikMoney(result.toDecimalPlaces(0, rounding), this.currency);
  }

  /**
   * Divides the amount by a specified divisor.
   *
   * @param {Decimal.Value} divisor - The number to divide by.
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode to use for minor units.
   * @returns {MajikMoney} A new MajikMoney instance representing the quotient.
   * @throws {Error} If the divisor is zero or not finite.
   */
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

  /**
   * Multiplies the amount by a factor and returns the raw Decimal minor unit.
   *
   * @param {Decimal.Value} factor - The multiplier.
   * @returns {Decimal} The unrounded product as a Decimal minor unit.
   * @throws {Error} If the factor is not finite.
   */
  multiplyDecimal(factor: Decimal.Value): Decimal {
    const dFactor = new Decimal(factor);
    if (!dFactor.isFinite()) throw new Error("Factor must be finite");
    return this.amount.mul(dFactor);
  }

  /**
   * Divides the amount by a divisor and returns the raw Decimal minor unit.
   *
   * @param {Decimal.Value} divisor - The number to divide by.
   * @returns {Decimal} The unrounded quotient as a Decimal minor unit.
   * @throws {Error} If the divisor is zero or not finite.
   */
  divideDecimal(divisor: Decimal.Value): Decimal {
    const d = new Decimal(divisor);
    if (!d.isFinite()) throw new Error("Divisor must be finite");
    if (d.isZero()) throw new Error("Cannot divide MajikMoney by zero");
    return this.amount.div(d);
  }

  /**
   * Divides a provided dividend by this money's major amount.
   * Useful for finding exchange rates or unit sizes.
   *
   * @param {Decimal.Value} dividend - The number to divide by this money's major amount.
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} A new MajikMoney instance.
   * @throws {Error} If the dividend is infinite or if this amount is zero.
   */
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

  /**
   * Calculates the numerical ratio of this money amount to another.
   *
   * @param {MajikMoney} other - The money instance to divide by.
   * @returns {number} The resulting ratio as a native number.
   * @throws {Error} If currencies mismatch or if the other amount is zero.
   */
  ratio(other: MajikMoney): number {
    this.assertSameCurrency(other);
    if (other.amount.isZero()) {
      throw new Error("Division by zero in MajikMoney.ratio()");
    }
    return this.amount.div(other.amount).toNumber();
  }

  /**
   * Compounds the amount over a number of periods at a specific rate.
   * Formula: Amount * (1 + rate) ^ periods
   *
   * @param {Decimal.Value} rate - The compound rate per period (e.g., 0.05 for 5%).
   * @param {number} periods - The number of periods to compound.
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} The compounded MajikMoney amount.
   * @throws {Error} If the rate is not finite.
   */
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

  /**
   * Calculates a percentage of the current amount.
   *
   * @param {Decimal.Value} rate - The percentage rate as a decimal (e.g., 0.1 for 10%).
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} A new MajikMoney instance representing the percentage fraction.
   * @throws {Error} If the rate is not finite.
   */
  percentage(
    rate: Decimal.Value,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    const dRate = new Decimal(rate);
    if (!dRate.isFinite()) throw new Error("Rate must be finite");
    return this.multiply(dRate, rounding);
  }

  /**
   * Alias for `percentage()`. Calculates a percentage of the current amount.
   *
   * @param {Decimal.Value} rate - The percentage rate as a decimal (e.g., 0.1 for 10%).
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} A new MajikMoney instance representing the percentage fraction.
   */
  applyPercentage(
    rate: Decimal.Value,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    return this.percentage(rate, rounding);
  }

  /**
   * Adds a percentage of the amount to the base amount.
   *
   * @param {Decimal.Value} rate - The percentage rate as a decimal (e.g., 0.1 for 10%).
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} The increased MajikMoney instance.
   */
  addPercentage(
    rate: Decimal.Value,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    return this.add(this.percentage(rate, rounding));
  }

  /**
   * Subtracts a percentage of the amount from the base amount.
   *
   * @param {Decimal.Value} rate - The percentage rate as a decimal (e.g., 0.1 for 10%).
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} The decreased MajikMoney instance.
   */
  subtractPercentage(
    rate: Decimal.Value,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    return this.subtract(this.percentage(rate, rounding));
  }

  /**
   * Calculates the original amount before a percentage was added (Reverse Margin/Tax).
   * Formula: Amount / (1 + rate)
   *
   * @param {Decimal.Value} rate - The rate that was previously applied (e.g., 0.2 for 20%).
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} The original MajikMoney instance before the rate was added.
   * @throws {Error} If 1 + rate evaluates to zero.
   */
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

  /**
   * Calculates what percentage this amount is of a given total.
   *
   * @param {MajikMoney} total - The total money instance to compare against.
   * @returns {Decimal} The percentage (e.g., returns 50 for 50%).
   * @throws {Error} If the currencies do not match or the total is zero.
   */
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

  /**
   * Calculates the final price after applying a discount rate.
   *
   * @param {Decimal.Value} rate - The discount rate (e.g., 0.2 for 20% off).
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} The discounted price.
   */
  discount(rate: Decimal.Value, rounding?: Decimal.Rounding): MajikMoney {
    return this.subtractPercentage(rate, rounding ?? Decimal.ROUND_HALF_EVEN);
  }

  /**
   * Calculates the monetary value of a discount based on a rate.
   *
   * @param {Decimal.Value} rate - The discount rate (e.g., 0.2 for 20% off).
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} The monetary amount of the discount.
   */
  discountAmount(rate: Decimal.Value, rounding?: Decimal.Rounding): MajikMoney {
    return this.percentage(rate, rounding ?? Decimal.ROUND_HALF_EVEN);
  }

  /**
   * Calculates the final price after adding a markup rate.
   *
   * @param {Decimal.Value} rate - The markup rate (e.g., 0.25 for 25% markup).
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} The marked-up price.
   */
  markup(rate: Decimal.Value, rounding?: Decimal.Rounding): MajikMoney {
    return this.addPercentage(rate, rounding ?? Decimal.ROUND_HALF_EVEN);
  }

  /**
   * Calculates the monetary value of the markup based on a rate.
   *
   * @param {Decimal.Value} rate - The markup rate (e.g., 0.25 for 25% markup).
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} The monetary amount of the markup.
   */
  markupAmount(rate: Decimal.Value, rounding?: Decimal.Rounding): MajikMoney {
    return this.percentage(rate, rounding ?? Decimal.ROUND_HALF_EVEN);
  }

  // ---------------------------------------------------------------------------
  // 🧾 Tax / fee mathematics
  // ---------------------------------------------------------------------------

  /**
   * Calculates the tax amount applied to a tax-exclusive base.
   *
   * @param {Decimal.Value} rate - The tax rate (e.g., 0.12 for 12% tax).
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} The computed tax amount.
   */
  tax(rate: Decimal.Value, rounding?: Decimal.Rounding): MajikMoney {
    return this.percentage(rate, rounding ?? Decimal.ROUND_HALF_EVEN);
  }

  /**
   * Calculates the total price including tax, given a tax-exclusive base.
   *
   * @param {Decimal.Value} rate - The tax rate (e.g., 0.12 for 12% tax).
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} The tax-inclusive price.
   */
  taxInclusive(rate: Decimal.Value, rounding?: Decimal.Rounding): MajikMoney {
    return this.addPercentage(rate, rounding ?? Decimal.ROUND_HALF_EVEN);
  }

  /**
   * Calculates the base price before tax, given a tax-inclusive total.
   *
   * @param {Decimal.Value} rate - The tax rate that was applied (e.g., 0.12 for 12% tax).
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} The tax-exclusive base price.
   */
  taxExclusive(rate: Decimal.Value, rounding?: Decimal.Rounding): MajikMoney {
    return this.removePercentage(rate, rounding ?? Decimal.ROUND_HALF_EVEN);
  }

  /**
   * Calculates the standalone tax component isolated from a tax-inclusive total.
   *
   * @param {Decimal.Value} rate - The tax rate that was applied (e.g., 0.12 for 12% tax).
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} The isolated tax amount.
   */
  taxComponent(
    rate: Decimal.Value,
    rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN,
  ): MajikMoney {
    return this.subtract(this.taxExclusive(rate, rounding));
  }

  /**
   * Calculates the amount of a percentage-based fee.
   *
   * @param {Decimal.Value} rate - The fee rate (e.g., 0.05 for 5% fee).
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} The computed fee amount.
   */
  feePercentage(rate: Decimal.Value, rounding?: Decimal.Rounding): MajikMoney {
    return this.percentage(rate, rounding ?? Decimal.ROUND_HALF_EVEN);
  }

  /**
   * Adds a flat fee amount to the current money instance.
   *
   * @param {MajikMoney} flatFee - The fixed fee to add.
   * @returns {MajikMoney} The total price including the flat fee.
   */
  feeAmount(flatFee: MajikMoney): MajikMoney {
    return this.add(flatFee);
  }

  // ---------------------------------------------------------------------------
  // 🧩 Allocation
  // ---------------------------------------------------------------------------

  /**
   * Distributes the money amount among multiple parties according to a list of ratios.
   * Ensures no pennies are lost or gained due to rounding by applying the remainder to the final portion.
   *
   * @param {number[]} ratios - An array of relative non-negative numeric weights.
   * @returns {MajikMoney[]} An array of MajikMoney instances representing the split portions.
   * @throws {Error} If the ratios array is empty, contains invalid values, or sums to zero.
   */
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

  /**
   * Distributes the money amount based on specific percentages that must sum to 100%.
   *
   * @param {number[]} percentages - An array of percentages (e.g., [50, 25, 25]).
   * @param {number} [tolerance=0.01] - The maximum allowed deviation from exactly 100 for the sum of percentages.
   * @returns {MajikMoney[]} An array of MajikMoney instances representing the allocations.
   * @throws {Error} If percentages do not sum to 100 within the given tolerance.
   */
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

  /**
   * Splits the money equally into a designated number of parts.
   *
   * @param {number} parts - The number of equal parts to split into.
   * @returns {MajikMoney[]} An array of MajikMoney instances, correcting any penny discrepancies on the final part.
   * @throws {Error} If parts is not a finite, positive integer.
   */
  evenSplit(parts: number): MajikMoney[] {
    if (!Number.isFinite(parts) || parts <= 0 || !Number.isInteger(parts)) {
      throw new Error("Number of parts must be > 0");
    }
    return this.allocate(Array(parts).fill(1));
  }

  // ---------------------------------------------------------------------------
  // 🔁 Rounding
  // ---------------------------------------------------------------------------

  /**
   * Rounds the money amount to the nearest major unit base based on the provided mode.
   *
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode to use.
   * @returns {MajikMoney} The rounded MajikMoney instance.
   */
  round(rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN): MajikMoney {
    const roundedMajor = this.toMajorDecimal().toDecimalPlaces(0, rounding);
    return MajikMoney.fromMajor(roundedMajor, this.currency.code, rounding);
  }

  /**
   * Rounds the major unit amount to the nearest multiple of a specified increment.
   *
   * @param {Decimal.Value} increment - The increment step to round to (e.g., 0.05).
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} The nearest rounded MajikMoney instance.
   * @throws {Error} If the increment is less than or equal to zero.
   */
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

  /**
   * Rounds the money to the currency's specific cash-rounding increment (e.g., nearest 5 cents).
   * Falls back to the smallest minor unit if the currency lacks a configured cash increment.
   *
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} The cash-rounded MajikMoney instance.
   */
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

  /**
   * Checks if this amount is strictly equal to another amount and currency.
   *
   * @param {MajikMoney} other - The money instance to compare against.
   * @returns {boolean} True if both the currency and minor unit amount are identical.
   */
  equals(other: MajikMoney): boolean {
    return (
      this.currency.code === other.currency.code &&
      this.amount.equals(other.amount)
    );
  }

  /**
   * Checks if this amount equals another within a specific minor unit tolerance.
   *
   * @param {MajikMoney} other - The money instance to compare against.
   * @param {number} [toleranceMinorUnits=0] - The maximum allowed absolute difference in minor units.
   * @returns {boolean} True if the absolute difference is less than or equal to the tolerance.
   * @throws {Error} If the currencies do not match.
   */
  equalsWithin(other: MajikMoney, toleranceMinorUnits: number = 0): boolean {
    this.assertSameCurrency(other);
    return this.amount.sub(other.amount).abs().lte(toleranceMinorUnits);
  }

  /**
   * Compares this amount to another, returning -1, 0, or 1.
   *
   * @param {MajikMoney} other - The money instance to compare.
   * @returns {-1 | 0 | 1} -1 if less, 0 if equal, 1 if greater.
   * @throws {Error} If the currencies do not match.
   */
  compare(other: MajikMoney): -1 | 0 | 1 {
    this.assertSameCurrency(other);
    if (this.amount.lt(other.amount)) return -1;
    if (this.amount.gt(other.amount)) return 1;
    return 0;
  }

  /**
   * Determines if this amount is strictly greater than another.
   *
   * @param {MajikMoney} other - The money instance to compare.
   * @returns {boolean} True if greater than.
   * @throws {Error} If the currencies do not match.
   */
  greaterThan(other: MajikMoney): boolean {
    this.assertSameCurrency(other);
    return this.amount.gt(other.amount);
  }

  /**
   * Determines if this amount is greater than or equal to another.
   *
   * @param {MajikMoney} other - The money instance to compare.
   * @returns {boolean} True if greater than or equal to.
   * @throws {Error} If the currencies do not match.
   */
  greaterThanOrEqual(other: MajikMoney): boolean {
    this.assertSameCurrency(other);
    return this.amount.gte(other.amount);
  }

  /**
   * Determines if this amount is strictly less than another.
   *
   * @param {MajikMoney} other - The money instance to compare.
   * @returns {boolean} True if less than.
   * @throws {Error} If the currencies do not match.
   */
  lessThan(other: MajikMoney): boolean {
    this.assertSameCurrency(other);
    return this.amount.lt(other.amount);
  }

  /**
   * Determines if this amount is less than or equal to another.
   *
   * @param {MajikMoney} other - The money instance to compare.
   * @returns {boolean} True if less than or equal to.
   * @throws {Error} If the currencies do not match.
   */
  lessThanOrEqual(other: MajikMoney): boolean {
    this.assertSameCurrency(other);
    return this.amount.lte(other.amount);
  }

  // ---------------------------------------------------------------------------
  // ➖➕ Sign
  // ---------------------------------------------------------------------------

  /**
   * Checks if the amount equals zero.
   *
   * @returns {boolean} True if zero.
   */
  isZero(): boolean {
    return this.amount.isZero();
  }

  /**
   * Checks if the amount is strictly greater than zero.
   *
   * @returns {boolean} True if positive.
   */
  isPositive(): boolean {
    return this.amount.gt(0);
  }

  /**
   * Checks if the amount is strictly less than zero.
   *
   * @returns {boolean} True if negative.
   */
  isNegative(): boolean {
    return this.amount.lt(0);
  }

  /**
   * Checks if the amount is less than or equal to zero.
   *
   * @returns {boolean} True if non-positive.
   */
  isNonPositive(): boolean {
    return this.amount.lte(0);
  }

  /**
   * Checks if the amount is greater than or equal to zero.
   *
   * @returns {boolean} True if non-negative.
   */
  isNonNegative(): boolean {
    return this.amount.gte(0);
  }

  /**
   * Returns the numerical sign of the amount.
   *
   * @returns {-1 | 0 | 1} -1 for negative, 0 for zero, 1 for positive.
   */
  sign(): -1 | 0 | 1 {
    if (this.amount.isZero()) return 0;
    return this.amount.isNegative() ? -1 : 1;
  }

  /**
   * Returns a new MajikMoney instance with the sign inverted.
   *
   * @returns {MajikMoney} The negated money instance.
   */
  negate(): MajikMoney {
    return new MajikMoney(this.amount.neg(), this.currency);
  }

  /**
   * Returns a new MajikMoney instance taking the absolute value.
   *
   * @returns {MajikMoney} The absolute value money instance.
   */
  abs(): MajikMoney {
    return new MajikMoney(this.amount.abs(), this.currency);
  }

  // ---------------------------------------------------------------------------
  // 📏 Bounds
  // ---------------------------------------------------------------------------

  /**
   * Returns the lesser of this instance or the provided instance.
   *
   * @param {MajikMoney} other - The money instance to compare against.
   * @returns {MajikMoney} The instance with the smaller monetary amount.
   * @throws {Error} If the currencies do not match.
   */
  min(other: MajikMoney): MajikMoney {
    this.assertSameCurrency(other);
    return this.lessThanOrEqual(other) ? this : other;
  }

  /**
   * Returns the greater of this instance or the provided instance.
   *
   * @param {MajikMoney} other - The money instance to compare against.
   * @returns {MajikMoney} The instance with the larger monetary amount.
   * @throws {Error} If the currencies do not match.
   */
  max(other: MajikMoney): MajikMoney {
    this.assertSameCurrency(other);
    return this.greaterThanOrEqual(other) ? this : other;
  }

  /**
   * Restricts this amount between a given minimum and maximum MajikMoney value.
   *
   * @param {MajikMoney} min - The lowest permissible bound.
   * @param {MajikMoney} max - The highest permissible bound.
   * @returns {MajikMoney} The clamped MajikMoney instance.
   * @throws {Error} If currencies mismatch or if min is greater than max.
   */
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

  /**
   * Checks if this instance and another share the exact same currency code.
   *
   * @param {MajikMoney} other - The money instance to check against.
   * @returns {boolean} True if both have the same currency.
   */
  isSameCurrency(other: MajikMoney): boolean {
    return this.currency.code === other.currency.code;
  }

  /**
   * Converts this money amount to a new currency using a direct exchange rate.
   *
   * @param {Decimal.Value} rate - The exchange rate multiplier.
   * @param {CurrencyDefinition} targetCurrency - The target currency definition to convert into.
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} The converted MajikMoney instance in the new currency.
   * @throws {Error} If the conversion rate is not finite.
   */
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

  /**
   * Converts this money amount to a new currency using an inversely quoted exchange rate.
   *
   * @param {Decimal.Value} quotedRate - The inverse exchange rate (divisor).
   * @param {CurrencyDefinition} targetCurrency - The target currency definition to convert into.
   * @param {Decimal.Rounding} [rounding=Decimal.ROUND_HALF_EVEN] - The rounding mode.
   * @returns {MajikMoney} The converted MajikMoney instance in the new currency.
   * @throws {Error} If the quoted rate is zero or not finite.
   */
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

  /**
   * Calculates the aggregate sum of an array of MajikMoney instances.
   *
   * @param {MajikMoney[]} values - An array of money instances to sum up.
   * @returns {MajikMoney} The aggregated total.
   * @throws {Error} If the array is empty or if the items possess mixed currencies.
   */
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

  /**
   * Calculates the arithmetic mean (average) of an array of MajikMoney instances.
   *
   * @param {MajikMoney[]} values - An array of money instances to average.
   * @returns {MajikMoney} The calculated mean.
   * @throws {Error} If the array is empty or if the items possess mixed currencies.
   */
  static average(values: MajikMoney[]): MajikMoney {
    return MajikMoney.sum(values).divide(values.length);
  }

  /**
   * Calculates the weighted average from an array of MajikMoney instances and their corresponding weights.
   *
   * @param {MajikMoney[]} values - An array of money instances to average.
   * @param {number[]} weights - An array of numeric weights corresponding directly to the values array.
   * @returns {MajikMoney} The weighted average.
   * @throws {Error} If the arrays are empty, if array lengths mismatch, if currencies are mixed, or if total weight is zero.
   */
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

  /**
   * Identifies the median value from an array of MajikMoney instances.
   * If the array has an even length, it returns the average of the two middle elements.
   *
   * @param {MajikMoney[]} values - An array of money instances.
   * @returns {MajikMoney} The median value.
   * @throws {Error} If the array is empty or if the items possess mixed currencies.
   */
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

  /**
   * Finds the minimum (smallest) amount in an array of MajikMoney instances.
   *
   * @param {MajikMoney[]} values - An array of money instances.
   * @returns {MajikMoney} The lowest value.
   * @throws {Error} If the array is empty or if the items possess mixed currencies.
   */
  static min(values: MajikMoney[]): MajikMoney {
    if (values.length === 0) throw new Error("No values provided");
    return values.reduce((prev, curr) => prev.min(curr));
  }

  /**
   * Finds the maximum (largest) amount in an array of MajikMoney instances.
   *
   * @param {MajikMoney[]} values - An array of money instances.
   * @returns {MajikMoney} The highest value.
   * @throws {Error} If the array is empty or if the items possess mixed currencies.
   */
  static max(values: MajikMoney[]): MajikMoney {
    if (values.length === 0) throw new Error("No values provided");
    return values.reduce((prev, curr) => prev.max(curr));
  }

  /**
   * Calculates the population variance of a set of MajikMoney amounts.
   *
   * @param {MajikMoney[]} values - An array of money instances.
   * @returns {MajikMoney} The variance represented as a MajikMoney instance.
   * @throws {Error} If the array is empty or if the items possess mixed currencies.
   */
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

  /**
   * Calculates the population standard deviation of a set of MajikMoney amounts.
   *
   * @param {MajikMoney[]} values - An array of money instances.
   * @returns {MajikMoney} The standard deviation represented as a MajikMoney instance.
   * @throws {Error} If the array is empty or if the items possess mixed currencies.
   */
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

  /**
   * Asserts that another MajikMoney instance has the same currency as this instance.
   *
   * @private
   * @param {MajikMoney} other - The money instance to check against.
   * @throws {Error} If the currencies do not strictly match.
   */
  private assertSameCurrency(other: MajikMoney) {
    if (this.currency.code !== other.currency.code) {
      throw new Error(
        `Currency mismatch: ${this.currency.code} vs ${other.currency.code}`,
      );
    }
  }
}

/**
 * Deeply traverses an object or array to serialize all MajikMoney instances into JSON format.
 *
 * @param {any} obj - The deeply nested object, array, or primitive containing MajikMoney objects.
 * @returns {any} A structurally identical object/array where all money instances are mapped to `MajikMoneyJSON`.
 */
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

/**
 * Deeply traverses an object or array to deserialize JSON representations of money back into MajikMoney instances.
 *
 * @param {any} obj - The object or array containing structured JSON with `__type: "MajikMoney"`.
 * @returns {any} A structurally identical object/array with rehydrated MajikMoney class instances.
 */
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

// Freeze static methods
Object.freeze(MajikMoney);

// Freeze instance methods
Object.freeze(MajikMoney.prototype);
