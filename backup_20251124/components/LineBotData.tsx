/**
 * LINE Bot 資料測試頁面
 * 顯示從 LINE Bot 後端讀取的即時資料
 */

import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3000';

// 從 URL 參數或 localStorage 取得 User ID
function getUserId(): string {
  // 1. 先檢查 URL 參數
  const params = new URLSearchParams(window.location.search);
  const userIdFromUrl = params.get('userId');

  if (userIdFromUrl) {
    // 儲存到 localStorage
    localStorage.setItem('lineUserId', userIdFromUrl);
    return userIdFromUrl;
  }

  // 2. 從 localStorage 讀取
  const savedUserId = localStorage.getItem('lineUserId');
  if (savedUserId) {
    return savedUserId;
  }

  // 3. 預設值（給開發測試用）
  return 'Ucb528757211bf9eef17f7f0a391dd56e';
}

const USER_ID = getUserId();

interface Asset {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  profit: number;
  profitPercent: number;
}

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string;
}

interface Portfolio {
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  totalProfitPercent: number;
  assets: Asset[];
}

export default function LineBotData() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 載入投資組合
      const portfolioRes = await fetch(`${API_BASE}/api/portfolio/${USER_ID}`);
      const portfolioData = await portfolioRes.json();

      // 載入交易記錄
      const transactionsRes = await fetch(`${API_BASE}/api/transactions/${USER_ID}`);
      const transactionsData = await transactionsRes.json();

      if (portfolioData.success) {
        setPortfolio(portfolioData.data);
      }

      if (transactionsData.success) {
        setTransactions(transactionsData.data);
      }

      setLoading(false);
    } catch (err) {
      console.error('載入資料失敗:', err);
      setError('無法連接到後端 API，請確認伺服器是否運行中');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
        <div style={{ fontSize: '18px', color: '#78716C' }}>載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
        <div style={{ fontSize: '18px', color: '#D68C92', marginBottom: '20px' }}>
          {error}
        </div>
        <button
          onClick={loadData}
          style={{
            padding: '10px 20px',
            background: '#84A98C',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          重試
        </button>
      </div>
    );
  }

  const hasData = portfolio && (portfolio.assets.length > 0 || transactions.length > 0);

  if (!hasData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📱</div>
        <div style={{ fontSize: '20px', color: '#44403C', marginBottom: '10px' }}>
          還沒有資料
        </div>
        <div style={{ fontSize: '14px', color: '#78716C', marginBottom: '20px', lineHeight: '1.6' }}>
          前往 LINE Bot 輸入以下指令：<br />
          • 買入股票：<code>TSLA</code> → 點擊買入<br />
          • 記帳：<code>-100</code> → 選擇分類
        </div>
        <button
          onClick={loadData}
          style={{
            padding: '10px 20px',
            background: '#84A98C',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          🔄 重新整理
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h1 style={{ color: '#44403C', marginBottom: '10px' }}>📊 LINE Bot 即時資料</h1>
        <p style={{ color: '#78716C', fontSize: '14px' }}>
          資料來自你的 LINE Bot 記帳與投資助理
        </p>
        <div style={{
          display: 'inline-block',
          marginTop: '10px',
          padding: '6px 12px',
          background: '#F9F8F4',
          borderRadius: '20px',
          fontSize: '12px',
          color: '#78716C'
        }}>
          🔐 已登入
        </div>
        <br />
        <button
          onClick={loadData}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            background: '#F9F8F4',
            border: '1px solid #E5E5E5',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🔄 重新整理
        </button>
      </div>

      {/* 投資組合 */}
      {portfolio && portfolio.assets.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ color: '#44403C', fontSize: '20px', marginBottom: '20px' }}>
            💰 投資組合
          </h2>

          {/* 總覽卡片 */}
          <div
            style={{
              background: '#F9F8F4',
              padding: '24px',
              borderRadius: '12px',
              marginBottom: '20px'
            }}
          >
            <div style={{ marginBottom: '8px', fontSize: '14px', color: '#78716C' }}>
              總資產價值
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#44403C', marginBottom: '8px' }}>
              ${portfolio.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: portfolio.totalProfit >= 0 ? '#84A98C' : '#D68C92'
              }}
            >
              {portfolio.totalProfit >= 0 ? '+' : ''}
              ${portfolio.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              {' '}
              ({portfolio.totalProfit >= 0 ? '+' : ''}
              {portfolio.totalProfitPercent.toFixed(2)}%)
            </div>
            <div style={{ fontSize: '14px', color: '#78716C', marginTop: '8px' }}>
              成本: ${portfolio.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* 資產列表 */}
          <div style={{ display: 'grid', gap: '12px' }}>
            {portfolio.assets.map((asset) => {
              const isProfit = asset.profit >= 0;
              return (
                <div
                  key={asset.symbol}
                  style={{
                    background: 'white',
                    border: '1px solid #E5E5E5',
                    borderRadius: '8px',
                    padding: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#44403C' }}>
                        {asset.symbol}
                      </div>
                      <div style={{ fontSize: '12px', color: '#78716C' }}>
                        {asset.name}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#44403C' }}>
                        ${asset.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 'bold',
                          color: isProfit ? '#84A98C' : '#D68C92'
                        }}
                      >
                        {isProfit ? '+' : ''}${asset.profit.toFixed(2)} ({isProfit ? '+' : ''}
                        {asset.profitPercent.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#78716C' }}>
                    持有 {asset.quantity} 股 @ ${asset.avgPrice.toFixed(2)} → 現價 $
                    {asset.currentPrice.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 交易記錄 */}
      {transactions.length > 0 && (
        <div>
          <h2 style={{ color: '#44403C', fontSize: '20px', marginBottom: '20px' }}>
            📝 交易記錄
          </h2>
          <div style={{ display: 'grid', gap: '8px' }}>
            {transactions.slice(0, 10).map((tx) => {
              const isIncome = tx.type === 'income';
              return (
                <div
                  key={tx.id}
                  style={{
                    background: 'white',
                    border: '1px solid #E5E5E5',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#44403C' }}>
                      {tx.category}
                    </div>
                    <div style={{ fontSize: '12px', color: '#78716C' }}>
                      {new Date(tx.date).toLocaleDateString('zh-TW')}
                      {tx.note && ` • ${tx.note}`}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: isIncome ? '#84A98C' : '#D68C92'
                    }}
                  >
                    {isIncome ? '+' : '-'}${tx.amount.toFixed(0)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 資料來源提示 */}
      <div
        style={{
          marginTop: '30px',
          padding: '16px',
          background: '#F9F8F4',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#78716C'
        }}
      >
        💡 所有資料來自 LINE Bot 即時同步<br />
        在 LINE 中輸入指令，資料會自動更新到這裡
      </div>
    </div>
  );
}
