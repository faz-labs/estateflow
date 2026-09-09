/**
 * Currency configuration and formatting engine for EstateFlow.
 * Supports multi-tenant currency assignment (USD, GBP, CHF, BDT, EUR, etc.).
 */

export interface CurrencyItem {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  wordsUnit: string;
}

export const SUPPORTED_CURRENCIES: CurrencyItem[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', wordsUnit: 'Dollars' },
  { code: 'GBP', symbol: '£', name: 'British Pound Sterling', locale: 'en-GB', wordsUnit: 'Pounds' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH', wordsUnit: 'Swiss Francs' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', locale: 'en-IN', wordsUnit: 'Taka' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', wordsUnit: 'Euros' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', locale: 'en-AE', wordsUnit: 'Dirhams' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', locale: 'ar-SA', wordsUnit: 'Riyals' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA', wordsUnit: 'Canadian Dollars' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar', locale: 'en-AU', wordsUnit: 'Australian Dollars' },
  { code: 'QAR', symbol: 'QAR', name: 'Qatari Riyal', locale: 'en-QA', wordsUnit: 'Qatari Riyals' },
  { code: 'KWD', symbol: 'KWD', name: 'Kuwaiti Dinar', locale: 'en-KW', wordsUnit: 'Kuwaiti Dinars' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', wordsUnit: 'Rupees' },
  { code: 'SGD', symbol: 'SG$', name: 'Singapore Dollar', locale: 'en-SG', wordsUnit: 'Singapore Dollars' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', locale: 'ms-MY', wordsUnit: 'Ringgit' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP', wordsUnit: 'Yen' },
];

export const DEFAULT_CURRENCY_CODE = 'USD';

export function getCurrency(code?: string): CurrencyItem {
  if (!code) return SUPPORTED_CURRENCIES[0];
  const found = SUPPORTED_CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
  return found || SUPPORTED_CURRENCIES[0];
}

/**
 * Formats a monetary amount according to the tenant's currency configuration.
 * e.g. formatCurrency(1250000, 'USD') -> "$1,250,000"
 *      formatCurrency(1250000, 'GBP') -> "£1,250,000"
 *      formatCurrency(1250000, 'CHF') -> "CHF 1,250,000"
 *      formatCurrency(1250000, 'BDT') -> "৳1,250,000"
 */
export function formatCurrency(amount: number | null | undefined, currencyCode?: string): string {
  const num = amount ?? 0;
  const curr = getCurrency(currencyCode);

  try {
    const formattedNumber = Math.round(num).toLocaleString(curr.locale);
    // For CHF or multi-letter codes, add space between symbol and number
    if (curr.symbol.length > 2) {
      return `${curr.symbol} ${formattedNumber}`;
    }
    return `${curr.symbol}${formattedNumber}`;
  } catch {
    return `${curr.symbol}${Math.round(num).toLocaleString()}`;
  }
}

/**
 * Compact currency formatter for KPI dashboard cards.
 * Uses Cr/Lacs for BDT and INR; uses M/K for USD, GBP, CHF, EUR, etc.
 */
export function formatCompactCurrency(amount: number | null | undefined, currencyCode?: string): string {
  const num = amount ?? 0;
  const curr = getCurrency(currencyCode);
  const isSouthAsian = curr.code === 'BDT' || curr.code === 'INR';

  const prefix = curr.symbol.length > 2 ? `${curr.symbol} ` : curr.symbol;

  if (isSouthAsian) {
    if (Math.abs(num) >= 10000000) {
      return `${prefix}${(num / 10000000).toFixed(2)} Cr`;
    }
    if (Math.abs(num) >= 100000) {
      return `${prefix}${(num / 100000).toFixed(2)} Lacs`;
    }
    return `${prefix}${Math.round(num).toLocaleString(curr.locale)}`;
  }

  // Western & Middle Eastern standard: M (Millions) and K (Thousands)
  if (Math.abs(num) >= 1000000) {
    return `${prefix}${(num / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(num) >= 1000) {
    return `${prefix}${(num / 1000).toFixed(1)}K`;
  }
  return `${prefix}${Math.round(num).toLocaleString(curr.locale)}`;
}

/**
 * Convert a monetary amount into English words for official receipts and invoices,
 * with appropriate scale words (Million/Billion vs Crore/Lakh) and unit names.
 */
export function formatAmountInWords(amount: number | null | undefined, currencyCode?: string): string {
  const num = Math.round(Math.abs(amount ?? 0));
  const curr = getCurrency(currencyCode);
  if (num === 0) return `Zero ${curr.wordsUnit} Only`;

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  const helper3 = (n: number): string => {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    } else if (n > 0) {
      str += ones[n];
    }
    return str.trim();
  };

  const isSouthAsian = curr.code === 'BDT' || curr.code === 'INR';
  let words = '';

  if (isSouthAsian) {
    let remainder = num;
    const crore = Math.floor(remainder / 10000000);
    remainder %= 10000000;
    const lakh = Math.floor(remainder / 100000);
    remainder %= 100000;
    const thousand = Math.floor(remainder / 1000);
    remainder %= 1000;
    const hundred = Math.floor(remainder / 100);
    remainder %= 100;

    if (crore > 0) words += helper3(crore) + ' Crore ';
    if (lakh > 0) words += helper3(lakh) + ' Lakh ';
    if (thousand > 0) words += helper3(thousand) + ' Thousand ';
    if (hundred > 0) words += helper3(hundred) + ' Hundred ';
    if (remainder > 0) {
      if (words !== '') words += 'and ';
      words += helper3(remainder) + ' ';
    }
  } else {
    let remainder = num;
    const billion = Math.floor(remainder / 1000000000);
    remainder %= 1000000000;
    const million = Math.floor(remainder / 1000000);
    remainder %= 1000000;
    const thousand = Math.floor(remainder / 1000);
    remainder %= 1000;

    if (billion > 0) words += helper3(billion) + ' Billion ';
    if (million > 0) words += helper3(million) + ' Million ';
    if (thousand > 0) words += helper3(thousand) + ' Thousand ';
    if (remainder > 0) {
      const remainderWords = helper3(remainder);
      if (words !== '' && remainder < 100) words += 'and ';
      words += remainderWords + ' ';
    }
  }

  return `${words.trim().replace(/\s+/g, ' ')} ${curr.wordsUnit} Only`;
}

