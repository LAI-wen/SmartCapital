import React, { useState, useEffect } from 'react';
import { Account } from '../types';
import { getAccounts, createAccount, updateAccountBalance, deleteAccount } from '../services/api';
import {
  Wallet, Building2, Landmark, Coins, Plus, Edit3,
  Trash2, DollarSign, Check, X, AlertCircle
} from 'lucide-react';

interface AccountManagementPageProps {
  onAccountsUpdate?: () => void;
}

const AccountManagementPage: React.FC<AccountManagementPageProps> = ({ onAccountsUpdate }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState('');

  // Form state for creating new account
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<'CASH' | 'BANK' | 'BROKERAGE' | 'EXCHANGE'>('BANK');
  const [newAccountCurrency, setNewAccountCurrency] = useState<'TWD' | 'USD'>('TWD');
  const [newAccountBalance, setNewAccountBalance] = useState('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const accs = await getAccounts();
      setAccounts(accs);
      console.log('✅ AccountManagement: 已載入', accs.length, '個帳戶');
    } catch (error) {
      console.error('❌ AccountManagement: 載入失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccountName) {
      alert('請輸入帳戶名稱');
      return;
    }

    try {
      const newAccount = await createAccount({
        name: newAccountName,
        type: newAccountType,
        currency: newAccountCurrency,
        balance: parseFloat(newAccountBalance) || 0,
        isDefault: accounts.length === 0, // First account is default
        isSub: false
      });

      if (newAccount) {
        console.log('✅ 帳戶創建成功:', newAccount);
        await loadAccounts();
        setIsCreating(false);
        setNewAccountName('');
        setNewAccountBalance('');
        onAccountsUpdate?.();
      }
    } catch (error) {
      console.error('❌ 創建帳戶失敗:', error);
      alert('創建失敗，請重試');
    }
  };

  const handleUpdateBalance = async (accountId: string) => {
    const newBalance = parseFloat(editBalance);
    if (isNaN(newBalance) || newBalance < 0) {
      alert('請輸入有效金額');
      return;
    }

    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    const difference = newBalance - account.balance;
    const operation = difference >= 0 ? 'add' : 'subtract';

    try {
      const success = await updateAccountBalance(accountId, Math.abs(difference), operation);
      if (success) {
        console.log('✅ 餘額更新成功');
        await loadAccounts();
        setEditingId(null);
        onAccountsUpdate?.();
      }
    } catch (error) {
      console.error('❌ 更新餘額失敗:', error);
      alert('更新失敗，請重試');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    // 防止刪除預設帳戶
    if (account.isDefault && accounts.length > 1) {
      alert('無法刪除預設帳戶，請先將其他帳戶設為預設');
      return;
    }

    // 確認刪除
    const confirmMessage = account.balance > 0
      ? `確定要刪除「${account.name}」嗎？帳戶餘額為 ${account.currency === 'TWD' ? 'NT$' : '$'}${account.balance.toLocaleString()}，刪除後無法恢復。`
      : `確定要刪除「${account.name}」嗎？刪除後無法恢復。`;

    if (!confirm(confirmMessage)) return;

    try {
      const success = await deleteAccount(accountId);
      if (success) {
        console.log('✅ 帳戶刪除成功');
        await loadAccounts();
        onAccountsUpdate?.();
      }
    } catch (error) {
      console.error('❌ 刪除帳戶失敗:', error);
      alert('刪除失敗，請重試');
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'CASH': return <Wallet size={24} />;
      case 'BANK': return <Building2 size={24} />;
      case 'BROKERAGE': return <Landmark size={24} />;
      case 'EXCHANGE': return <Coins size={24} />;
      default: return <Wallet size={24} />;
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'CASH': return '現金';
      case 'BANK': return '銀行帳戶';
      case 'BROKERAGE': return '證券戶';
      case 'EXCHANGE': return '交易所';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-morandi-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-ink-400 font-serif">載入帳戶中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-20">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-ink-900 font-serif mb-2">帳戶管理</h2>
        <p className="text-sm text-ink-500 font-serif">管理你的資金帳戶和餘額</p>
      </div>

      {/* Total Balance Summary */}
      <div className="bg-gradient-to-br from-morandi-blue to-ink-800 p-6 rounded-2xl text-white shadow-soft mb-6">
        <h3 className="text-sm opacity-80 mb-2 font-serif">總餘額</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs">台幣 (TWD)</span>
            <span className="text-2xl font-bold font-serif-num">
              NT$ {accounts.filter(a => a.currency === 'TWD').reduce((sum, a) => sum + a.balance, 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs">美金 (USD)</span>
            <span className="text-2xl font-bold font-serif-num">
              $ {accounts.filter(a => a.currency === 'USD').reduce((sum, a) => sum + a.balance, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Add New Account Button */}
      {!isCreating && (
        <button
          onClick={() => setIsCreating(true)}
          className="w-full bg-white border-2 border-dashed border-stone-300 hover:border-morandi-blue rounded-2xl p-4 mb-6 flex items-center justify-center gap-2 text-morandi-blue font-bold transition-all hover:bg-morandi-blueLight/10"
        >
          <Plus size={20} />
          新增帳戶
        </button>
      )}

      {/* Create Account Form */}
      {isCreating && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-ink-900 font-serif">新增帳戶</h3>
            <button onClick={() => setIsCreating(false)} className="text-ink-400 hover:text-ink-900">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Account Name */}
            <div>
              <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">帳戶名稱</label>
              <input
                type="text"
                value={newAccountName}
                onChange={e => setNewAccountName(e.target.value)}
                placeholder="例如：台新銀行、元大證券"
                className="w-full bg-paper border border-stone-200 px-4 py-3 rounded-xl text-sm font-bold text-ink-900 focus:outline-none focus:border-morandi-blue focus:ring-4 focus:ring-morandi-blue/10 transition"
              />
            </div>

            {/* Account Type */}
            <div>
              <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">帳戶類型</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'BANK', label: '銀行帳戶', icon: <Building2 size={18} /> },
                  { value: 'CASH', label: '現金', icon: <Wallet size={18} /> },
                  { value: 'BROKERAGE', label: '證券戶', icon: <Landmark size={18} /> },
                  { value: 'EXCHANGE', label: '交易所', icon: <Coins size={18} /> }
                ].map(type => (
                  <button
                    key={type.value}
                    onClick={() => setNewAccountType(type.value as any)}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition ${
                      newAccountType === type.value
                        ? 'bg-ink-50 border-ink-900 text-ink-900 shadow-sm'
                        : 'bg-white border-stone-200 text-ink-400 hover:border-stone-300'
                    }`}
                  >
                    {type.icon}
                    <span className="text-xs font-bold">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">幣別</label>
              <div className="grid grid-cols-2 gap-3">
                {['TWD', 'USD'].map(curr => (
                  <button
                    key={curr}
                    onClick={() => setNewAccountCurrency(curr as any)}
                    className={`py-3 rounded-xl border transition text-sm font-bold ${
                      newAccountCurrency === curr
                        ? 'bg-ink-50 border-ink-900 text-ink-900'
                        : 'bg-white border-stone-200 text-ink-400 hover:border-stone-300'
                    }`}
                  >
                    {curr === 'TWD' ? '新台幣 (TWD)' : '美元 (USD)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Initial Balance */}
            <div>
              <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">初始餘額</label>
              <input
                type="number"
                value={newAccountBalance}
                onChange={e => setNewAccountBalance(e.target.value)}
                placeholder="0"
                className="w-full bg-paper border border-stone-200 px-4 py-3 rounded-xl text-sm font-bold text-ink-900 focus:outline-none focus:border-morandi-blue focus:ring-4 focus:ring-morandi-blue/10 transition"
              />
            </div>

            <button
              onClick={handleCreateAccount}
              className="w-full bg-morandi-blue text-white py-3 rounded-xl font-bold hover:bg-opacity-90 transition"
            >
              <Check size={18} className="inline mr-2" />
              創建帳戶
            </button>
          </div>
        </div>
      )}

      {/* Accounts List */}
      <div className="space-y-3">
        {accounts.length === 0 ? (
          <div className="text-center py-12 text-ink-400">
            <Wallet size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-serif">尚無帳戶，請新增第一個帳戶</p>
          </div>
        ) : (
          accounts.map(account => (
            <div
              key={account.id}
              className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                {/* Account Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-morandi-blueLight/30 flex items-center justify-center text-morandi-blue shrink-0">
                    {getAccountIcon(account.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-ink-900 font-serif">{account.name}</h3>
                      {account.isDefault && (
                        <span className="text-[10px] bg-morandi-sage text-white px-2 py-0.5 rounded-full font-bold">預設</span>
                      )}
                    </div>
                    <p className="text-xs text-ink-400 font-serif mb-2">
                      {getAccountTypeLabel(account.type)} • {account.currency}
                      {account.isSub && ' • 複委託'}
                    </p>

                    {/* Balance Display/Edit */}
                    {editingId === account.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editBalance}
                          onChange={e => setEditBalance(e.target.value)}
                          className="flex-1 border border-morandi-blue px-3 py-2 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-morandi-blue/20"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateBalance(account.id)}
                          className="bg-morandi-sage text-white p-2 rounded-lg hover:bg-opacity-90 transition"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-stone-200 text-ink-600 p-2 rounded-lg hover:bg-stone-300 transition"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold font-serif-num text-ink-900">
                          {account.currency === 'TWD' ? 'NT$' : '$'} {account.balance.toLocaleString()}
                        </span>
                        <button
                          onClick={() => {
                            setEditingId(account.id);
                            setEditBalance(account.balance.toString());
                          }}
                          className="text-morandi-blue hover:bg-morandi-blueLight/30 p-1.5 rounded-lg transition"
                          title="編輯餘額"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.id)}
                          className="text-morandi-rose hover:bg-red-50 p-1.5 rounded-lg transition"
                          title="刪除帳戶"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Note */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={18} />
          <div className="text-xs text-blue-700 leading-relaxed">
            <p className="font-bold mb-1">💡 使用提示</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>點擊編輯圖示可以調整帳戶餘額</li>
              <li>買賣股票時會自動從相應帳戶扣款或入帳</li>
              <li>證券戶用於股票交易，銀行帳戶用於日常收支</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountManagementPage;
