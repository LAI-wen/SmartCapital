import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CurrencyAmount from './CurrencyAmount';

describe('CurrencyAmount', () => {
  it('renders symbol and amount when no originalCurrency', () => {
    render(<CurrencyAmount amount={50} currency="USD" />);
    screen.getByText('$50');
    expect(screen.queryByText('→')).toBeNull();
  });

  it('renders symbol and amount when originalCurrency equals currency', () => {
    render(<CurrencyAmount amount={50} currency="TWD" originalCurrency="TWD" />);
    screen.getByText('NT$50');
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
    screen.getByText('$10');
    screen.getByText('→');
    screen.getByText('NT$315');
    screen.getByText('(@31.50)');
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
    screen.getByText('NT$315');
  });
});
