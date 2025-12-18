# Majik Money

**Majik Money** lightweight JavaScript/TypeScript library for precise money and currency modeling, engineered to eliminate floating-point errors inherent in JavaScript. 
It’s perfect for scenarios where you need **financial calculations, currency conversions, accounting operations, or money-based simulations** with exact results.

---

## ✨ Features

- Represent money and currencies with full decimal precision using [decimal.js](https://www.npmjs.com/package/decimal.js).
- Perform arithmetic operations (add, subtract, multiply, divide) without floating-point errors.
- Convert between minor and major currency units automatically.
- Support for currency conversion between multiple defined currencies.
- Chainable API for fluent money operations.
- Serialize/deserialize money objects with toJSON() and parseFromJSON().
- Fully TypeScript-friendly with strict type safety.
- Works in Node.js and browser environments.
---

## Why Majik Money is More Than decimal.js

[decimal.js](https://www.npmjs.com/package/decimal.js) gives you arbitrary-precision arithmetic, but Majik Money adds a full financial and currency layer, designed for real-world applications:

### Currency & Unit Awareness

- Each instance is tied to an ISO 4217 currency (USD, PHP, etc.), including minor unit handling (cents, centavos).
- Automatic conversion between major units (dollars/pesos) and minor units (cents/centavos) with correct rounding.

### Immutable, Chainable Operations

- All operations (add, subtract, multiply, etc.) return new MajikMoney instances, preventing accidental mutations.
- Chainable API enables concise, readable financial calculations.

### Allocation & Splitting

- Split amounts evenly or according to custom ratios, with remainders handled correctly.
- Perfect for payroll, expense sharing, or dividing investments.

### Percentage & Compound Calculations

- Built-in methods for applying, adding, or subtracting percentages, e.g., taxes, discounts, or interest.
- Compound growth calculations as MajikMoney objects, preserving precision and rounding rules.

### Serialization & Safe JSON

- Includes currency info and type hints for safe storage and transport.
- Recursive helpers (serializeMoney / deserializeMoney) make working with nested objects seamless.

### Statistical Helpers

- Array-level calculations like sum, average, weighted average, median, variance, and standard deviation with currency safety.

### Currency Conversion & FX Support

- Convert between currencies with explicit rates or quoted FX rates.
- Avoids errors from manual conversions.

### Human-Friendly Formatting

Localized currency formatting (₱1,234.56) ready for display.

### Domain-Specific Utilities

- Inverted division (invertDivide) for financial ratios.
- Designed specifically for money modeling, not just numbers.

**In short:** decimal.js handles numbers. Majik Money handles real money — safely, accurately, and with all the financial logic your applications need.

---

##  Full API Docs
---

## 📦 Installation

```bash
npm i @thezelijah/majik-money
```

---

## Usage

### Create a Money Instance
```ts
import { MajikMoney, CURRENCIES } from "@thezelijah/majik-money";

// From major units (human-readable, e.g., dollars/pesos)
const majorAmount = MajikMoney.fromMajor(1234.56, "PHP");

// From minor units (integer, e.g., centavos)
const minorAmount = MajikMoney.fromMinor(123456, "PHP");

console.log(majorAmount.format()); // "₱1,234.56"
console.log(minorAmount.format()); // "₱1,234.56"
;   

```


### Arithmetic Operations (Immutable)
```ts
const a = MajikMoney.fromMajor(100, "USD");
const b = MajikMoney.fromMajor(50, "USD");

const sum = a.add(b);               // 150 USD
const difference = a.subtract(b);   // 50 USD
const product = a.multiply(3);      // 300 USD
const quotient = a.divide(4);       // 25 USD

console.log(sum.toString(), difference.toString(), product.toString(), quotient.toString());

```


### Percentage Operations
Array of periods with interest, principal, total, and tax.
```ts
const price = MajikMoney.fromMajor(200, "PHP");

const tax = price.applyPercentage(0.12);       // 12% of 200
const priceWithTax = price.addPercentage(0.12);
const priceAfterDiscount = price.subtractPercentage(0.1); // 10% discount
```


### Compound Growth
```ts
const principal = MajikMoney.fromMajor(1000, "USD");
const futureValue = principal.compound(0.05, 3); // 5% per period for 3 periods
console.log(futureValue.format()); // "₱1,157.63" (example)
```

### Allocation / Splitting
```ts
const total = MajikMoney.fromMajor(1000, "PHP");

// Even split
const parts = total.evenSplit(3);
parts.forEach(p => console.log(p.format())); // [₱333.34, ₱333.33, ₱333.33]

// Custom allocation ratios
const allocated = total.allocate([1, 2, 3]);
allocated.forEach(p => console.log(p.format())); // e.g., ₱166.67, ₱333.33, ₱500.00
```



### Currency Conversion
```ts
const usd = MajikMoney.fromMajor(100, "USD");
const php = usd.convert(56.75, CURRENCIES["PHP"]);
console.log(php.format()); // "₱5,675.00"

// Using quoted FX rate
const php2 = usd.convertFromQuoted(0.01763, CURRENCIES["PHP"]);
console.log(php2.format());
```


### Comparison & Utility Methods
```ts
const x = MajikMoney.fromMajor(100, "USD");
const y = MajikMoney.fromMajor(50, "USD");

console.log(x.equals(y));       // false
console.log(x.greaterThan(y));  // true
console.log(x.isPositive());    // true
console.log(x.negate().isNegative()); // true
```

### Ratios & Inverted Operations
```ts
const x = MajikMoney.fromMajor(200, "PHP");
console.log(x.ratio(MajikMoney.fromMajor(50, "PHP"))); // 4

const inverted = x.invertDivide(2); // 2 ÷ 200 PHP
console.log(inverted.toMajor()); // 0.01 PHP
```


### Serialization & Deserialization
```ts
const money = MajikMoney.fromMajor(1234.56, "PHP");
const json = money.toJSON();
console.log(json); // { amount: "123456", currency: "PHP", __type: "MajikMoney" }

const parsed = MajikMoney.parseFromJSON(json);
console.log(parsed.format()); // "₱1,234.56"

// Recursive helpers for complex objects
const serialized = serializeMoney({ payment: money });
const deserialized = deserializeMoney(serialized);
console.log(deserialized.payment.format()); // "₱1,234.56"
```


### Statistical Helpers (Static Methods)
```ts
const arr = [
  MajikMoney.fromMajor(100, "USD"),
  MajikMoney.fromMajor(200, "USD"),
  MajikMoney.fromMajor(300, "USD")
];

console.log(MajikMoney.sum(arr).format());          // 600 USD
console.log(MajikMoney.average(arr).format());      // 200 USD
console.log(MajikMoney.weightedAverage(arr, [1,2,3]).format()); // 233.33 USD
console.log(MajikMoney.median(arr).format());       // 200 USD
console.log(MajikMoney.min(arr).format());          // 100 USD
console.log(MajikMoney.max(arr).format());          // 300 USD
console.log(MajikMoney.standardDeviation(arr).toMajor()); // ~81.65 USD
```

---

### Use Cases

- Accounting and ledger operations with exact arithmetic.
- Currency conversion for fintech or e-commerce apps.
- Budgeting and expense tracking with precise calculations.
- Financial dashboards or calculators.
- Simulations for investments or payments over time.

### Best Practices

- Always use MajikMoney objects instead of raw numbers for calculations.
- Avoid mixing currencies without explicit conversion rates.
- Serialize with toJSON() for storage and communication.
- Use chainable operations for concise and readable code.
- Prefer toMajor() for display to users, and toMinor() for storage or calculations.


## Contributing

Contributions, bug reports, and suggestions are welcome! Feel free to fork and open a pull request.

---

## License

[ISC](LICENSE) — free for personal and commercial use.

---

## Author

Made with 💙 by [@thezelijah](https://github.com/jedlsf)


## About the Developer

- **Developer**: Josef Elijah Fabian  
- **GitHub**: [https://github.com/jedlsf](https://github.com/jedlsf)  
- **Project Repository**: [https://github.com/jedlsf/majik-money](https://github.com/jedlsf/majik-money)  

---

## Contact

- **Business Email**: [business@thezelijah.world](mailto:business@thezelijah.world)  
- **Official Website**: [https://www.thezelijah.world](https://www.thezelijah.world)  

---



