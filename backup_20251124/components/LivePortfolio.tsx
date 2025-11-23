/**
 * Live Portfolio Component - 即時投資組合
 * 從 LINE Bot 後端即時獲取資料
 */

import { useState, useEffect } from 'react';
import { getPortfolio, getAssets } from '../services/api';

interface Asset {
  symbol: string;
  name: string;
  type: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  profit: number;
  profitPercent: number;
}

interface PortfolioData {
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  totalProfitPercent: number;
  assets: Asset[];
}

export default function LivePortfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      const data = await getPortfolio();
      if (data) {
        setPortfolio(data);
        setError(null);
      } else {
        setError('無法載入投資組合資料');
      }
    } catch (err) {
      setError('載入失敗，請稍後再試');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>載入中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#D68C92' }}>
        <p>{error}</p>
        <button onClick={loadPortfolio} style={{ marginTop: '10px' }}>
          重新載入
        </button>
      </div>
    );
  }

  if (!portfolio || portfolio.assets.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>尚無投資資料</p>
        <p style={{ fontSize: '14px', color: '#78716C', marginTop: '10px' }}>
          在 LINE Bot 中輸入股票代號（如 TSLA）並買入，資料就會顯示在這裡
        </p>
      </div>
    );
  }

  const isProfit = portfolio.totalProfit >= 0;

  return (
    <div style={{ padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <h2 style={{ color: '#44403C', marginBottom: '20px' }}>
        📊 即時投資組合
      </h2>

      {/* 總覽卡片 */}
      <div
        style={{
          background: '#F9F8F4',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px'
        }}
      >
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '14px', color: '#78716C' }}>總資產價值</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#44403C' }}>
            ${portfolio.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div
          style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: isProfit ? '#84A98C' : '#D68C92'
          }}
        >
          {isProfit ? '+' : ''}${portfolio.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          {' '}
          ({isProfit ? '+' : ''}{portfolio.totalProfitPercent.toFixed(2)}%)
        </div>
        <div style={{ fontSize: '14px', color: '#78716C', marginTop: '5px' }}>
          成本: ${portfolio.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* 資產列表 */}
      <div>
        <h3 style={{ color: '#44403C', fontSize: '18px', marginBottom: '15px' }}>
          持倉明細
        </h3>
        {portfolio.assets.map((asset) => {
          const assetProfit = asset.profit >= 0;
          return (
            <div
              key={asset.symbol}
              style={{
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '10px',
                border: '1px solid #E5E5E5'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#44403C' }}>
                    {asset.symbol}
                  </div>
                  <div style={{ fontSize: '12px', color: '#78716C' }}>
                    {asset.name}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold', color: '#44403C' }}>
                    ${asset.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: assetProfit ? '#84A98C' : '#D68C92',
                      fontWeight: 'bold'
                    }}
                  >
                    {assetProfit ? '+' : ''}${asset.profit.toFixed(2)} ({assetProfit ? '+' : ''}{asset.profitPercent.toFixed(2)}%)
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#78716C' }}>
                持有 {asset.quantity} 股 @ ${asset.avgPrice.toFixed(2)} → 現價 ${asset.currentPrice.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>

      {/* 重新整理按鈕 */}
      <button
        onClick={loadPortfolio}
        style={{
          width: '100%',
          padding: '12px',
          marginTop: '20px',
          background: '#84A98C',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        🔄 重新整理
      </button>

      <div
        style={{
          marginTop: '15px',
          padding: '10px',
          background: '#F9F8F4',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#78716C',
          textAlign: 'center'
        }}
      >
        💡 資料來自 LINE Bot 即時同步
      </div>
    </div>
  );
}
