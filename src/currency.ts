


export interface CurrencyDefinition {
    code: string;
    symbol: string;
    minorUnits: number;
    name: string;
}




export const CURRENCIES: Record<string, CurrencyDefinition> = {
    "USD": { "code": "USD", "name": "US Dollar", "symbol": "$", "minorUnits": 2 },
    "EUR": { "code": "EUR", "name": "Euro", "symbol": "€", "minorUnits": 2 },
    "JPY": { "code": "JPY", "name": "Yen", "symbol": "¥", "minorUnits": 0 },
    "GBP": { "code": "GBP", "name": "Pound Sterling", "symbol": "£", "minorUnits": 2 },
    "CHF": { "code": "CHF", "name": "Swiss Franc", "symbol": "CHF", "minorUnits": 2 },
    "AUD": { "code": "AUD", "name": "Australian Dollar", "symbol": "$", "minorUnits": 2 },
    "CAD": { "code": "CAD", "name": "Canadian Dollar", "symbol": "$", "minorUnits": 2 },
    "CNY": { "code": "CNY", "name": "Yuan Renminbi", "symbol": "¥", "minorUnits": 2 },
    "HKD": { "code": "HKD", "name": "Hong Kong Dollar", "symbol": "$", "minorUnits": 2 },
    "SGD": { "code": "SGD", "name": "Singapore Dollar", "symbol": "$", "minorUnits": 2 },

    "PHP": { "code": "PHP", "name": "Philippine Peso", "symbol": "₱", "minorUnits": 2 },
    "KRW": { "code": "KRW", "name": "Won", "symbol": "₩", "minorUnits": 0 },
    "INR": { "code": "INR", "name": "Indian Rupee", "symbol": "₹", "minorUnits": 2 },
    "IDR": { "code": "IDR", "name": "Rupiah", "symbol": "Rp", "minorUnits": 2 },
    "THB": { "code": "THB", "name": "Baht", "symbol": "฿", "minorUnits": 2 },
    "MYR": { "code": "MYR", "name": "Ringgit", "symbol": "RM", "minorUnits": 2 },
    "VND": { "code": "VND", "name": "Dong", "symbol": "₫", "minorUnits": 0 },

    "KWD": { "code": "KWD", "name": "Kuwaiti Dinar", "symbol": "د.ك", "minorUnits": 3 },
    "BHD": { "code": "BHD", "name": "Bahraini Dinar", "symbol": ".د.ب", "minorUnits": 3 },
    "JOD": { "code": "JOD", "name": "Jordanian Dinar", "symbol": "د.ا", "minorUnits": 3 },

    "CLP": { "code": "CLP", "name": "Chilean Peso", "symbol": "$", "minorUnits": 0 },
    "COP": { "code": "COP", "name": "Colombian Peso", "symbol": "$", "minorUnits": 2 },
    "MXN": { "code": "MXN", "name": "Mexican Peso", "symbol": "$", "minorUnits": 2 },
    "BRL": { "code": "BRL", "name": "Brazilian Real", "symbol": "R$", "minorUnits": 2 },
    "ARS": { "code": "ARS", "name": "Argentine Peso", "symbol": "$", "minorUnits": 2 },

    "ZAR": { "code": "ZAR", "name": "Rand", "symbol": "R", "minorUnits": 2 },
    "NGN": { "code": "NGN", "name": "Naira", "symbol": "₦", "minorUnits": 2 },
    "KES": { "code": "KES", "name": "Kenyan Shilling", "symbol": "KSh", "minorUnits": 2 },
    "EGP": { "code": "EGP", "name": "Egyptian Pound", "symbol": "£", "minorUnits": 2 },

    "RUB": { "code": "RUB", "name": "Russian Ruble", "symbol": "₽", "minorUnits": 2 },
    "TRY": { "code": "TRY", "name": "Turkish Lira", "symbol": "₺", "minorUnits": 2 },
    "PLN": { "code": "PLN", "name": "Zloty", "symbol": "zł", "minorUnits": 2 },
    "CZK": { "code": "CZK", "name": "Czech Koruna", "symbol": "Kč", "minorUnits": 2 },
    "HUF": { "code": "HUF", "name": "Forint", "symbol": "Ft", "minorUnits": 2 }
}
