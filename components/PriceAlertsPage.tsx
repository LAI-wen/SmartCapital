
import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Plus, Trash2, TrendingUp, TrendingDown, Target, AlertCircle, Zap } from 'lucide-react';
import {
  getPriceAlerts,
  createPriceAlert,
  updatePriceAlert,
  deletePriceAlert,
  createDefaultAlerts,
  type PriceAlert,
  type AlertType,
  type AlertDirection,
  type CreatePriceAlertInput
} from '../services';
import { Asset, InvestmentScope } from '../types';
import { useMemo } from 'react';

interface PriceAlertsPageProps {
  assets: Asset[];
  investmentScope: InvestmentScope;
}

const PriceAlertsPage: React.FC<PriceAlertsPageProps> = ({ assets, investmentScope }) => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingDefaults, setIsCreatingDefaults] = useState(false);

  // Filter Assets based on Investment Scope
  const scopeFilteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const isTW = asset.currency === 'TWD';
      const isCrypto = asset.type === 'Crypto';
      const isUS = !isTW && !isCrypto;

      if (isTW && !investmentScope.tw) return false;
      if (isUS && !investmentScope.us) return false;
      if (isCrypto && !investmentScope.crypto) return false;
      return true;
    });
  }, [assets, investmentScope]);

  // Load alerts on mount
  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const fetchedAlerts = await getPriceAlerts();
      setAlerts(fetchedAlerts);
    } catch (error) {
      console.error('載入警示失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAlert = async (alertId: string, currentStatus: boolean) => {
    const success = await updatePriceAlert(alertId, !currentStatus);
    if (success) {
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, isActive: !currentStatus } : a));
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm('確定要刪除這個警示嗎？')) return;

    const success = await deletePriceAlert(alertId);
    if (success) {
      setAlerts(alerts.filter(a => a.id !== alertId));
    }
  };

  const handleCreateDefaultAlerts = async () => {
    if (scopeFilteredAssets.length === 0) {
      alert('您目前沒有持倉，無法建立預設警示');
      return;
    }

    if (!confirm(`將為您的 ${scopeFilteredAssets.length} 個持倉建立預設警示（單日漲跌 ±5%、停利 +10%、停損 -10%），確定要繼續嗎？`)) {
      return;
    }

    setIsCreatingDefaults(true);
    try {
      const success = await createDefaultAlerts(5, 10, 10);
      if (success) {
        alert('預設警示建立成功！');
        loadAlerts();
      } else {
        alert('建立預設警示失敗，請稍後再試');
      }
    } catch (error) {
      console.error('建立預設警示失敗:', error);
      alert('建立預設警示失敗，請稍後再試');
    } finally {
      setIsCreatingDefaults(false);
    }
  };

  const getAlertTypeIcon = (type: AlertType) => {
    switch (type) {
      case 'DAILY_CHANGE': return <TrendingUp size={18} />;
      case 'PROFIT_LOSS': return <TrendingDown size={18} />;
      case 'STOP_PROFIT': return <Target size={18} className="text-green-600" />;
      case 'STOP_LOSS': return <AlertCircle size={18} className="text-red-600" />;
      case 'TARGET_PRICE': return <Zap size={18} className="text-yellow-600" />;
    }
  };

  const getAlertTypeLabel = (type: AlertType) => {
    const labels = {
      'DAILY_CHANGE': '單日漲跌',
      'PROFIT_LOSS': '累計盈虧',
      'STOP_PROFIT': '停利點',
      'STOP_LOSS': '停損點',
      'TARGET_PRICE': '目標價'
    };
    return labels[type];
  };

  const getAlertDescription = (alert: PriceAlert) => {
    const { alertType, threshold, targetPrice, direction, referencePrice } = alert;

    switch (alertType) {
      case 'DAILY_CHANGE':
        return `${direction === 'UP' ? '上漲' : direction === 'DOWN' ? '下跌' : '漲跌'} ≥ ${threshold}%`;
      case 'PROFIT_LOSS':
        return `盈虧 ≥ ${threshold}% (成本 $${referencePrice?.toFixed(2)})`;
      case 'STOP_PROFIT':
        return `獲利 ≥ ${threshold}% (成本 $${referencePrice?.toFixed(2)})`;
      case 'STOP_LOSS':
        return `虧損 ≥ ${threshold}% (成本 $${referencePrice?.toFixed(2)})`;
      case 'TARGET_PRICE':
        return `目標價 $${targetPrice?.toFixed(2)}`;
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-ink-400 text-sm">載入中...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900 font-serif mb-2">價格警示</h1>
        <p className="text-sm text-ink-400 font-serif">設定股票價格提醒，不錯過重要時機</p>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <button
          onClick={handleCreateDefaultAlerts}
          disabled={isCreatingDefaults || scopeFilteredAssets.length === 0}
          className="flex items-center justify-center gap-2 p-4 bg-morandi-sage text-white rounded-xl font-bold text-sm font-serif hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap size={18} />
          {isCreatingDefaults ? '建立中...' : '快速建立預設警示'}
        </button>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 p-4 bg-morandi-blue text-white rounded-xl font-bold text-sm font-serif hover:bg-opacity-90 transition-all"
        >
          <Plus size={18} />
          新增自訂警示
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
          <div className="text-xs text-ink-400 font-serif mb-1">總警示數</div>
          <div className="text-2xl font-bold text-ink-900 font-serif">{alerts.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
          <div className="text-xs text-ink-400 font-serif mb-1">啟用中</div>
          <div className="text-2xl font-bold text-morandi-sage font-serif">
            {alerts.filter(a => a.isActive).length}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-stone-100 shadow-sm text-center">
            <Bell size={48} className="text-stone-300 mx-auto mb-3" />
            <p className="text-ink-400 text-sm font-serif mb-4">您還沒有設定任何價格警示</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-morandi-sage text-white rounded-xl font-bold text-sm font-serif hover:bg-opacity-90 transition-all"
            >
              立即建立
            </button>
          </div>
        ) : (
          alerts.map(alert => (
            <div
              key={alert.id}
              className={`bg-white p-4 rounded-xl border shadow-sm transition-all ${
                alert.isActive ? 'border-morandi-sage' : 'border-stone-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${alert.isActive ? 'bg-morandi-sage bg-opacity-10' : 'bg-stone-100'}`}>
                    {getAlertTypeIcon(alert.alertType)}
                  </div>
                  <div>
                    <div className="font-bold text-ink-900 font-serif text-sm">
                      {alert.name || alert.symbol}
                    </div>
                    <div className="text-xs text-ink-400 font-serif">
                      {getAlertTypeLabel(alert.alertType)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleAlert(alert.id, alert.isActive)}
                    className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    {alert.isActive ? (
                      <Bell size={18} className="text-morandi-sage" />
                    ) : (
                      <BellOff size={18} className="text-stone-400" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} className="text-red-500" />
                  </button>
                </div>
              </div>

              <div className="ml-11 space-y-1">
                <div className="text-sm text-ink-700 font-serif">
                  {getAlertDescription(alert)}
                </div>
                {alert.triggerCount > 0 && (
                  <div className="text-xs text-ink-400 font-serif">
                    已觸發 {alert.triggerCount} 次
                    {alert.lastTriggered && ` • 上次: ${new Date(alert.lastTriggered).toLocaleString('zh-TW')}`}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Alert Modal */}
      {showCreateModal && (
        <CreateAlertModal
          assets={scopeFilteredAssets}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadAlerts();
          }}
        />
      )}
    </div>
  );
};

// Create Alert Modal Component
interface CreateAlertModalProps {
  assets: Asset[];
  onClose: () => void;
  onSuccess: () => void;
}

const CreateAlertModal: React.FC<CreateAlertModalProps> = ({ assets, onClose, onSuccess }) => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [alertType, setAlertType] = useState<AlertType>('DAILY_CHANGE');
  const [threshold, setThreshold] = useState<number>(5);
  const [targetPrice, setTargetPrice] = useState<number>(0);
  const [direction, setDirection] = useState<AlertDirection>('BOTH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAsset) {
      alert('請選擇一個資產');
      return;
    }

    setIsSubmitting(true);

    const input: CreatePriceAlertInput = {
      symbol: selectedAsset.symbol,
      name: selectedAsset.name,
      alertType,
      threshold: alertType !== 'TARGET_PRICE' ? threshold : undefined,
      targetPrice: alertType === 'TARGET_PRICE' ? targetPrice : undefined,
      direction: alertType === 'DAILY_CHANGE' ? direction : undefined,
      referencePrice: ['PROFIT_LOSS', 'STOP_PROFIT', 'STOP_LOSS'].includes(alertType)
        ? selectedAsset.avgPrice
        : undefined
    };

    try {
      const result = await createPriceAlert(input);
      if (result) {
        alert('警示建立成功！');
        onSuccess();
      } else {
        alert('建立警示失敗，請稍後再試');
      }
    } catch (error) {
      console.error('建立警示失敗:', error);
      alert('建立警示失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-ink-900 font-serif mb-4">新增價格警示</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Select Asset */}
            <div>
              <label className="block text-sm font-bold text-ink-900 font-serif mb-2">選擇資產</label>
              <select
                value={selectedAsset?.symbol || ''}
                onChange={(e) => setSelectedAsset(assets.find(a => a.symbol === e.target.value) || null)}
                className="w-full p-3 border border-stone-200 rounded-xl font-serif text-sm"
                required
              >
                <option value="">請選擇...</option>
                {assets.map(asset => (
                  <option key={asset.symbol} value={asset.symbol}>
                    {asset.name} ({asset.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Alert Type */}
            <div>
              <label className="block text-sm font-bold text-ink-900 font-serif mb-2">警示類型</label>
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value as AlertType)}
                className="w-full p-3 border border-stone-200 rounded-xl font-serif text-sm"
              >
                <option value="DAILY_CHANGE">單日漲跌</option>
                <option value="PROFIT_LOSS">累計盈虧</option>
                <option value="STOP_PROFIT">停利點</option>
                <option value="STOP_LOSS">停損點</option>
                <option value="TARGET_PRICE">目標價</option>
              </select>
            </div>

            {/* Direction (for DAILY_CHANGE only) */}
            {alertType === 'DAILY_CHANGE' && (
              <div>
                <label className="block text-sm font-bold text-ink-900 font-serif mb-2">方向</label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as AlertDirection)}
                  className="w-full p-3 border border-stone-200 rounded-xl font-serif text-sm"
                >
                  <option value="BOTH">上漲或下跌</option>
                  <option value="UP">僅上漲</option>
                  <option value="DOWN">僅下跌</option>
                </select>
              </div>
            )}

            {/* Threshold or Target Price */}
            {alertType === 'TARGET_PRICE' ? (
              <div>
                <label className="block text-sm font-bold text-ink-900 font-serif mb-2">目標價格</label>
                <input
                  type="number"
                  step="0.01"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(parseFloat(e.target.value))}
                  className="w-full p-3 border border-stone-200 rounded-xl font-serif text-sm"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold text-ink-900 font-serif mb-2">閾值 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-full p-3 border border-stone-200 rounded-xl font-serif text-sm"
                  required
                />
              </div>
            )}

            {/* Reference Price Info */}
            {selectedAsset && ['PROFIT_LOSS', 'STOP_PROFIT', 'STOP_LOSS'].includes(alertType) && (
              <div className="p-3 bg-stone-50 rounded-xl">
                <div className="text-xs text-ink-400 font-serif">
                  參考成本價: ${selectedAsset.avgPrice.toFixed(2)}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 p-3 border border-stone-200 rounded-xl font-bold text-sm font-serif text-ink-700 hover:bg-stone-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 p-3 bg-morandi-sage text-white rounded-xl font-bold text-sm font-serif hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '建立中...' : '建立警示'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PriceAlertsPage;
