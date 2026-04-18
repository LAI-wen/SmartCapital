import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CurrencyAmount from './CurrencyAmount';

describe('CurrencyAmount', () => {
  it('renders symbol and amount when no originalCurrency', () => {
    render(<CurrencyAmount amount={50} currency="USD" />);
    expect(screen.getByText('$50')).toBeTruthy();
  });

  it('renders symbol and amount when originalCurrency equals currency', () => {
    render(<CurrencyAmount amount={50} currency="TWD" originalCurrency="TWD" />);
    expect(screen.getByText('NT$50')).toBeTruthy();
  });

  it('shows original, arrow, converted, and rate when showOriginal=true', () => {
    render(
      <CurrencyAmount
        amount={315}
        currency="TWD"
        originalCurrency="USD"
        originalAmount={10}
        exchangeRate={31.5}
        showOriginal={true}
      />
    );
    expect(screen.getByText('$10')).toBeTruthy();
    expect(screen.getByText('→')).toBeTruthy();
    expect(screen.getByText('NT$315')).toBeTruthy();
    expect(screen.getByText('(@31.50)')).toBeTruthy();
  });

  it('shows only converted amount when showOriginal=false', () => {
    render(
      <CurrencyAmount
        amount={315}
        currency="TWD"
        originalCurrency="USD"
        originalAmount={10}
        showOriginal={false}
      />
    );
    expect(screen.queryByText('→')).toBeNull();
    expect(screen.getByText('NT$315')).toBeTruthy();
  });
});
