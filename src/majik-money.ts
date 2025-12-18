import Decimal from 'decimal.js';
import { CURRENCIES, CurrencyDefinition } from './currency';


/**
 * Configure Decimal for consistent behaviour across the library.
 * - precision high enough for financial calculations
 * - rounding uses ROUND_HALF_EVEN (bankers rounding)
 */
Decimal.set({
    precision: 40,
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
 * - Provides factory methods, conversions, allocation, and FX conversion.
 * 
 * @example
 * ```ts
 * const price = new MajikMoney(123_45, CURRENCIES['PHP']); // ₱123.45
 * const total = price.add(MajikMoney.fromMajor(50, 'PHP'));
 * console.log(total.format()); // "₱173.45"
 * ```
 */
export class MajikMoney {
    /**
    * Internal minor units (integer) for precise calculations.
    * Use {@link toMajor} or {@link format} for human-readable values.
    * @private
    */
    private readonly amount: Decimal;

    /**
     * ISO 4217 currency definition for this instance.
     * Immutable after construction.
     */
    readonly currency: CurrencyDefinition;

    /**
     * Create a MajikMoney instance.
     * @param amount - Numeric value in minor units or any Decimal-compatible input.
     * @param currency - Currency definition. Defaults to PHP.
     */
    constructor(
        amount: Decimal.Value,
        currency: CurrencyDefinition = CURRENCIES['PHP']
    ) {
        this.amount = new Decimal(amount).toDecimalPlaces(0);
        this.currency = currency;
    }

    // ---------------------------------------------------------------------------
    // Factory helpers
    // ---------------------------------------------------------------------------

    /**
     * Build a `MajikMoney` instance from minor units (e.g., centavos).
     * @param minor - Value in minor units.
     * @param currencyCode - ISO 4217 currency code.
     * @returns New `MajikMoney` instance.
     */
    static fromMinor(
        minor: Decimal.Value,
        currencyCode: string
    ): MajikMoney {
        const currency = CURRENCIES[currencyCode];
        return new MajikMoney(minor, currency);
    }

    /**
     * Build a `MajikMoney` instance from major units (e.g., pesos).
     * @param amount - Numeric value in major units.
     * @param currencyCode - ISO 4217 currency code.
     * @param rounding - Rounding mode for conversion to minor units. Default: `ROUND_HALF_EVEN`.
     * @returns New `MajikMoney` instance.
     * @throws Error if the currency code is unsupported.
     */
    static fromMajor(
        amount: Decimal.Value,
        currencyCode: string,
        rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN
    ): MajikMoney {
        const currency = CURRENCIES[currencyCode];
        if (!currency) throw new Error('Unsupported currency');

        const factor = new Decimal(10).pow(currency.minorUnits);
        const minor = new Decimal(amount).mul(factor);

        return new MajikMoney(
            minor.toDecimalPlaces(0, rounding),
            currency
        );
    }


    /**
     * Parse a `MajikMoney` instance from a plain object.
     * Useful for JSON deserialization.
     * @param data - Object containing `amount` and `currency`.
     * @returns New `MajikMoney` instance.
     * @throws Error if currency is missing or unsupported.
     */
    static parseFromJSON(data: MajikMoneyJSON): MajikMoney {

        if (typeof data.currency !== 'string') {
            throw new Error('Invalid currency type. Expected string.');
        }

        const currency = CURRENCIES[data.currency];
        if (!currency) throw new Error(`Unsupported currency ${data.currency}`);
        return new MajikMoney(data.amount, currency);
    }


    // ---------------------------------------------------------------------------
    // Conversions
    // ---------------------------------------------------------------------------

    /**
     * Convert to major units (human-readable numeric).
     * @returns Amount in major units (e.g., pesos/dollars).
     */
    toMajor(): number {
        return this.amount
            .div(new Decimal(10).pow(this.currency.minorUnits))
            .toNumber();
    }

    /**
     * Convert to major units as a Decimal (preserves precision).
     * @returns Decimal representation in major units.
     */
    toMajorDecimal(): Decimal {
        return this.amount.div(new Decimal(10).pow(this.currency.minorUnits));
    }

    /**
     * Convert to minor units (integer, e.g., centavos).
     * @returns Amount in minor units.
     */
    toMinor(): number {
        return this.amount.toNumber();
    }

    /**
     * Format as a localized currency string.
     * @param locale - Optional locale string, default `'en-PH'`.
     * @returns Localized string (e.g., "PHP 1,234.56").
     */
    format(locale = 'en-PH'): string {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: this.currency.code,
            minimumFractionDigits: this.currency.minorUnits,
            maximumFractionDigits: this.currency.minorUnits,
        }).format(this.toMajor());
    }

    // ---------------------------------------------------------------------------
    // ➕ Arithmetic (immutable)
    // ---------------------------------------------------------------------------

    /** Add another `MajikMoney` instance of the same currency. */
    add(other: MajikMoney): MajikMoney {
        this.assertSameCurrency(other);
        return new MajikMoney(this.amount.add(other.amount), this.currency);
    }

    /** Subtract another `MajikMoney` instance of the same currency. */
    subtract(other: MajikMoney): MajikMoney {
        this.assertSameCurrency(other);
        return new MajikMoney(this.amount.sub(other.amount), this.currency);
    }

    /**
     * Multiply by a numeric factor (arbitrary precision).
     * @param factor - Multiplier.
     * @param rounding - Rounding mode for minor units.
     */
    multiply(factor: Decimal.Value, rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN): MajikMoney {
        const result = this.amount.mul(factor);
        return new MajikMoney(result.toDecimalPlaces(0, rounding), this.currency);
    }

    /**
   * Multiply this amount by a Decimal factor WITHOUT rounding.
   * Intended for analytical / mathematical use (e.g., discounting).
   * @param factor - Multiplier.
   * @returns Decimal result in minor units.
   */
    multiplyDecimal(factor: Decimal.Value): Decimal {
        return this.amount.mul(factor);
    }

    /**
     * Divide by a numeric divisor.
     * @param divisor - Number to divide by.
     * @param rounding - Rounding mode for minor units.
     */
    divide(divisor: Decimal.Value, rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN): MajikMoney {
        const result = this.amount.div(divisor);
        return new MajikMoney(result.toDecimalPlaces(0, rounding), this.currency);
    }

    /**
    * Inverted division: divides a scalar by this monetary amount.
    * This is an algebraic helper, NOT a unit-safe economic operation.
    *
    * Example:
    * ₱100.invertDivide(2) = ₱0.02
    *
    * @param dividend - Numeric value to divide by this amount.
    * @param rounding - Rounding mode for minor units.
    * @returns New MajikMoney instance.
    * @throws Error if amount is zero.
    */
    invertDivide(
        dividend: Decimal.Value,
        rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN
    ): MajikMoney {

        // use major units to compute the proportion correctly
        const majorThis = this.toMajorDecimal();
        if (majorThis.isZero()) {
            throw new Error("Cannot divide by zero money amount");
        }

        const resultMajor = new Decimal(dividend).div(majorThis);
        // return as MajikMoney with major value resultMajor
        return MajikMoney.fromMajor(resultMajor, this.currency.code, rounding);
    }

    /**
    * Divide this amount by a Decimal divisor WITHOUT rounding.
    * @param divisor - Divisor.
    * @returns Decimal result in minor units.
    */
    divideDecimal(divisor: Decimal.Value): Decimal {
        return this.amount.div(divisor);
    }


    /**
   * Divide by another MajikMoney to produce a unitless ratio.
   * @param other - Another MajikMoney instance (same currency).
   * @returns Unitless ratio as a number.
   * @throws Error if currencies mismatch or divisor is zero.
   */
    ratio(other: MajikMoney): number {
        this.assertSameCurrency(other);
        if (other.amount.isZero()) {
            throw new Error("Division by zero in MajikMoney.ratio()");
        }
        return this.amount.div(other.amount).toNumber();
    }


    /** Check equality of amount and currency. */
    equals(other: MajikMoney): boolean {
        return this.currency.code === other.currency.code && this.amount.equals(other.amount);
    }

    /** Check if amount is zero. */
    isZero(): boolean {
        return this.amount.isZero();
    }

    /** Check if amount is positive. */
    isPositive(): boolean {
        return this.amount.gt(0);
    }

    /** Check if amount is negative. */
    isNegative(): boolean {
        return this.amount.lt(0);
    }

    /** Negate the amount (returns new instance). */
    negate(): MajikMoney {
        return new MajikMoney(this.amount.neg(), this.currency);
    }

    /** Absolute value of the amount. */
    abs(): MajikMoney {
        return new MajikMoney(this.amount.abs(), this.currency);
    }

    /** Compare if greater than another instance. */
    greaterThan(other: MajikMoney): boolean {
        this.assertSameCurrency(other);
        return this.amount.gt(other.amount);
    }


    /**
     * Check if this amount is less than another `MajikMoney` instance.
     * @param other - Another `MajikMoney` instance to compare against.
     * @returns `true` if this amount is less than the other, otherwise `false`.
     * @throws Error if currencies do not match.
     */
    lessThan(other: MajikMoney): boolean {
        this.assertSameCurrency(other);
        return this.amount.lt(other.amount);
    }

    /**
     * Check if this amount is greater than or equal to another `MajikMoney` instance.
     * @param other - Another `MajikMoney` instance to compare against.
     * @returns `true` if this amount is greater than or equal to the other, otherwise `false`.
     * @throws Error if currencies do not match.
     */
    greaterThanOrEqual(other: MajikMoney): boolean {
        this.assertSameCurrency(other);
        return this.amount.gte(other.amount);
    }

    /**
     * Check if this amount is less than or equal to another `MajikMoney` instance.
     * @param other - Another `MajikMoney` instance to compare against.
     * @returns `true` if this amount is less than or equal to the other, otherwise `false`.
     * @throws Error if currencies do not match.
     */
    lessThanOrEqual(other: MajikMoney): boolean {
        this.assertSameCurrency(other);
        return this.amount.lte(other.amount);
    }

    /**
     * Apply a percentage to this amount.
     * Useful for calculating interest, tax, or commission.
     * @param rate - Percentage as a decimal (e.g., 0.05 for 5%).
     * @param rounding - Rounding mode for minor units. Default is `ROUND_HALF_EVEN`.
     * @returns New `MajikMoney` instance representing the percentage-applied amount.
     */
    applyPercentage(rate: Decimal.Value, rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN): MajikMoney {
        return this.multiply(rate, rounding);
    }

    /**
     * Add a percentage of this amount to itself.
     * Useful for calculating tax-inclusive totals or markup.
     * @param rate - Percentage as a decimal (e.g., 0.05 for 5%).
     * @param rounding - Rounding mode for minor units. Default is `ROUND_HALF_EVEN`.
     * @returns New `MajikMoney` instance representing the amount after adding the percentage.
     */
    addPercentage(rate: Decimal.Value, rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN): MajikMoney {
        return this.add(this.multiply(rate, rounding));
    }

    /**
     * Subtract a percentage of this amount from itself.
     * Useful for discounts or tax deductions.
     * @param rate - Percentage as a decimal (e.g., 0.05 for 5%).
     * @param rounding - Rounding mode for minor units. Default is `ROUND_HALF_EVEN`.
     * @returns New `MajikMoney` instance representing the amount after subtracting the percentage.
     */
    subtractPercentage(rate: Decimal.Value, rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN): MajikMoney {
        return this.subtract(this.multiply(rate, rounding));
    }

    /**
     * Evenly split this amount into a specified number of parts.
     * Any remainder due to rounding is added to the last part.
     * @param parts - Number of equal parts to split the amount into.
     * @returns Array of `MajikMoney` instances representing each part.
     * @throws Error if `parts` is less than 1.
     */
    evenSplit(parts: number): MajikMoney[] {
        if (parts <= 0) throw new Error("Number of parts must be > 0");
        return this.allocate(Array(parts).fill(1));
    }

    /**
     * Calculate compound growth on this amount.
     * Useful for interest, investment growth, or financial projections.
     * @param rate - Growth rate per period as a decimal (e.g., 0.05 for 5%).
     * @param periods - Number of compounding periods.
     * @param rounding - Rounding mode for minor units. Default is `ROUND_HALF_EVEN`.
     * @returns New `MajikMoney` instance representing the compounded amount.
     */
    compound(rate: Decimal.Value, periods: number, rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN): MajikMoney {
        const factor = new Decimal(1).add(rate).pow(periods);
        return this.multiply(factor, rounding);
    }



    /**
     * Allocate the amount according to ratios.
     * Distributes remainder to the last element to avoid rounding loss.
     * @param ratios - Array of numbers representing relative weights.
     * @returns Array of allocated `MajikMoney` instances.
     */
    allocate(ratios: number[]): MajikMoney[] {
        const total = ratios.reduce((a, b) => a + b, 0);
        let remainder = this.amount;

        return ratios.map((ratio, i) => {
            const share = this.amount
                .mul(ratio)
                .div(total)
                .toDecimalPlaces(0, Decimal.ROUND_DOWN);

            remainder = remainder.sub(share);

            return new MajikMoney(i === ratios.length - 1 ? share.add(remainder) : share, this.currency);
        });
    }



    /**
     * Convert to another currency given a rate.
     * @param rate - Conversion rate (target per source unit).
     * @param targetCurrency - Target currency definition.
     * @param rounding - Rounding mode for minor units.
     */
    convert(rate: Decimal.Value, targetCurrency: CurrencyDefinition, rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN): MajikMoney {
        const majorSource = this.toMajor();
        const majorTarget = new Decimal(majorSource).mul(rate);
        return MajikMoney.fromMajor(majorTarget, targetCurrency.code, rounding);
    }

    /**
     * Convert using a quoted FX rate (source per 1 unit of target).
     * @param quotedRate - Quoted rate (source per target unit).
     * @param targetCurrency - Target currency definition.
     * @param rounding - Rounding mode for minor units.
     */
    convertFromQuoted(quotedRate: Decimal.Value, targetCurrency: CurrencyDefinition, rounding: Decimal.Rounding = Decimal.ROUND_HALF_EVEN): MajikMoney {
        const rate = new Decimal(1).div(quotedRate);
        return this.convert(rate, targetCurrency, rounding);
    }

    // ---------------------------------------------------------------------------
    // 📊 Extended Statistics (Static Helpers)
    // ---------------------------------------------------------------------------

    /**
     * Compute the sum of an array of `MajikMoney` instances.
     * @param values - Array of `MajikMoney` instances (must all be same currency).
     * @returns New `MajikMoney` instance representing the sum.
     * @throws Error if the array is empty or currencies mismatch.
     */
    static sum(values: MajikMoney[]): MajikMoney {
        if (values.length === 0) throw new Error("No values provided");
        const currency = values[0].currency;
        const total = values.reduce((acc, m) => {
            if (m.currency.code !== currency.code) throw new Error("Currency mismatch in sum");
            return acc.add(m);
        }, MajikMoney.fromMinor(0, currency.code));
        return total;
    }

    /**
     * Compute the arithmetic mean (average) of an array of `MajikMoney` instances.
     * @param values - Array of `MajikMoney` instances (must all be same currency).
     * @returns New `MajikMoney` instance representing the average.
     * @throws Error if the array is empty or currencies mismatch.
     */
    static average(values: MajikMoney[]): MajikMoney {
        return MajikMoney.sum(values).divide(values.length);
    }

    /**
     * Compute the weighted average of an array of `MajikMoney` instances.
     * @param values - Array of `MajikMoney` instances (must all be same currency).
     * @param weights - Array of numeric weights corresponding to `values`.
     * @returns New `MajikMoney` instance representing the weighted average.
     * @throws Error if lengths mismatch or currencies mismatch.
     */
    static weightedAverage(values: MajikMoney[], weights: number[]): MajikMoney {
        if (values.length === 0) throw new Error("No values provided");
        if (values.length !== weights.length) throw new Error("Values and weights length mismatch");

        const currency = values[0].currency;
        let totalWeight = 0;
        let weightedSum = MajikMoney.fromMinor(0, currency.code);

        values.forEach((value, i) => {
            if (value.currency.code !== currency.code) throw new Error("Currency mismatch in weightedAverage");
            weightedSum = weightedSum.add(value.multiply(weights[i]));
            totalWeight += weights[i];
        });

        return weightedSum.divide(totalWeight);
    }

    /**
     * Compute the median value of an array of `MajikMoney` instances.
     * @param values - Array of `MajikMoney` instances (must all be same currency).
     * @returns New `MajikMoney` instance representing the median.
     * @throws Error if the array is empty or currencies mismatch.
     */
    static median(values: MajikMoney[]): MajikMoney {
        if (values.length === 0) throw new Error("No values provided");

        const currency = values[0].currency;
        values.forEach((value) => {
            if (value.currency.code !== currency.code) {
                throw new Error("Currency mismatch in median");
            }
        });
        const sorted = [...values].sort((a, b) => a.toMinor() - b.toMinor());
        const mid = Math.floor(sorted.length / 2);

        if (sorted.length % 2 === 0) {
            return sorted[mid - 1].add(sorted[mid]).divide(2);
        } else {
            return sorted[mid];
        }
    }

    /**
     * Compute the minimum value in an array of `MajikMoney` instances.
     */
    static min(values: MajikMoney[]): MajikMoney {
        if (values.length === 0) throw new Error("No values provided");
        return values.reduce((prev, curr) => (prev.lessThan(curr) ? prev : curr));
    }

    /**
     * Compute the maximum value in an array of `MajikMoney` instances.
     */
    static max(values: MajikMoney[]): MajikMoney {
        if (values.length === 0) throw new Error("No values provided");
        return values.reduce((prev, curr) => (prev.greaterThan(curr) ? prev : curr));
    }

    /**
     * Compute the variance of an array of `MajikMoney` instances.
     * Uses population variance formula.
     * @param values - Array of `MajikMoney` instances (must all be same currency).
     */
    static variance(values: MajikMoney[]): MajikMoney {
        if (values.length === 0) throw new Error("No values provided");
        const mean = MajikMoney.average(values).toMajorDecimal();
        const currency = values[0].currency;
        const sumSquared = values.reduce((acc, m) => {
            const diff = m.toMajorDecimal().sub(mean);
            return acc.add(diff.mul(diff));
        }, new Decimal(0));

        const varianceMajor = sumSquared.div(values.length);
        return MajikMoney.fromMajor(varianceMajor, currency.code);
    }

    /**
     * Compute the standard deviation of an array of `MajikMoney` instances.
     * @param values - Array of `MajikMoney` instances (must all be same currency).
     */
    static standardDeviation(values: MajikMoney[]): MajikMoney {
        const varianceValue = MajikMoney.variance(values).toMajorDecimal();
        return MajikMoney.fromMajor(varianceValue.sqrt(), values[0].currency.code);
    }



    /**
      * Serialize instance to JSON.
      * @returns JSON object matching {@link MajikMoneyJSON}.
      */
    toJSON(): MajikMoneyJSON {
        return {
            __type: "MajikMoney",
            amount: this.amount.toString(),
            currency: this.currency.code
        };
    }

    // ---------------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------------

    /**
     * Assert both instances share the same currency.
     * @private
     * @throws Error if currencies mismatch.
     */
    private assertSameCurrency(other: MajikMoney) {
        if (this.currency.code !== other.currency.code) {
            throw new Error(`Currency mismatch: ${this.currency.code} vs ${other.currency.code}`);
        }
    }
}







/**
 * Recursively converts MajikMoney instances to JSON.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeMoney(obj: any): any {
    if (obj instanceof MajikMoney) {
        return obj.toJSON();
    }

    if (Array.isArray(obj)) {
        return obj.map(serializeMoney);
    }

    if (obj && typeof obj === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = {};
        for (const key of Object.keys(obj)) {
            result[key] = serializeMoney(obj[key]);
        }
        return result;
    }

    return obj; // primitive
}

/**
 * Recursively converts JSON representing MajikMoney into MajikMoney instances.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deserializeMoney(obj: any): any {
    if (obj && typeof obj === 'object' && obj.__type === 'MajikMoney') {
        return MajikMoney.parseFromJSON(obj as MajikMoneyJSON);
    }

    if (Array.isArray(obj)) {
        return obj.map(deserializeMoney);
    }

    if (obj && typeof obj === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = {};
        for (const key of Object.keys(obj)) {
            result[key] = deserializeMoney(obj[key]);
        }
        return result;
    }

    return obj; // primitive
}
