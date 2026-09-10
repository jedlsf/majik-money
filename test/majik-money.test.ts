import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";

import {
  MajikMoney,
  CURRENCIES,
  serializeMoney,
  deserializeMoney,
  MajikMoneyJSON,
} from "../src/index";

/**
 * Comprehensive financial regression suite for MajikMoney.
 *
 * Test philosophy:
 * - Verify public API behaviour.
 * - Verify monetary invariants.
 * - Verify immutability.
 * - Exercise positive, zero, negative, fractional, and large values.
 * - Exercise multiple currency minor-unit scales.
 * - Exercise rounding modes and boundary conditions.
 * - Verify serialization round-trips.
 * - Verify that invalid states are rejected where the API contract requires it.
 *
 * Some defensive-input tests intentionally expose hardening gaps in the
 * current implementation. Those should remain as regression tests while
 * the implementation is strengthened.
 */

describe("MajikMoney", () => {
  // ---------------------------------------------------------------------------
  // Test helpers
  // ---------------------------------------------------------------------------

  const usd = (major: Decimal.Value) => MajikMoney.fromMajor(major, "USD");
  const php = (major: Decimal.Value) => MajikMoney.fromMajor(major, "PHP");
  const eur = (major: Decimal.Value) => MajikMoney.fromMajor(major, "EUR");
  const jpy = (major: Decimal.Value) => MajikMoney.fromMajor(major, "JPY");
  const kwd = (major: Decimal.Value) => MajikMoney.fromMajor(major, "KWD");

  function expectMoney(
    money: MajikMoney,
    expectedMinor: string | number,
    currency: string,
  ) {
    expect(money.currency.code).toBe(currency);
    expect(money.toMinorString()).toBe(String(expectedMinor));
  }

  function expectSameMoney(a: MajikMoney, b: MajikMoney) {
    expect(a.currency.code).toBe(b.currency.code);
    expect(a.toMinorString()).toBe(b.toMinorString());
  }

  function sumMinor(values: MajikMoney[]): Decimal {
    return values.reduce(
      (sum, value) => sum.add(value.toMinorDecimal()),
      new Decimal(0),
    );
  }

  // ===========================================================================
  // Construction & initialization
  // ===========================================================================

  describe("Construction & Initialization", () => {
    it("uses PHP as the default currency", () => {
      const money = new MajikMoney(1000);

      expect(money.currency.code).toBe("PHP");
      expect(money.toMinor()).toBe(1000);
      expect(money.toMajor()).toBe(10);
    });

    it("accepts integer minor units", () => {
      const money = new MajikMoney(12345, CURRENCIES["USD"]);

      expectMoney(money, "12345", "USD");
    });

    it("accepts string Decimal-compatible input", () => {
      const money = new MajikMoney("12345", CURRENCIES["USD"]);

      expectMoney(money, "12345", "USD");
    });

    it("accepts Decimal input", () => {
      const money = new MajikMoney(new Decimal("12345"), CURRENCIES["USD"]);

      expectMoney(money, "12345", "USD");
    });

    it("rounds fractional minor units using ROUND_HALF_EVEN", () => {
      expect(new MajikMoney("1234.4", CURRENCIES["USD"]).toMinor()).toBe(1234);
      expect(new MajikMoney("1234.5", CURRENCIES["USD"]).toMinor()).toBe(1234);
      expect(new MajikMoney("1235.5", CURRENCIES["USD"]).toMinor()).toBe(1236);
      expect(new MajikMoney("1235.6", CURRENCIES["USD"]).toMinor()).toBe(1236);
    });

    it("rounds negative fractional minor units consistently", () => {
      expect(new MajikMoney("-1234.4", CURRENCIES["USD"]).toMinor()).toBe(
        -1234,
      );
      expect(new MajikMoney("-1234.5", CURRENCIES["USD"]).toMinor()).toBe(
        -1234,
      );
      expect(new MajikMoney("-1235.5", CURRENCIES["USD"]).toMinor()).toBe(
        -1236,
      );
    });

    it("preserves zero", () => {
      const money = new MajikMoney(0, CURRENCIES["USD"]);

      expect(money.toMinor()).toBe(0);
      expect(money.toMajor()).toBe(0);
      expect(money.isZero()).toBe(true);
      expect(money.sign()).toBe(0);
    });

    it("supports negative money", () => {
      const money = new MajikMoney(-1234, CURRENCIES["USD"]);

      expect(money.toMinor()).toBe(-1234);
      expect(money.toMajor()).toBe(-12.34);
      expect(money.isNegative()).toBe(true);
    });

    it("constructs equivalent values from number, string, and Decimal", () => {
      const fromNumber = new MajikMoney(12345, CURRENCIES["USD"]);
      const fromString = new MajikMoney("12345", CURRENCIES["USD"]);
      const fromDecimal = new MajikMoney(
        new Decimal("12345"),
        CURRENCIES["USD"],
      );

      expectSameMoney(fromNumber, fromString);
      expectSameMoney(fromString, fromDecimal);
    });

    it("retains the supplied currency definition", () => {
      const money = new MajikMoney(100, CURRENCIES["USD"]);

      expect(money.currency).toBe(CURRENCIES["USD"]);
    });

    it("does not mutate the original Decimal value during construction", () => {
      const input = new Decimal("1234.56");
      const before = input.toString();

      new MajikMoney(input, CURRENCIES["USD"]);

      expect(input.toString()).toBe(before);
    });
  });

  // ===========================================================================
  // Factory methods
  // ===========================================================================

  describe("Factory Methods", () => {
    describe("zero()", () => {
      it("creates zero in the requested currency", () => {
        const money = MajikMoney.zero("USD");

        expectMoney(money, "0", "USD");
        expect(money.isZero()).toBe(true);
      });

      it("works for zero-decimal currencies", () => {
        const money = MajikMoney.zero("JPY");

        expectMoney(money, "0", "JPY");
      });

      it("works for three-decimal currencies", () => {
        const money = MajikMoney.zero("KWD");

        expectMoney(money, "0", "KWD");
      });

      it("rejects unsupported currency codes", () => {
        expect(() => MajikMoney.zero("INVALID")).toThrow(
          "Unsupported currency",
        );
      });

      it("rejects empty currency codes", () => {
        expect(() => MajikMoney.zero("")).toThrow("Unsupported currency");
      });
    });

    describe("fromMinor()", () => {
      it("constructs from integer minor units", () => {
        const money = MajikMoney.fromMinor(2500, "USD");

        expectMoney(money, "2500", "USD");
        expect(money.toMajor()).toBe(25);
      });

      it("accepts Decimal-compatible strings", () => {
        const money = MajikMoney.fromMinor("2500", "USD");

        expectMoney(money, "2500", "USD");
      });

      it("supports negative minor units", () => {
        const money = MajikMoney.fromMinor(-2500, "USD");

        expectMoney(money, "-2500", "USD");
      });

      it("supports zero", () => {
        const money = MajikMoney.fromMinor(0, "USD");

        expect(money.isZero()).toBe(true);
      });

      it("rejects unsupported currencies", () => {
        expect(() => MajikMoney.fromMinor(2500, "ABC")).toThrow(
          "Unsupported currency ABC",
        );
      });
    });

    describe("fromMajor()", () => {
      it("converts USD major units to cents", () => {
        const money = MajikMoney.fromMajor(12.34, "USD");

        expectMoney(money, "1234", "USD");
        expect(money.toMajor()).toBe(12.34);
      });

      it("supports zero-decimal currencies", () => {
        const money = MajikMoney.fromMajor(1200, "JPY");

        expectMoney(money, "1200", "JPY");
        expect(money.toMajor()).toBe(1200);
      });

      it("supports three-decimal currencies", () => {
        const money = MajikMoney.fromMajor(1.234, "KWD");

        expectMoney(money, "1234", "KWD");
        expect(money.toMajor()).toBe(1.234);
      });

      it("rounds half-even when major units contain excess precision", () => {
        expectMoney(MajikMoney.fromMajor("10.505", "USD"), "1050", "USD");
        expectMoney(MajikMoney.fromMajor("10.515", "USD"), "1052", "USD");
      });

      it("supports ROUND_DOWN", () => {
        expectMoney(
          MajikMoney.fromMajor("10.509", "USD", Decimal.ROUND_DOWN),
          "1050",
          "USD",
        );
      });

      it("supports ROUND_UP", () => {
        expectMoney(
          MajikMoney.fromMajor("10.501", "USD", Decimal.ROUND_UP),
          "1051",
          "USD",
        );
      });

      it("supports FLOOR", () => {
        expectMoney(
          MajikMoney.fromMajor("-10.501", "USD", Decimal.ROUND_FLOOR),
          "-1051",
          "USD",
        );
      });

      it("supports CEIL", () => {
        expectMoney(
          MajikMoney.fromMajor("-10.501", "USD", Decimal.ROUND_CEIL),
          "-1050",
          "USD",
        );
      });

      it("supports negative major values", () => {
        expectMoney(MajikMoney.fromMajor("-123.45", "USD"), "-12345", "USD");
      });

      it("rejects unsupported currencies", () => {
        expect(() => MajikMoney.fromMajor(100, "ABC")).toThrow(
          "Unsupported currency ABC",
        );
      });
    });

    describe("parseFromJSON()", () => {
      it("parses a valid JSON object", () => {
        const json: MajikMoneyJSON = {
          amount: "1500",
          currency: "EUR",
          __type: "MajikMoney",
        };

        const money = MajikMoney.parseFromJSON(json);

        expectMoney(money, "1500", "EUR");
      });

      it("parses numeric amount values", () => {
        const money = MajikMoney.parseFromJSON({
          amount: 1500,
          currency: "EUR",
        });

        expectMoney(money, "1500", "EUR");
      });

      it("does not require __type", () => {
        const money = MajikMoney.parseFromJSON({
          amount: "1500",
          currency: "EUR",
        });

        expectMoney(money, "1500", "EUR");
      });

      it("rejects missing currency", () => {
        expect(() =>
          MajikMoney.parseFromJSON({
            amount: 100,
          } as unknown as MajikMoneyJSON),
        ).toThrow("Invalid currency type. Expected string.");
      });

      it("rejects non-string currency", () => {
        expect(() =>
          MajikMoney.parseFromJSON({
            amount: 100,
            currency: 123,
          } as unknown as MajikMoneyJSON),
        ).toThrow("Invalid currency type. Expected string.");
      });

      it("rejects unsupported currency", () => {
        expect(() =>
          MajikMoney.parseFromJSON({
            amount: 100,
            currency: "XYZ",
          }),
        ).toThrow("Unsupported currency XYZ");
      });
    });
  });

  // ===========================================================================
  // Representation
  // ===========================================================================

  describe("Representation", () => {
    it("returns exact minor units as number", () => {
      const money = MajikMoney.fromMinor(123456, "PHP");

      expect(money.toMinor()).toBe(123456);
    });

    it("returns exact minor units as Decimal", () => {
      const money = MajikMoney.fromMinor("123456", "PHP");
      const value = money.toMinorDecimal();

      expect(value).toBeInstanceOf(Decimal);
      expect(value.toString()).toBe("123456");
    });

    it("returns exact minor units as string", () => {
      const money = MajikMoney.fromMinor("123456", "PHP");

      expect(money.toMinorString()).toBe("123456");
    });

    it("returns exact minor units as bigint", () => {
      const money = MajikMoney.fromMinor("123456", "PHP");

      expect(money.toMinorBigInt()).toBe(123456n);
    });

    it("supports negative bigint values", () => {
      const money = MajikMoney.fromMinor("-123456", "PHP");

      expect(money.toMinorBigInt()).toBe(-123456n);
    });

    it("returns major value as number", () => {
      const money = MajikMoney.fromMinor(123456, "PHP");

      expect(money.toMajor()).toBe(1234.56);
    });

    it("returns major value as Decimal", () => {
      const money = MajikMoney.fromMinor(123456, "PHP");
      const value = money.toMajorDecimal();

      expect(value).toBeInstanceOf(Decimal);
      expect(value.toString()).toBe("1234.56");
    });

    it("returns default major string using currency minor units", () => {
      expect(usd(123.45).toMajorString()).toBe("123.45");
      expect(jpy(123).toMajorString()).toBe("123");
      expect(kwd(1.234).toMajorString()).toBe("1.234");
    });

    it("supports explicit decimal places in toMajorString()", () => {
      const money = php(123.456);

      expect(money.toMajorString(1)).toBe("123.5");
    });

    it("supports explicit rounding in toMajorString()", () => {
      const money = php(123.456);

      expect(money.toMajorString(1, Decimal.ROUND_DOWN)).toBe("123.4");
      expect(money.toMajorString(1, Decimal.ROUND_UP)).toBe("123.5");
    });

    it("formats toString() predictably", () => {
      expect(php(123.45).toString()).toBe("123.45 PHP");
      expect(usd(10).toString()).toBe("10.00 USD");
    });

    it("formats canonical strings using minor units", () => {
      expect(php(123.45).toCanonicalString()).toBe("PHP 12345");
      expect(jpy(1000).toCanonicalString()).toBe("JPY 1000");
    });

    it("canonical strings preserve negative values", () => {
      expect(usd(-12.34).toCanonicalString()).toBe("USD -1234");
    });

    it("uses en-PH by default for format()", () => {
      const formatted = php(1234.56).format();

      expect(formatted).toContain("1,234.56");
    });

    it("formats USD correctly in en-US", () => {
      const formatted = usd(1234.56).format("en-US");

      expect(formatted).toContain("$");
      expect(formatted).toContain("1,234.56");
    });

    it("formats JPY without decimal places", () => {
      const formatted = jpy(1234).format("ja-JP");

      expect(formatted).toContain("1,234");
    });

    it("formats KWD with three decimal places", () => {
      const formatted = kwd(1.234).format("en-US");

      expect(formatted).toContain("1.234");
    });
  });

  // ===========================================================================
  // Decimal precision / large values
  // ===========================================================================

  describe("Precision & Large Values", () => {
    it("preserves large minor-unit integers through string representation", () => {
      const amount = "9007199254740991";
      const money = MajikMoney.fromMinor(amount, "USD");

      expect(money.toMinorString()).toBe(amount);
      expect(money.toMinorBigInt()).toBe(9007199254740991n);
    });

    it("preserves values above Number.MAX_SAFE_INTEGER through Decimal/string APIs", () => {
      const amount = "90071992547409910";
      const money = MajikMoney.fromMinor(amount, "USD");

      expect(money.toMinorString()).toBe(amount);
      expect(money.toMinorBigInt()).toBe(90071992547409910n);
      expect(money.toMinorDecimal().toString()).toBe(amount);
    });

    it("adds very large values without Decimal precision loss", () => {
      const a = MajikMoney.fromMinor("90071992547409910", "USD");
      const b = MajikMoney.fromMinor("10", "USD");

      const result = a.add(b);

      expect(result.toMinorString()).toBe("90071992547409920");
    });

    it("subtracts very large values without Decimal precision loss", () => {
      const a = MajikMoney.fromMinor("90071992547409920", "USD");
      const b = MajikMoney.fromMinor("10", "USD");

      const result = a.subtract(b);

      expect(result.toMinorString()).toBe("90071992547409910");
    });

    it("multiplies large values using Decimal arithmetic", () => {
      const money = MajikMoney.fromMinor("100000000000000000", "USD");

      const result = money.multiply("1.25");

      expect(result.toMinorString()).toBe("125000000000000000");
    });

    it("divides large values using Decimal arithmetic", () => {
      const money = MajikMoney.fromMinor("100000000000000000", "USD");

      const result = money.divide(4);

      expect(result.toMinorString()).toBe("25000000000000000");
    });

    it("returns exact analytical Decimal results for large multiplication", () => {
      const money = MajikMoney.fromMinor("123456789012345678", "USD");

      expect(money.multiplyDecimal("1.25").toString()).toBe(
        "154320986265432097.5",
      );
    });

    it("returns exact analytical Decimal results for large division", () => {
      const money = MajikMoney.fromMinor("100000000000000000", "USD");

      expect(money.divideDecimal("3").toString()).toBe(
        "33333333333333333.33333333333333333333333333333333333333333333333333333333333333333333333333333333333",
      );
    });
  });

  // ===========================================================================
  // Arithmetic
  // ===========================================================================

  describe("Arithmetic Operations", () => {
    it("adds two amounts of the same currency", () => {
      const result = usd(10.5).add(usd(4.25));

      expectMoney(result, "1475", "USD");
    });

    it("subtracts two amounts of the same currency", () => {
      const result = usd(10).subtract(usd(4));

      expectMoney(result, "600", "USD");
    });

    it("supports negative arithmetic", () => {
      const result = usd(-10).add(usd(4));

      expectMoney(result, "-600", "USD");
    });

    it("subtracts into negative territory", () => {
      const result = usd(4).subtract(usd(10));

      expectMoney(result, "-600", "USD");
    });

    it("rejects cross-currency addition", () => {
      expect(() => usd(10).add(eur(10))).toThrow(
        "Currency mismatch: USD vs EUR",
      );
    });

    it("rejects cross-currency subtraction", () => {
      expect(() => usd(10).subtract(eur(10))).toThrow(
        "Currency mismatch: USD vs EUR",
      );
    });

    it("does not mutate the left operand during addition", () => {
      const original = usd(10);
      const result = original.add(usd(5));

      expect(original.toMajor()).toBe(10);
      expect(result.toMajor()).toBe(15);
    });

    it("does not mutate operands during subtraction", () => {
      const original = usd(10);
      const other = usd(4);

      original.subtract(other);

      expect(original.toMajor()).toBe(10);
      expect(other.toMajor()).toBe(4);
    });

    describe("subtract bounds", () => {
      it("applies minimum bound", () => {
        const result = usd(10).subtract(usd(15), 0);

        expectMoney(result, "0", "USD");
      });

      it("applies maximum bound", () => {
        const result = usd(10).subtract(usd(2), undefined, 5_00);

        expectMoney(result, "500", "USD");
      });

      it("does not clamp when result already lies inside bounds", () => {
        const result = usd(10).subtract(usd(2), 0, 1000);

        expectMoney(result, "800", "USD");
      });

      it("supports negative minimum bounds", () => {
        const result = usd(10).subtract(usd(30), -25_00);

        expectMoney(result, "-2000", "USD");
      });
    });

    describe("multiply()", () => {
      it("multiplies by an integer", () => {
        expectMoney(usd(10).multiply(3), "3000", "USD");
      });

      it("multiplies by a decimal", () => {
        expectMoney(usd(10).multiply("1.5"), "1500", "USD");
      });

      it("multiplies by zero", () => {
        expectMoney(usd(10).multiply(0), "0", "USD");
      });

      it("supports negative multipliers", () => {
        expectMoney(usd(10).multiply(-2), "-2000", "USD");
      });

      it("uses half-even rounding by default", () => {
        const money = MajikMoney.fromMinor(100, "USD");

        expect(money.multiply("1.555").toMinor()).toBe(156);
        expect(money.multiply("1.545").toMinor()).toBe(154);
      });

      it("supports ROUND_DOWN", () => {
        expect(
          MajikMoney.fromMinor(100, "USD")
            .multiply("1.555", Decimal.ROUND_DOWN)
            .toMinor(),
        ).toBe(155);
      });

      it("supports ROUND_UP", () => {
        expect(
          MajikMoney.fromMinor(100, "USD")
            .multiply("1.551", Decimal.ROUND_UP)
            .toMinor(),
        ).toBe(156);
      });
    });

    describe("divide()", () => {
      it("divides exactly", () => {
        expectMoney(usd(100).divide(4), "2500", "USD");
      });

      it("divides with ROUND_DOWN", () => {
        expectMoney(
          MajikMoney.fromMinor(100, "USD").divide(3, Decimal.ROUND_DOWN),
          "33",
          "USD",
        );
      });

      it("divides with ROUND_UP", () => {
        expectMoney(
          MajikMoney.fromMinor(100, "USD").divide(3, Decimal.ROUND_UP),
          "34",
          "USD",
        );
      });

      it("supports negative divisors", () => {
        expectMoney(usd(100).divide(-4), "-2500", "USD");
      });

      it("throws when divisor is zero", () => {
        expect(() => usd(10).divide(0)).toThrow(
          "Cannot divide MajikMoney by zero",
        );
      });

      it("throws when divisor is numeric zero in string form", () => {
        expect(() => usd(10).divide("0")).toThrow(
          "Cannot divide MajikMoney by zero",
        );
      });
    });

    describe("multiplyDecimal()", () => {
      it("does not round the result to minor units", () => {
        const result = MajikMoney.fromMinor(100, "USD").multiplyDecimal(
          "1.555",
        );

        expect(result).toBeInstanceOf(Decimal);
        expect(result.toString()).toBe("155.5");
      });

      it("supports negative factors", () => {
        const result = MajikMoney.fromMinor(100, "USD").multiplyDecimal("-1.5");

        expect(result.toString()).toBe("-150");
      });

      it("preserves zero", () => {
        expect(
          MajikMoney.fromMinor(100, "USD").multiplyDecimal(0).toString(),
        ).toBe("0");
      });
    });

    describe("divideDecimal()", () => {
      it("does not round the result to minor units", () => {
        const result = MajikMoney.fromMinor(100, "USD").divideDecimal(3);

        expect(result).toBeInstanceOf(Decimal);
        expect(result.toString()).toBe(
          "33.33333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333",
        );
      });

      it("throws on zero", () => {
        expect(() => MajikMoney.fromMinor(100, "USD").divideDecimal(0)).toThrow(
          "Cannot divide MajikMoney by zero",
        );
      });

      it("supports negative divisors", () => {
        expect(
          MajikMoney.fromMinor(100, "USD").divideDecimal(-4).toString(),
        ).toBe("-25");
      });
    });

    describe("invertDivide()", () => {
      it("computes scalar divided by money amount", () => {
        const result = usd(10).invertDivide(2);

        expectMoney(result, "20", "USD");
      });

      it("supports negative dividend", () => {
        const result = usd(10).invertDivide(-2);

        expectMoney(result, "-20", "USD");
      });

      it("throws when monetary amount is zero", () => {
        expect(() => MajikMoney.zero("USD").invertDivide(100)).toThrow(
          "Cannot divide by zero money amount",
        );
      });

      it("supports custom rounding", () => {
        const result = usd(3).invertDivide(1, Decimal.ROUND_DOWN);

        expectMoney(result, "33", "USD");
      });
    });

    describe("ratio()", () => {
      it("returns a unitless ratio", () => {
        expect(usd(100).ratio(usd(25))).toBe(4);
      });

      it("returns fractional ratios", () => {
        expect(usd(25).ratio(usd(100))).toBe(0.25);
      });

      it("supports negative amounts", () => {
        expect(usd(-100).ratio(usd(25))).toBe(-4);
      });

      it("rejects currency mismatch", () => {
        expect(() => usd(100).ratio(eur(25))).toThrow(
          "Currency mismatch: USD vs EUR",
        );
      });

      it("rejects zero denominator", () => {
        expect(() => usd(100).ratio(usd(0))).toThrow(
          "Division by zero in MajikMoney.ratio()",
        );
      });
    });

    describe("compound()", () => {
      it("calculates compound growth", () => {
        const result = usd(1000).compound("0.05", 3);

        expectMoney(result, "115762", "USD");
      });

      it("returns the same amount for zero rate", () => {
        expectSameMoney(usd(1000).compound(0, 10), usd(1000));
      });

      it("returns the same amount for zero periods", () => {
        expectSameMoney(usd(1000).compound(0.05, 0), usd(1000));
      });

      it("handles negative rates above -100%", () => {
        const result = usd(1000).compound(-0.1, 2);

        expectMoney(result, "81000", "USD");
      });

      it("supports one period", () => {
        expectSameMoney(usd(1000).compound(0.05, 1), usd(1050));
      });
    });
  });

  // ===========================================================================
  // Percentage operations
  // ===========================================================================

  describe("Percentage Mathematics", () => {
    it("calculates a percentage amount", () => {
      expectMoney(usd(100).percentage(0.15), "1500", "USD");
    });

    it("supports zero percentage", () => {
      expectMoney(usd(100).percentage(0), "0", "USD");
    });

    it("supports negative percentage", () => {
      expectMoney(usd(100).percentage(-0.15), "-1500", "USD");
    });

    it("keeps deprecated applyPercentage() equivalent to percentage()", () => {
      expectSameMoney(
        usd(100).percentage(0.15),
        usd(100).applyPercentage(0.15),
      );
    });

    it("adds a percentage", () => {
      expectMoney(usd(100).addPercentage(0.12), "11200", "USD");
    });

    it("subtracts a percentage", () => {
      expectMoney(usd(100).subtractPercentage(0.12), "8800", "USD");
    });

    it("removes an included percentage", () => {
      expectMoney(usd(112).removePercentage(0.12), "10000", "USD");
    });

    it("rejects rate -1 for removePercentage", () => {
      expect(() => usd(100).removePercentage(-1)).toThrow(
        "Invalid rate: 1 + rate cannot be zero",
      );
    });

    it("supports rates less than -1 mathematically", () => {
      const result = usd(100).removePercentage(-2);

      expectMoney(result, "-10000", "USD");
    });

    it("calculates percentageOf()", () => {
      expect(usd(25).percentageOf(usd(100)).toNumber()).toBe(25);
    });

    it("returns 100% when amount equals total", () => {
      expect(usd(100).percentageOf(usd(100)).toNumber()).toBe(100);
    });

    it("returns 0% for zero numerator", () => {
      expect(usd(0).percentageOf(usd(100)).toNumber()).toBe(0);
    });

    it("supports percentages greater than 100", () => {
      expect(usd(200).percentageOf(usd(100)).toNumber()).toBe(200);
    });

    it("rejects zero total in percentageOf()", () => {
      expect(() => usd(25).percentageOf(usd(0))).toThrow(
        "Cannot compute percentageOf a zero amount",
      );
    });

    it("rejects cross-currency percentageOf()", () => {
      expect(() => usd(25).percentageOf(eur(100))).toThrow(
        "Currency mismatch: USD vs EUR",
      );
    });
  });

  // ===========================================================================
  // Pricing
  // ===========================================================================

  describe("Pricing Mathematics", () => {
    it("calculates discount amount", () => {
      expectMoney(usd(100).discountAmount(0.2), "2000", "USD");
    });

    it("calculates discounted price", () => {
      expectMoney(usd(100).discount(0.2), "8000", "USD");
    });

    it("supports zero discount", () => {
      expectSameMoney(usd(100).discount(0), usd(100));
    });

    it("calculates markup amount", () => {
      expectMoney(usd(100).markupAmount(0.2), "2000", "USD");
    });

    it("calculates marked-up price", () => {
      expectMoney(usd(100).markup(0.2), "12000", "USD");
    });

    it("supports negative discount rates", () => {
      expectSameMoney(usd(100).discount(-0.2), usd(120));
    });

    it("does not mutate price when applying a discount", () => {
      const price = usd(100);

      price.discount(0.2);

      expect(price.toMajor()).toBe(100);
    });

    it("does not mutate cost when applying markup", () => {
      const cost = usd(100);

      cost.markup(0.2);

      expect(cost.toMajor()).toBe(100);
    });
  });

  // ===========================================================================
  // Tax and fees
  // ===========================================================================

  describe("Tax & Fee Mathematics", () => {
    it("calculates tax from a tax-exclusive base", () => {
      expectMoney(php(100).tax(0.12), "1200", "PHP");
    });

    it("calculates tax-inclusive total", () => {
      expectMoney(php(100).taxInclusive(0.12), "11200", "PHP");
    });

    it("backs tax out of an inclusive total", () => {
      expectMoney(php(112).taxExclusive(0.12), "10000", "PHP");
    });

    it("isolates tax component", () => {
      expectMoney(php(112).taxComponent(0.12), "1200", "PHP");
    });

    it("recomposes inclusive tax correctly", () => {
      const total = php(112);
      const base = total.taxExclusive(0.12);
      const tax = total.taxComponent(0.12);

      expectSameMoney(base.add(tax), total);
    });

    it("calculates percentage fee", () => {
      expectMoney(usd(100).feePercentage(0.03), "300", "USD");
    });

    it("adds flat fee", () => {
      expectMoney(usd(100).feeAmount(usd(5)), "10500", "USD");
    });

    it("rejects cross-currency flat fees", () => {
      expect(() => usd(100).feeAmount(eur(5))).toThrow(
        "Currency mismatch: USD vs EUR",
      );
    });

    it("supports zero tax", () => {
      expectSameMoney(php(100).taxInclusive(0), php(100));
    });

    it("supports custom rounding for tax", () => {
      const tax = MajikMoney.fromMajor("100.01", "USD").tax(
        "0.075",
        Decimal.ROUND_DOWN,
      );

      expect(tax.toMinor()).toBe(750);
    });
  });

  // ===========================================================================
  // Allocation
  // ===========================================================================

  describe("Allocation", () => {
    describe("allocate()", () => {
      it("allocates according to proportional weights", () => {
        const parts = usd(100).allocate([1, 2, 1]);

        expect(parts).toHaveLength(3);
        expectMoney(parts[0], "2500", "USD");
        expectMoney(parts[1], "5000", "USD");
        expectMoney(parts[2], "2500", "USD");
      });

      it("preserves the total amount", () => {
        const money = MajikMoney.fromMinor(1000, "USD");
        const parts = money.allocate([1, 2, 3, 4]);

        expect(sumMinor(parts).toString()).toBe(money.toMinorString());
      });

      it("allocates zero weights without losing total", () => {
        const money = usd(100);
        const parts = money.allocate([0, 1, 0]);

        expectMoney(parts[0], "0", "USD");
        expectMoney(parts[1], "10000", "USD");
        expectMoney(parts[2], "0", "USD");

        expect(sumMinor(parts).toString()).toBe(money.toMinorString());
      });

      it("distributes remainder to the final element", () => {
        const money = MajikMoney.fromMinor(10, "USD");
        const parts = money.allocate([1, 1, 1]);

        expect(parts.map((p) => p.toMinor())).toEqual([3, 3, 4]);
      });

      it("works for a single ratio", () => {
        const money = usd(100);
        const parts = money.allocate([1]);

        expect(parts).toHaveLength(1);
        expectSameMoney(parts[0], money);
      });

      it("works with fractional weights", () => {
        const money = usd(100);
        const parts = money.allocate([0.5, 1.5]);

        expect(sumMinor(parts).toString()).toBe(money.toMinorString());

        expect(parts[0].toMinor()).toBe(2500);
        expect(parts[1].toMinor()).toBe(7500);
      });

      it("supports a zero-valued original amount", () => {
        const parts = MajikMoney.zero("USD").allocate([1, 2, 3]);

        expect(parts).toHaveLength(3);
        expect(parts.every((part) => part.isZero())).toBe(true);
      });

      it("rejects empty ratios", () => {
        expect(() => usd(100).allocate([])).toThrow(
          "At least one ratio is required",
        );
      });

      it("rejects all-zero ratios", () => {
        expect(() => usd(100).allocate([0, 0])).toThrow(
          "Sum of ratios must be greater than zero",
        );
      });

      it("rejects negative ratios", () => {
        expect(() => usd(100).allocate([-1, 2])).toThrow(
          "Ratios must be non-negative",
        );
      });

      it("rejects negative ratios even when a later ratio exists", () => {
        expect(() => usd(100).allocate([1, -1, 2])).toThrow(
          "Ratios must be non-negative",
        );
      });

      /**
       * These defensive cases are intentionally strict.
       * The current implementation should be hardened to reject them.
       */
      it("rejects NaN ratio", () => {
        expect(() => usd(100).allocate([1, Number.NaN])).toThrow();
      });

      it("rejects infinite ratios", () => {
        expect(() =>
          usd(100).allocate([1, Number.POSITIVE_INFINITY]),
        ).toThrow();
      });
    });

    describe("allocatePercentages()", () => {
      it("allocates exact percentages", () => {
        const parts = usd(100).allocatePercentages([60, 30, 10]);

        expect(parts.map((p) => p.toMajor())).toEqual([60, 30, 10]);
      });

      it("preserves the original total", () => {
        const money = usd(123.45);
        const parts = money.allocatePercentages([50, 30, 20]);

        expect(sumMinor(parts).toString()).toBe(money.toMinorString());
      });

      it("accepts percentages within tolerance", () => {
        const parts = usd(100).allocatePercentages([33.333, 33.333, 33.334]);

        expect(sumMinor(parts).toString()).toBe("10000");
      });

      it("supports custom tolerance", () => {
        expect(() =>
          usd(100).allocatePercentages([50, 49.95], 0.1),
        ).not.toThrow();
      });

      it("rejects totals outside tolerance", () => {
        expect(() => usd(100).allocatePercentages([50, 40])).toThrow(
          "Percentages must sum to 100 (got 90)",
        );
      });

      it("rejects negative percentage entries", () => {
        expect(() => usd(100).allocatePercentages([110, -10])).toThrow(
          "Ratios must be non-negative",
        );
      });

      it("rejects all-zero percentages", () => {
        expect(() => usd(100).allocatePercentages([0, 0])).toThrow(
          "Sum of ratios must be greater than zero",
        );
      });
    });

    describe("evenSplit()", () => {
      it("splits an amount evenly", () => {
        const parts = usd(100).evenSplit(4);

        expect(parts.map((p) => p.toMinor())).toEqual([2500, 2500, 2500, 2500]);
      });

      it("assigns remainder to last part", () => {
        const parts = MajikMoney.fromMinor(100, "USD").evenSplit(3);

        expect(parts.map((p) => p.toMinor())).toEqual([33, 33, 34]);
      });

      it("preserves total after uneven split", () => {
        const money = MajikMoney.fromMinor(101, "USD");
        const parts = money.evenSplit(7);

        expect(sumMinor(parts).toString()).toBe(money.toMinorString());
      });

      it("supports one part", () => {
        const money = usd(100);
        const parts = money.evenSplit(1);

        expect(parts).toHaveLength(1);
        expectSameMoney(parts[0], money);
      });

      it("supports splitting zero", () => {
        const parts = MajikMoney.zero("USD").evenSplit(3);

        expect(parts.every((p) => p.isZero())).toBe(true);
      });

      it("rejects zero parts", () => {
        expect(() => usd(100).evenSplit(0)).toThrow(
          "Number of parts must be > 0",
        );
      });

      it("rejects negative parts", () => {
        expect(() => usd(100).evenSplit(-1)).toThrow(
          "Number of parts must be > 0",
        );
      });

      it("rejects non-integer positive parts", () => {
        /**
         * This should be hardened because Array(2.5) is invalid.
         */
        expect(() => usd(100).evenSplit(2.5)).toThrow();
      });
    });
  });

  // ===========================================================================
  // Rounding
  // ===========================================================================

  describe("Rounding", () => {
    describe("round()", () => {
      it("rounds to whole major units", () => {
        expectMoney(php(123.45).round(), "12300", "PHP");
      });

      it("rounds half-even downward for even lower integer", () => {
        expectMoney(php("123.50").round(), "12400", "PHP");
      });

      it("rounds half-even correctly on exact ties", () => {
        expectMoney(php("122.50").round(), "12200", "PHP");
        expectMoney(php("123.50").round(), "12400", "PHP");
      });

      it("rounds negative values", () => {
        expectMoney(php("-123.45").round(), "-12300", "PHP");
      });

      it("supports ROUND_DOWN", () => {
        expectMoney(php("123.99").round(Decimal.ROUND_DOWN), "12300", "PHP");
      });

      it("supports ROUND_UP", () => {
        expectMoney(php("123.01").round(Decimal.ROUND_UP), "12400", "PHP");
      });
    });

    describe("roundTo()", () => {
      it("rounds to quarter increments", () => {
        expectMoney(php(123.45).roundTo(0.25), "12350", "PHP");
      });

      it("rounds to whole 5-unit increments", () => {
        expectMoney(php(123.45).roundTo(5), "12500", "PHP");
      });

      it("rounds exactly on an increment without changing value", () => {
        expectSameMoney(php(125).roundTo(5), php(125));
      });

      it("supports sub-minor-unit increments mathematically", () => {
        const result = php(10).roundTo("0.001");

        expect(result.toMajor()).toBe(10);
      });

      it("rejects zero increment", () => {
        expect(() => php(100).roundTo(0)).toThrow(
          "increment must be greater than zero",
        );
      });

      it("rejects negative increment", () => {
        expect(() => php(100).roundTo(-1)).toThrow(
          "increment must be greater than zero",
        );
      });

      it("supports custom rounding mode", () => {
        expectMoney(php(123.49).roundTo(1, Decimal.ROUND_DOWN), "12300", "PHP");

        expectMoney(php(123.01).roundTo(1, Decimal.ROUND_UP), "12400", "PHP");
      });
    });

    describe("cashRound()", () => {
      it("is a no-op when no special cash increment is configured", () => {
        const money = php(123.42);
        const result = money.cashRound();

        expectSameMoney(result, money);
      });

      it("preserves currency", () => {
        const money = usd(123.42);
        const result = money.cashRound();

        expect(result.currency.code).toBe("USD");
      });

      it("supports custom rounding mode", () => {
        const money = php(123.49);
        const result = money.cashRound(Decimal.ROUND_DOWN);

        expect(result.toMinor()).toBe(12349);
      });
    });
  });

  // ===========================================================================
  // Comparisons
  // ===========================================================================

  describe("Comparisons", () => {
    const usd100 = usd(100);
    const usd100Duplicate = usd(100);
    const usd50 = usd(50);
    const usd0 = usd(0);
    const usdNegative = usd(-50);
    const eur100 = eur(100);

    describe("equals()", () => {
      it("returns true for identical amount and currency", () => {
        expect(usd100.equals(usd100Duplicate)).toBe(true);
      });

      it("returns false for different amount", () => {
        expect(usd100.equals(usd50)).toBe(false);
      });

      it("returns false for different currency", () => {
        expect(usd100.equals(eur100)).toBe(false);
      });

      it("returns true for independently constructed equivalent values", () => {
        expect(usd(12.34).equals(MajikMoney.fromMinor(1234, "USD"))).toBe(true);
      });
    });

    describe("equalsWithin()", () => {
      it("returns true within exact tolerance", () => {
        expect(
          MajikMoney.fromMinor(1000, "USD").equalsWithin(
            MajikMoney.fromMinor(1002, "USD"),
            2,
          ),
        ).toBe(true);
      });

      it("returns false outside tolerance", () => {
        expect(
          MajikMoney.fromMinor(1000, "USD").equalsWithin(
            MajikMoney.fromMinor(1002, "USD"),
            1,
          ),
        ).toBe(false);
      });

      it("defaults tolerance to zero", () => {
        expect(
          MajikMoney.fromMinor(1000, "USD").equalsWithin(
            MajikMoney.fromMinor(1000, "USD"),
          ),
        ).toBe(true);

        expect(
          MajikMoney.fromMinor(1000, "USD").equalsWithin(
            MajikMoney.fromMinor(1001, "USD"),
          ),
        ).toBe(false);
      });

      it("supports negative differences", () => {
        expect(
          MajikMoney.fromMinor(1002, "USD").equalsWithin(
            MajikMoney.fromMinor(1000, "USD"),
            2,
          ),
        ).toBe(true);
      });

      it("rejects cross-currency comparison", () => {
        expect(() => usd(10).equalsWithin(eur(10), 1)).toThrow(
          "Currency mismatch",
        );
      });
    });

    describe("compare()", () => {
      it("returns -1 when lower", () => {
        expect(usd50.compare(usd100)).toBe(-1);
      });

      it("returns 0 when equal", () => {
        expect(usd100.compare(usd100Duplicate)).toBe(0);
      });

      it("returns 1 when greater", () => {
        expect(usd100.compare(usd50)).toBe(1);
      });

      it("orders negative, zero, and positive values", () => {
        expect(usdNegative.compare(usd0)).toBe(-1);
        expect(usd0.compare(usd100)).toBe(-1);
        expect(usd100.compare(usdNegative)).toBe(1);
      });

      it("rejects cross-currency comparison", () => {
        expect(() => usd100.compare(eur100)).toThrow("Currency mismatch");
      });

      it("can be used as an Array.sort comparator", () => {
        const values = [usd(20), usd(-5), usd(100), usd(0), usd(20)];

        const sorted = values.sort((a, b) => a.compare(b));

        expect(sorted.map((m) => m.toMajor())).toEqual([-5, 0, 20, 20, 100]);
      });
    });

    describe("relational methods", () => {
      it("greaterThan()", () => {
        expect(usd100.greaterThan(usd50)).toBe(true);
        expect(usd50.greaterThan(usd100)).toBe(false);
        expect(usd100.greaterThan(usd100Duplicate)).toBe(false);
      });

      it("greaterThanOrEqual()", () => {
        expect(usd100.greaterThanOrEqual(usd50)).toBe(true);
        expect(usd100.greaterThanOrEqual(usd100Duplicate)).toBe(true);
        expect(usd50.greaterThanOrEqual(usd100)).toBe(false);
      });

      it("lessThan()", () => {
        expect(usd50.lessThan(usd100)).toBe(true);
        expect(usd100.lessThan(usd50)).toBe(false);
      });

      it("lessThanOrEqual()", () => {
        expect(usd50.lessThanOrEqual(usd100)).toBe(true);
        expect(usd100.lessThanOrEqual(usd100Duplicate)).toBe(true);
        expect(usd100.lessThanOrEqual(usd50)).toBe(false);
      });

      it("rejects all cross-currency relational comparisons", () => {
        expect(() => usd100.greaterThan(eur100)).toThrow("Currency mismatch");

        expect(() => usd100.greaterThanOrEqual(eur100)).toThrow(
          "Currency mismatch",
        );

        expect(() => usd100.lessThan(eur100)).toThrow("Currency mismatch");

        expect(() => usd100.lessThanOrEqual(eur100)).toThrow(
          "Currency mismatch",
        );
      });
    });
  });

  // ===========================================================================
  // Sign predicates
  // ===========================================================================

  describe("Sign & Predicates", () => {
    it("identifies zero", () => {
      expect(usd(0).isZero()).toBe(true);
      expect(usd(1).isZero()).toBe(false);
    });

    it("identifies positive values", () => {
      expect(usd(1).isPositive()).toBe(true);
      expect(usd(0).isPositive()).toBe(false);
      expect(usd(-1).isPositive()).toBe(false);
    });

    it("identifies negative values", () => {
      expect(usd(-1).isNegative()).toBe(true);
      expect(usd(0).isNegative()).toBe(false);
      expect(usd(1).isNegative()).toBe(false);
    });

    it("identifies non-positive values", () => {
      expect(usd(-1).isNonPositive()).toBe(true);
      expect(usd(0).isNonPositive()).toBe(true);
      expect(usd(1).isNonPositive()).toBe(false);
    });

    it("identifies non-negative values", () => {
      expect(usd(-1).isNonNegative()).toBe(false);
      expect(usd(0).isNonNegative()).toBe(true);
      expect(usd(1).isNonNegative()).toBe(true);
    });

    it("returns correct sign", () => {
      expect(usd(-1).sign()).toBe(-1);
      expect(usd(0).sign()).toBe(0);
      expect(usd(1).sign()).toBe(1);
    });

    it("negates positive values", () => {
      expectMoney(usd(50).negate(), "-5000", "USD");
    });

    it("negates negative values", () => {
      expectMoney(usd(-50).negate(), "5000", "USD");
    });

    it("negates zero without changing its sign", () => {
      expect(usd(0).negate().sign()).toBe(0);
    });

    it("returns absolute value of positive value", () => {
      expectSameMoney(usd(50).abs(), usd(50));
    });

    it("returns absolute value of negative value", () => {
      expectSameMoney(usd(-50).abs(), usd(50));
    });

    it("returns absolute value of zero", () => {
      expect(usd(0).abs().isZero()).toBe(true);
    });
  });

  // ===========================================================================
  // Bounds
  // ===========================================================================

  describe("Bounds", () => {
    describe("min()", () => {
      it("returns smaller amount", () => {
        expectSameMoney(usd(10).min(usd(20)), usd(10));
      });

      it("returns the other amount when it is smaller", () => {
        expectSameMoney(usd(20).min(usd(10)), usd(10));
      });

      it("returns equivalent amount when equal", () => {
        const a = usd(10);
        const b = usd(10);

        expect(a.min(b).toMinor()).toBe(1000);
      });

      it("rejects currency mismatch", () => {
        expect(() => usd(10).min(eur(10))).toThrow("Currency mismatch");
      });
    });

    describe("max()", () => {
      it("returns larger amount", () => {
        expectSameMoney(usd(20).max(usd(10)), usd(20));
      });

      it("returns the other amount when it is larger", () => {
        expectSameMoney(usd(10).max(usd(20)), usd(20));
      });

      it("rejects currency mismatch", () => {
        expect(() => usd(10).max(eur(10))).toThrow("Currency mismatch");
      });
    });

    describe("clamp()", () => {
      const min = usd(10);
      const max = usd(100);

      it("keeps values inside range unchanged", () => {
        expectSameMoney(usd(50).clamp(min, max), usd(50));
      });

      it("raises values below minimum", () => {
        expectSameMoney(usd(5).clamp(min, max), min);
      });

      it("lowers values above maximum", () => {
        expectSameMoney(usd(150).clamp(min, max), max);
      });

      it("allows exact minimum", () => {
        expectSameMoney(usd(10).clamp(min, max), min);
      });

      it("allows exact maximum", () => {
        expectSameMoney(usd(100).clamp(min, max), max);
      });

      it("rejects min greater than max", () => {
        expect(() => usd(50).clamp(usd(100), usd(10))).toThrow(
          "clamp: min cannot be greater than max",
        );
      });

      it("rejects currency mismatch on min", () => {
        expect(() => usd(50).clamp(eur(10), usd(100))).toThrow(
          "Currency mismatch",
        );
      });

      it("rejects currency mismatch on max", () => {
        expect(() => usd(50).clamp(usd(10), eur(100))).toThrow(
          "Currency mismatch",
        );
      });
    });

    describe("isSameCurrency()", () => {
      it("returns true for same currency", () => {
        expect(usd(10).isSameCurrency(usd(20))).toBe(true);
      });

      it("returns false for different currencies", () => {
        expect(usd(10).isSameCurrency(eur(10))).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Currency conversion
  // ===========================================================================

  describe("Currency Conversion", () => {
    describe("convert()", () => {
      it("converts standard 2-decimal currencies", () => {
        const result = usd(100).convert("0.85", CURRENCIES["EUR"]);

        expectMoney(result, "8500", "EUR");
      });

      it("converts to zero-decimal currencies", () => {
        const result = usd(100).convert("149.123", CURRENCIES["JPY"]);

        expectMoney(result, "14912", "JPY");
      });

      it("converts to three-decimal currencies", () => {
        const result = usd(100).convert("0.3081", CURRENCIES["KWD"]);

        expectMoney(result, "30810", "KWD");
      });

      it("converts a zero amount", () => {
        const result = usd(0).convert("0.85", CURRENCIES["EUR"]);

        expectMoney(result, "0", "EUR");
      });

      it("supports rate of 1", () => {
        const result = usd(100).convert(1, CURRENCIES["USD"]);

        expectSameMoney(result, usd(100));
      });

      it("supports zero conversion rate", () => {
        const result = usd(100).convert(0, CURRENCIES["EUR"]);

        expectMoney(result, "0", "EUR");
      });

      it("supports custom rounding", () => {
        const down = usd(10).convert(
          "0.1234",
          CURRENCIES["EUR"],
          Decimal.ROUND_DOWN,
        );

        const up = usd(10).convert(
          "0.1234",
          CURRENCIES["EUR"],
          Decimal.ROUND_UP,
        );

        expect(down.toMinor()).toBe(123);
        expect(up.toMinor()).toBe(124);
      });

      it("preserves negative conversion values", () => {
        const result = usd(-100).convert("0.85", CURRENCIES["EUR"]);

        expectMoney(result, "-8500", "EUR");
      });
    });

    describe("convertFromQuoted()", () => {
      it("inverts a quoted source-per-target rate", () => {
        const result = usd(100).convertFromQuoted("1.2", CURRENCIES["EUR"]);

        expectMoney(result, "8333", "EUR");
      });

      it("supports custom rounding", () => {
        const down = usd(100).convertFromQuoted(
          "1.2",
          CURRENCIES["EUR"],
          Decimal.ROUND_DOWN,
        );

        const up = usd(100).convertFromQuoted(
          "1.2",
          CURRENCIES["EUR"],
          Decimal.ROUND_UP,
        );

        expect(down.toMinor()).toBe(8333);
        expect(up.toMinor()).toBe(8334);
      });

      it("supports quoted rate of 1", () => {
        const result = usd(100).convertFromQuoted(1, CURRENCIES["EUR"]);

        expectMoney(result, "10000", "EUR");
      });

      /**
       * Defensive contract:
       * quoted rate zero is not economically meaningful and should be rejected.
       */
      it("rejects zero quoted rate", () => {
        expect(() =>
          usd(100).convertFromQuoted(0, CURRENCIES["EUR"]),
        ).toThrow();
      });
    });

    describe("large-value conversion", () => {
      /**
       * These tests are especially important because the current implementation
       * converts through toMajor(), which returns a JavaScript number.
       *
       * These tests define the desired financial-grade contract.
       */
      it("does not lose significant digits when converting large values", () => {
        const money = MajikMoney.fromMinor("90071992547409910", "USD");

        const result = money.convert("1", CURRENCIES["USD"]);

        expect(result.toMinorString()).toBe("90071992547409910");
      });

      it("preserves large-value identity conversion", () => {
        const amount = "12345678901234567890";
        const money = MajikMoney.fromMinor(amount, "USD");

        const result = money.convert("1", CURRENCIES["USD"]);

        expect(result.toMinorString()).toBe(amount);
      });
    });
  });

  // ===========================================================================
  // Static statistics
  // ===========================================================================

  describe("Static Statistics", () => {
    const list = [usd(10), usd(20), usd(30)];

    describe("sum()", () => {
      it("sums values", () => {
        expectMoney(MajikMoney.sum(list), "6000", "USD");
      });

      it("supports one value", () => {
        expectSameMoney(MajikMoney.sum([usd(10)]), usd(10));
      });

      it("supports zero and negative values", () => {
        const result = MajikMoney.sum([usd(100), usd(-25), usd(0)]);

        expectSameMoney(result, usd(75));
      });

      it("rejects empty arrays", () => {
        expect(() => MajikMoney.sum([])).toThrow("No values provided");
      });

      it("rejects mixed currencies", () => {
        expect(() => MajikMoney.sum([usd(10), eur(10)])).toThrow(
          "Currency mismatch in sum",
        );
      });

      it("does not mutate the input array", () => {
        const values = [usd(10), usd(20), usd(30)];
        const original = [...values];

        MajikMoney.sum(values);

        expect(values).toEqual(original);
      });
    });

    describe("average()", () => {
      it("calculates arithmetic average", () => {
        expectSameMoney(MajikMoney.average(list), usd(20));
      });

      it("rounds a fractional average to minor units", () => {
        const result = MajikMoney.average([usd(10), usd(11)]);

        expectMoney(result, "1050", "USD");
      });

      it("supports negative averages", () => {
        const result = MajikMoney.average([usd(-10), usd(20)]);

        expectMoney(result, "500", "USD");
      });

      it("handles a single value", () => {
        expectSameMoney(MajikMoney.average([usd(50)]), usd(50));
      });

      it("rejects empty arrays", () => {
        expect(() => MajikMoney.average([])).toThrow("No values provided");
      });

      it("rejects mixed currencies", () => {
        expect(() => MajikMoney.average([usd(10), eur(20)])).toThrow(
          "Currency mismatch in sum",
        );
      });
    });

    describe("weightedAverage()", () => {
      it("calculates weighted average", () => {
        const result = MajikMoney.weightedAverage(list, [1, 2, 1]);

        expectSameMoney(result, usd(20));
      });

      it("supports fractional weights", () => {
        const result = MajikMoney.weightedAverage([usd(10), usd(20)], [
          "1.5",
          "0.5",
        ] as unknown as number[]);

        expect(result.toMajor()).toBe(12.5);
      });

      it("supports zero weights when at least one weight is non-zero", () => {
        const result = MajikMoney.weightedAverage([usd(10), usd(20)], [0, 1]);

        expectSameMoney(result, usd(20));
      });

      it("rejects empty values", () => {
        expect(() => MajikMoney.weightedAverage([], [])).toThrow(
          "No values provided",
        );
      });

      it("rejects mismatched value and weight lengths", () => {
        expect(() => MajikMoney.weightedAverage(list, [1, 2])).toThrow(
          "Values and weights length mismatch",
        );
      });

      it("rejects mixed currencies", () => {
        expect(() =>
          MajikMoney.weightedAverage([usd(10), eur(20)], [1, 1]),
        ).toThrow("Currency mismatch in weightedAverage");
      });

      /**
       * Desired defensive behaviour.
       */
      it("rejects all-zero weights", () => {
        expect(() =>
          MajikMoney.weightedAverage([usd(10), usd(20)], [0, 0]),
        ).toThrow();
      });

      /**
       * Desired precision behaviour.
       *
       * Intermediate weighted products should ideally remain Decimal values
       * until the final division/rounding step.
       */
      it("avoids avoidable intermediate rounding error", () => {
        const values = [
          MajikMoney.fromMinor(1, "USD"),
          MajikMoney.fromMinor(1, "USD"),
        ];

        const result = MajikMoney.weightedAverage(values, [0.6, 0.4]);

        expectMoney(result, "1", "USD");
      });
    });

    describe("median()", () => {
      it("calculates odd-length median", () => {
        expectSameMoney(MajikMoney.median(list), usd(20));
      });

      it("calculates even-length median", () => {
        const values = [usd(10), usd(20), usd(30), usd(40)];

        expectSameMoney(MajikMoney.median(values), usd(25));
      });

      it("does not require sorted input", () => {
        const values = [usd(30), usd(10), usd(20)];

        expectSameMoney(MajikMoney.median(values), usd(20));
      });

      it("supports duplicate values", () => {
        const values = [usd(10), usd(10), usd(20), usd(20)];

        expectSameMoney(MajikMoney.median(values), usd(15));
      });

      it("supports negative values", () => {
        const values = [usd(-20), usd(-10), usd(0)];

        expectSameMoney(MajikMoney.median(values), usd(-10));
      });

      it("does not mutate input ordering", () => {
        const values = [usd(30), usd(10), usd(20)];

        MajikMoney.median(values);

        expect(values.map((v) => v.toMajor())).toEqual([30, 10, 20]);
      });

      it("rejects empty arrays", () => {
        expect(() => MajikMoney.median([])).toThrow("No values provided");
      });

      it("rejects mixed currencies", () => {
        expect(() => MajikMoney.median([usd(10), eur(20)])).toThrow(
          "Currency mismatch in median",
        );
      });
    });

    describe("min()", () => {
      it("finds minimum", () => {
        expectSameMoney(MajikMoney.min(list), usd(10));
      });

      it("supports negative values", () => {
        expectSameMoney(MajikMoney.min([usd(10), usd(-20), usd(5)]), usd(-20));
      });

      it("rejects empty arrays", () => {
        expect(() => MajikMoney.min([])).toThrow("No values provided");
      });

      it("rejects mixed currencies", () => {
        expect(() => MajikMoney.min([usd(10), eur(20)])).toThrow(
          "Currency mismatch",
        );
      });
    });

    describe("max()", () => {
      it("finds maximum", () => {
        expectSameMoney(MajikMoney.max(list), usd(30));
      });

      it("supports negative values", () => {
        expectSameMoney(MajikMoney.max([usd(-10), usd(-20), usd(-5)]), usd(-5));
      });

      it("rejects empty arrays", () => {
        expect(() => MajikMoney.max([])).toThrow("No values provided");
      });

      it("rejects mixed currencies", () => {
        expect(() => MajikMoney.max([usd(10), eur(20)])).toThrow(
          "Currency mismatch",
        );
      });
    });

    describe("variance()", () => {
      it("calculates population variance", () => {
        const result = MajikMoney.variance(list);

        expect(result.toMinor()).toBe(6667);
      });

      it("returns zero for identical values", () => {
        const result = MajikMoney.variance([usd(10), usd(10), usd(10)]);

        expect(result.isZero()).toBe(true);
      });

      it("supports negative values", () => {
        const result = MajikMoney.variance([usd(-10), usd(0), usd(10)]);

        expect(result.toMajor()).toBeCloseTo(66.67, 2);
      });

      it("works with one value", () => {
        const result = MajikMoney.variance([usd(50)]);

        expect(result.isZero()).toBe(true);
      });

      it("rejects empty arrays", () => {
        expect(() => MajikMoney.variance([])).toThrow("No values provided");
      });

      it("rejects mixed currencies", () => {
        expect(() => MajikMoney.variance([usd(10), eur(20)])).toThrow(
          "Currency mismatch",
        );
      });
    });

    describe("standardDeviation()", () => {
      it("calculates population standard deviation", () => {
        const result = MajikMoney.standardDeviation(list);

        expect(result.toMinor()).toBe(816);
      });
      it("returns zero for identical values", () => {
        const result = MajikMoney.standardDeviation([
          usd(10),
          usd(10),
          usd(10),
        ]);

        expect(result.isZero()).toBe(true);
      });

      it("supports negative values", () => {
        const result = MajikMoney.standardDeviation([
          usd(-10),
          usd(0),
          usd(10),
        ]);

        expect(result.toMajor()).toBeCloseTo(8.16, 2);
      });

      it("works with one value", () => {
        const result = MajikMoney.standardDeviation([usd(50)]);

        expect(result.isZero()).toBe(true);
      });

      it("rejects empty arrays", () => {
        expect(() => MajikMoney.standardDeviation([])).toThrow(
          "No values provided",
        );
      });

      it("rejects mixed currencies", () => {
        expect(() => MajikMoney.standardDeviation([usd(10), eur(20)])).toThrow(
          "Currency mismatch",
        );
      });
    });
  });

  // ===========================================================================
  // Serialization
  // ===========================================================================

  describe("Serialization", () => {
    describe("toJSON()", () => {
      it("returns the expected structure", () => {
        const money = usd(12.34);

        expect(money.toJSON()).toEqual({
          __type: "MajikMoney",
          amount: "1234",
          currency: "USD",
        });
      });

      it("serializes negative values", () => {
        expect(usd(-12.34).toJSON()).toEqual({
          __type: "MajikMoney",
          amount: "-1234",
          currency: "USD",
        });
      });

      it("serializes zero", () => {
        expect(usd(0).toJSON()).toEqual({
          __type: "MajikMoney",
          amount: "0",
          currency: "USD",
        });
      });

      it("serializes large amounts without number coercion", () => {
        const money = MajikMoney.fromMinor("90071992547409910", "USD");

        expect(money.toJSON()).toEqual({
          __type: "MajikMoney",
          amount: "90071992547409910",
          currency: "USD",
        });
      });
    });

    describe("serializeMoney()", () => {
      it("serializes a direct MajikMoney instance", () => {
        expect(serializeMoney(usd(15))).toEqual({
          __type: "MajikMoney",
          amount: "1500",
          currency: "USD",
        });
      });

      it("recursively serializes nested objects", () => {
        const data = {
          invoice: {
            subtotal: usd(100),
            tax: usd(12),
          },
        };

        expect(serializeMoney(data)).toEqual({
          invoice: {
            subtotal: {
              __type: "MajikMoney",
              amount: "10000",
              currency: "USD",
            },
            tax: {
              __type: "MajikMoney",
              amount: "1200",
              currency: "USD",
            },
          },
        });
      });

      it("recursively serializes arrays", () => {
        const data = [
          usd(10),
          usd(20),
          {
            amount: usd(30),
          },
        ];

        expect(serializeMoney(data)).toEqual([
          {
            __type: "MajikMoney",
            amount: "1000",
            currency: "USD",
          },
          {
            __type: "MajikMoney",
            amount: "2000",
            currency: "USD",
          },
          {
            amount: {
              __type: "MajikMoney",
              amount: "3000",
              currency: "USD",
            },
          },
        ]);
      });

      it("preserves primitives", () => {
        const data = {
          string: "hello",
          number: 42,
          boolean: true,
          nil: null,
        };

        expect(serializeMoney(data)).toEqual(data);
      });

      it("preserves ordinary nested objects without money", () => {
        const nested = {
          a: {
            b: {
              c: "value",
            },
          },
        };

        expect(serializeMoney(nested)).toEqual(nested);
      });

      it("does not mutate the input object", () => {
        const data = {
          price: usd(10),
        };

        const originalPrice = data.price;

        serializeMoney(data);

        expect(data.price).toBe(originalPrice);
        expect(data.price).toBeInstanceOf(MajikMoney);
      });
    });

    describe("deserializeMoney()", () => {
      it("revives a direct MajikMoney object", () => {
        const result = deserializeMoney({
          __type: "MajikMoney",
          amount: "1234",
          currency: "USD",
        });

        expect(result).toBeInstanceOf(MajikMoney);
        expectMoney(result, "1234", "USD");
      });

      it("recursively revives nested objects", () => {
        const result = deserializeMoney({
          invoice: {
            subtotal: {
              __type: "MajikMoney",
              amount: "10000",
              currency: "USD",
            },
          },
        });

        expect(result.invoice.subtotal).toBeInstanceOf(MajikMoney);

        expectMoney(result.invoice.subtotal, "10000", "USD");
      });

      it("recursively revives arrays", () => {
        const result = deserializeMoney([
          {
            __type: "MajikMoney",
            amount: "1000",
            currency: "USD",
          },
          {
            nested: {
              __type: "MajikMoney",
              amount: "2000",
              currency: "USD",
            },
          },
        ]);

        expect(result[0]).toBeInstanceOf(MajikMoney);
        expect(result[1].nested).toBeInstanceOf(MajikMoney);

        expectMoney(result[0], "1000", "USD");
        expectMoney(result[1].nested, "2000", "USD");
      });

      it("preserves ordinary objects", () => {
        const data = {
          name: "Subscription",
          amount: 10,
        };

        expect(deserializeMoney(data)).toEqual(data);
      });

      it("preserves primitives", () => {
        expect(deserializeMoney("hello")).toBe("hello");
        expect(deserializeMoney(42)).toBe(42);
        expect(deserializeMoney(true)).toBe(true);
        expect(deserializeMoney(null)).toBe(null);
      });

      it("rejects invalid MajikMoney currency during deserialization", () => {
        expect(() =>
          deserializeMoney({
            __type: "MajikMoney",
            amount: "1000",
            currency: "INVALID",
          }),
        ).toThrow("Unsupported currency INVALID");
      });
    });

    describe("JSON round-trip", () => {
      it("round-trips a simple money value", () => {
        const original = usd(123.45);

        const serialized = JSON.stringify(original);
        const parsed = JSON.parse(serialized);
        const restored = deserializeMoney(parsed);

        expect(restored).toBeInstanceOf(MajikMoney);
        expectSameMoney(restored, original);
      });

      it("round-trips nested application data", () => {
        const original = {
          customer: {
            name: "Alice",
            balance: usd(123.45),
          },
          invoice: {
            subtotal: usd(100),
            tax: usd(12),
            total: usd(112),
          },
          items: [
            {
              name: "Product",
              price: usd(100),
            },
          ],
        };

        const serialized = serializeMoney(original);
        const parsed = JSON.parse(JSON.stringify(serialized));
        const restored = deserializeMoney(parsed);

        expect(restored.customer.balance).toBeInstanceOf(MajikMoney);

        expectSameMoney(restored.customer.balance, original.customer.balance);

        expectSameMoney(restored.invoice.total, original.invoice.total);

        expectSameMoney(restored.items[0].price, original.items[0].price);
      });

      it("round-trips negative values", () => {
        const original = usd(-123.45);

        const restored = deserializeMoney(JSON.parse(JSON.stringify(original)));

        expectSameMoney(restored, original);
      });

      it("round-trips large values", () => {
        const original = MajikMoney.fromMinor("90071992547409910", "USD");

        const restored = deserializeMoney(JSON.parse(JSON.stringify(original)));

        expect(restored.toMinorString()).toBe(original.toMinorString());
      });
    });
  });

  // ===========================================================================
  // Immutability
  // ===========================================================================

  describe("Immutability", () => {
    it("add() returns a new instance", () => {
      const a = usd(10);
      const b = usd(5);
      const result = a.add(b);

      expect(result).not.toBe(a);
      expect(result).not.toBe(b);
    });

    it("subtract() returns a new instance", () => {
      const a = usd(10);
      const b = usd(5);
      const result = a.subtract(b);

      expect(result).not.toBe(a);
      expect(result).not.toBe(b);
    });

    it("multiply() returns a new instance", () => {
      const a = usd(10);
      const result = a.multiply(2);

      expect(result).not.toBe(a);
    });

    it("divide() returns a new instance", () => {
      const a = usd(10);
      const result = a.divide(2);

      expect(result).not.toBe(a);
    });

    it("percentage() returns a new instance", () => {
      const a = usd(10);
      const result = a.percentage(0.2);

      expect(result).not.toBe(a);
    });

    it("negate() returns a new instance", () => {
      const a = usd(10);
      const result = a.negate();

      expect(result).not.toBe(a);
    });

    it("abs() returns a new instance", () => {
      const a = usd(10);
      const result = a.abs();

      expect(result).not.toBe(a);
    });

    it("round() returns a new instance", () => {
      const a = usd(10.25);
      const result = a.round();

      expect(result).not.toBe(a);
    });

    it("roundTo() returns a new instance", () => {
      const a = usd(10.25);
      const result = a.roundTo(1);

      expect(result).not.toBe(a);
    });

    it("convert() returns a new instance", () => {
      const a = usd(10);
      const result = a.convert(1, CURRENCIES["EUR"]);

      expect(result).not.toBe(a);
    });

    it("negate twice returns equivalent original value", () => {
      const original = usd(-123.45);
      const restored = original.negate().negate();

      expectSameMoney(restored, original);
    });

    it("abs of abs remains equivalent", () => {
      const original = usd(-123.45);
      const result = original.abs().abs();

      expectSameMoney(result, usd(123.45));
    });

    it("adding zero preserves value", () => {
      const original = usd(123.45);
      const result = original.add(usd(0));

      expectSameMoney(result, original);
      expect(result).not.toBe(original);
    });

    it("subtracting zero preserves value", () => {
      const original = usd(123.45);
      const result = original.subtract(usd(0));

      expectSameMoney(result, original);
      expect(result).not.toBe(original);
    });
  });

  // ===========================================================================
  // Algebraic / financial invariants
  // ===========================================================================

  describe("Financial Invariants", () => {
    it("addition is commutative", () => {
      const a = usd(12.34);
      const b = usd(56.78);

      expectSameMoney(a.add(b), b.add(a));
    });

    it("addition is associative for exact minor-unit values", () => {
      const a = usd(10);
      const b = usd(20);
      const c = usd(30);

      expectSameMoney(a.add(b).add(c), a.add(b.add(c)));
    });

    it("subtracting the same value returns zero", () => {
      expect(usd(100).subtract(usd(100)).isZero()).toBe(true);
    });

    it("adding negated value returns zero", () => {
      const money = usd(100);

      expect(money.add(money.negate()).isZero()).toBe(true);
    });

    it("double negation returns original", () => {
      const money = usd(-100);

      expectSameMoney(money.negate().negate(), money);
    });

    it("absolute value is non-negative", () => {
      const samples = [usd(-100), usd(0), usd(100)];

      for (const money of samples) {
        expect(money.abs().isNonNegative()).toBe(true);
      }
    });

    it("sign matches predicate state", () => {
      const negative = usd(-1);
      const zero = usd(0);
      const positive = usd(1);

      expect(negative.sign()).toBe(-1);
      expect(negative.isNegative()).toBe(true);

      expect(zero.sign()).toBe(0);
      expect(zero.isZero()).toBe(true);

      expect(positive.sign()).toBe(1);
      expect(positive.isPositive()).toBe(true);
    });

    it("percentageOf(total) multiplied by total approximates the part", () => {
      const part = usd(25);
      const total = usd(100);

      const percentageRate = part.percentageOf(total).div(100);

      const reconstructed = total.multiply(percentageRate);

      expect(reconstructed.toMinor()).toBe(part.toMinor());
    });

    it("tax decomposition conserves the total", () => {
      const total = php(112);

      const base = total.taxExclusive(0.12);
      const tax = total.taxComponent(0.12);

      expect(sumMinor([base, tax]).toString()).toBe(total.toMinorString());
    });

    it("allocation always conserves money", () => {
      const cases: Array<{
        amount: string;
        ratios: number[];
      }> = [
        {
          amount: "1000",
          ratios: [1, 2, 3],
        },
        {
          amount: "1001",
          ratios: [1, 1, 1],
        },
        {
          amount: "9999",
          ratios: [5, 2, 7, 1],
        },
        {
          amount: "1",
          ratios: [1, 1, 1, 1],
        },
      ];

      for (const testCase of cases) {
        const money = MajikMoney.fromMinor(testCase.amount, "USD");

        const parts = money.allocate(testCase.ratios);

        expect(sumMinor(parts).toString()).toBe(money.toMinorString());
      }
    });

    it("evenSplit always conserves money", () => {
      for (const amount of [0, 1, 2, 10, 99, 100, 101, 1000]) {
        for (const parts of [1, 2, 3, 4, 7, 10]) {
          const money = MajikMoney.fromMinor(amount, "USD");

          const split = money.evenSplit(parts);

          expect(sumMinor(split).toString()).toBe(money.toMinorString());
        }
      }
    });

    it("min() never returns greater than either operand", () => {
      const pairs = [
        [usd(10), usd(20)],
        [usd(-10), usd(20)],
        [usd(20), usd(-10)],
        [usd(0), usd(0)],
      ];

      for (const [a, b] of pairs) {
        const result = a.min(b);

        expect(result.lessThanOrEqual(a)).toBe(true);
        expect(result.lessThanOrEqual(b)).toBe(true);
      }
    });

    it("max() never returns less than either operand", () => {
      const pairs = [
        [usd(10), usd(20)],
        [usd(-10), usd(20)],
        [usd(20), usd(-10)],
        [usd(0), usd(0)],
      ];

      for (const [a, b] of pairs) {
        const result = a.max(b);

        expect(result.greaterThanOrEqual(a)).toBe(true);
        expect(result.greaterThanOrEqual(b)).toBe(true);
      }
    });

    it("clamp result is always inside bounds", () => {
      const min = usd(-10);
      const max = usd(100);

      for (const value of [-100, -10, -5, 0, 50, 100, 200]) {
        const result = usd(value).clamp(min, max);

        expect(result.greaterThanOrEqual(min)).toBe(true);

        expect(result.lessThanOrEqual(max)).toBe(true);
      }
    });
  });

  // ===========================================================================
  // Currency scale matrix
  // ===========================================================================

  describe("Currency Minor-Unit Matrix", () => {
    it("handles 0-decimal currencies", () => {
      const money = jpy(1234);

      expect(money.toMinor()).toBe(1234);
      expect(money.toMajor()).toBe(1234);
      expect(money.toMajorString()).toBe("1234");
    });

    it("handles 2-decimal currencies", () => {
      const money = usd(1234.56);

      expect(money.toMinor()).toBe(123456);
      expect(money.toMajor()).toBe(1234.56);
      expect(money.toMajorString()).toBe("1234.56");
    });

    it("handles 3-decimal currencies", () => {
      const money = kwd(1234.567);

      expect(money.toMinor()).toBe(1234567);
      expect(money.toMajor()).toBe(1234.567);
      expect(money.toMajorString()).toBe("1234.567");
    });

    it("rounds excess precision correctly for 0-decimal currencies", () => {
      expect(jpy("1234.5").toMinor()).toBe(1234);
      expect(jpy("1235.5").toMinor()).toBe(1236);
    });

    it("rounds excess precision correctly for 2-decimal currencies", () => {
      expect(usd("1234.565").toMinor()).toBe(123456);
      expect(usd("1234.575").toMinor()).toBe(123458);
    });

    it("rounds excess precision correctly for 3-decimal currencies", () => {
      expect(kwd("1.2345").toMinor()).toBe(1234);
      expect(kwd("1.2355").toMinor()).toBe(1236);
    });

    it("preserves currency identity across arithmetic", () => {
      const currencies = [jpy(100), usd(100), kwd(100)];

      for (const money of currencies) {
        const result = money.add(money);

        expect(result.currency.code).toBe(money.currency.code);
      }
    });
  });

  // ===========================================================================
  // Error and defensive behaviour
  // ===========================================================================

  describe("Defensive Input Handling", () => {
    /**
     * These tests describe the desired runtime contract for a financial
     * primitive. TypeScript compile-time types are not sufficient because
     * JavaScript consumers can pass arbitrary runtime values.
     */

    it("rejects malformed currency names in zero()", () => {
      expect(() => MajikMoney.zero("usd")).toThrow();
      expect(() => MajikMoney.zero(" USD ")).toThrow();
    });

    it("rejects malformed currency names in fromMinor()", () => {
      expect(() => MajikMoney.fromMinor(100, "usd")).toThrow();

      expect(() => MajikMoney.fromMinor(100, " USD ")).toThrow();
    });

    it("rejects malformed currency names in fromMajor()", () => {
      expect(() => MajikMoney.fromMajor(100, "usd")).toThrow();

      expect(() => MajikMoney.fromMajor(100, " USD ")).toThrow();
    });

    it("rejects non-finite conversion rates", () => {
      expect(() => usd(100).convert(Number.NaN, CURRENCIES["EUR"])).toThrow();

      expect(() =>
        usd(100).convert(Number.POSITIVE_INFINITY, CURRENCIES["EUR"]),
      ).toThrow();

      expect(() =>
        usd(100).convert(Number.NEGATIVE_INFINITY, CURRENCIES["EUR"]),
      ).toThrow();
    });

    it("rejects non-finite quoted rates", () => {
      expect(() =>
        usd(100).convertFromQuoted(Number.NaN, CURRENCIES["EUR"]),
      ).toThrow();

      expect(() =>
        usd(100).convertFromQuoted(Number.POSITIVE_INFINITY, CURRENCIES["EUR"]),
      ).toThrow();
    });

    it("rejects non-finite percentage rates", () => {
      expect(() => usd(100).percentage(Number.NaN)).toThrow();

      expect(() => usd(100).percentage(Number.POSITIVE_INFINITY)).toThrow();
    });

    it("rejects non-finite multiplication factors", () => {
      expect(() => usd(100).multiply(Number.NaN)).toThrow();

      expect(() => usd(100).multiply(Number.POSITIVE_INFINITY)).toThrow();
    });

    it("rejects non-finite division divisors", () => {
      expect(() => usd(100).divide(Number.NaN)).toThrow();

      expect(() => usd(100).divide(Number.POSITIVE_INFINITY)).toThrow();
    });

    it("rejects non-finite compound rates", () => {
      expect(() => usd(100).compound(Number.NaN, 2)).toThrow();

      expect(() => usd(100).compound(Number.POSITIVE_INFINITY, 2)).toThrow();
    });
  });

  // ===========================================================================
  // Regression / representative financial scenarios
  // ===========================================================================

  describe("Financial Scenario Regression Tests", () => {
    it("calculates an invoice subtotal, VAT, and total", () => {
      const item1 = php(1250);
      const item2 = php(750);
      const item3 = php(1000);

      const subtotal = MajikMoney.sum([item1, item2, item3]);

      const vat = subtotal.tax(0.12);
      const total = subtotal.add(vat);

      expectSameMoney(subtotal, php(3000));
      expectSameMoney(vat, php(360));
      expectSameMoney(total, php(3360));
    });

    it("calculates discount followed by VAT", () => {
      const original = php(1000);
      const discounted = original.discount(0.1);
      const vat = discounted.tax(0.12);
      const total = discounted.add(vat);

      expectSameMoney(discounted, php(900));
      expectSameMoney(vat, php(108));
      expectSameMoney(total, php(1008));
    });

    it("calculates payment processor percentage fee plus flat fee", () => {
      const transaction = php(1000);
      const percentageFee = transaction.feePercentage(0.029);
      const fixedFee = php(15);

      const totalFees = percentageFee.add(fixedFee);

      expectSameMoney(percentageFee, php(29));

      expectSameMoney(totalFees, php(44));
    });

    it("allocates revenue share", () => {
      const revenue = php(10000);

      const shares = revenue.allocatePercentages([70, 20, 10]);

      expect(shares.map((s) => s.toMajor())).toEqual([7000, 2000, 1000]);

      expect(sumMinor(shares).toString()).toBe(revenue.toMinorString());
    });

    it("splits a bill evenly", () => {
      const bill = php(1000.01);
      const shares = bill.evenSplit(3);

      expect(shares.map((share) => share.toMinor())).toEqual([
        33334, 33333, 33334,
      ]);

      expect(sumMinor(shares).toString()).toBe(bill.toMinorString());
    });

    it("calculates a tax-inclusive amount and extracts tax later", () => {
      const base = php(2500);
      const total = base.taxInclusive(0.12);

      const recoveredBase = total.taxExclusive(0.12);
      const recoveredTax = total.taxComponent(0.12);

      expectSameMoney(recoveredBase, base);
      expectSameMoney(recoveredTax, php(300));
    });

    it("calculates compound investment growth", () => {
      const principal = usd(10000);

      const result = principal.compound(0.05, 10);

      expect(result.toMajor()).toBeCloseTo(16288.95, 2);
    });

    it("handles a refund as negative money", () => {
      const sale = usd(100);
      const refund = usd(-25);
      const net = sale.add(refund);

      expectSameMoney(net, usd(75));
      expect(net.isPositive()).toBe(true);
    });

    it("handles a chargeback that exceeds captured amount", () => {
      const captured = usd(100);
      const chargeback = usd(-125);
      const balance = captured.add(chargeback);

      expectSameMoney(balance, usd(-25));
      expect(balance.isNegative()).toBe(true);
    });

    it("handles FX conversion followed by rounding", () => {
      const source = usd(100);
      const converted = source.convert("57.1234", CURRENCIES["JPY"]);

      expect(converted.currency.code).toBe("JPY");
      expect(converted.toMinor()).toBe(5712);
    });
  });

  // ===========================================================================
  // API consistency matrix
  // ===========================================================================

  describe("API Consistency", () => {
    it("toMajorString() can round-trip through fromMajor()", () => {
      const original = usd(123.45);
      const serialized = original.toMajorString();

      const restored = MajikMoney.fromMajor(serialized, "USD");

      expectSameMoney(restored, original);
    });

    it("toCanonicalString() reflects exact minor units", () => {
      const money = MajikMoney.fromMinor("123456789", "USD");

      expect(money.toCanonicalString()).toBe("USD 123456789");
    });

    it("JSON amount is always based on minor units", () => {
      const money = usd(123.45);

      expect(money.toJSON().amount).toBe("12345");
    });

    it("currency helper agrees with currency code", () => {
      const a = usd(10);
      const b = usd(20);

      expect(a.isSameCurrency(b)).toBe(a.currency.code === b.currency.code);
    });

    it("equals() agrees with compare() == 0", () => {
      const values = [usd(-100), usd(0), usd(10), usd(123.45), usd(1000)];

      for (const a of values) {
        for (const b of values) {
          expect(a.equals(b)).toBe(a.compare(b) === 0);
        }
      }
    });

    it("compare() agrees with relational predicates", () => {
      const values = [usd(-100), usd(0), usd(10), usd(100)];

      for (const a of values) {
        for (const b of values) {
          const comparison = a.compare(b);

          expect(comparison === -1).toBe(a.lessThan(b));

          expect(comparison === 1).toBe(a.greaterThan(b));

          expect(comparison <= 0).toBe(a.lessThanOrEqual(b));

          expect(comparison >= 0).toBe(a.greaterThanOrEqual(b));
        }
      }
    });

    it("sign agrees with positive/negative/zero predicates", () => {
      const values = [usd(-100), usd(0), usd(100)];

      for (const money of values) {
        switch (money.sign()) {
          case -1:
            expect(money.isNegative()).toBe(true);
            expect(money.isZero()).toBe(false);
            expect(money.isPositive()).toBe(false);
            break;

          case 0:
            expect(money.isNegative()).toBe(false);
            expect(money.isZero()).toBe(true);
            expect(money.isPositive()).toBe(false);
            break;

          case 1:
            expect(money.isNegative()).toBe(false);
            expect(money.isZero()).toBe(false);
            expect(money.isPositive()).toBe(true);
            break;
        }
      }
    });
  });
});
