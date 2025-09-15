/**
 * Currency utilities for Qwiken app
 * All prices are displayed in NZD (New Zealand Dollar)
 */

export const CURRENCY = {
  code: 'NZD',
  symbol: '$',
  name: 'New Zealand Dollar',
  locale: 'en-NZ',
};

/**
 * Format a price value to NZD currency format
 * @param amount - The numeric amount to format
 * @param showSymbol - Whether to show the currency symbol (default: true)
 * @param showCode - Whether to show the currency code (default: false)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number | string | null | undefined,
  showSymbol: boolean = true,
  showCode: boolean = false
): string => {
  // Handle null, undefined, or invalid values
  if (amount === null || amount === undefined) {
    return showSymbol ? `${CURRENCY.symbol}0.00` : '0.00';
  }
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return showSymbol ? `${CURRENCY.symbol}0.00` : '0.00';
  }

  // Format the number with 2 decimal places
  const formatted = numAmount.toFixed(2);
  
  // Build the final string
  let result = '';
  if (showSymbol) {
    result = `${CURRENCY.symbol}${formatted}`;
  } else {
    result = formatted;
  }
  
  if (showCode) {
    result = `${result} ${CURRENCY.code}`;
  }
  
  return result;
};

/**
 * Format a price range
 * @param minAmount - The minimum amount
 * @param maxAmount - The maximum amount (optional)
 * @returns Formatted price range string
 */
export const formatPriceRange = (
  minAmount: number | string | null | undefined,
  maxAmount?: number | string | null | undefined
): string => {
  if (maxAmount && maxAmount !== minAmount) {
    return `${formatCurrency(minAmount)} - ${formatCurrency(maxAmount)}`;
  }
  return formatCurrency(minAmount);
};

/**
 * Parse a currency string to number
 * @param value - The currency string to parse
 * @returns The numeric value
 */
export const parseCurrency = (value: string): number => {
  // Remove currency symbols and spaces
  const cleanValue = value.replace(/[$,\s]/g, '').replace('NZD', '');
  return parseFloat(cleanValue) || 0;
};

/**
 * Convert from old currency (kr/SEK) to NZD (for migration purposes)
 * This is a placeholder - in production, you'd use real exchange rates
 * Current approximate rate: 1 SEK = 0.15 NZD
 */
export const convertFromSEK = (sekAmount: number): number => {
  const conversionRate = 0.15;
  return sekAmount * conversionRate;
};

export default {
  CURRENCY,
  formatCurrency,
  formatPriceRange,
  parseCurrency,
  convertFromSEK,
};