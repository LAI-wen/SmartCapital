import React, { useState } from 'react';
import { Transaction, TransactionType, Account } from '../types';
import { TRANSACTION_CATEGORIES } from '../constants';
import {
  createTransaction as apiCreateTransaction,
  deleteTransaction as apiDeleteTransaction,
  batchDeleteTransactions as apiBatchDeleteTransactions,
  getTransactions as fetchTransactions,
} from '../services';

interface UseLedgerActionsOptions {
  accounts: Account[];
  transactions: Transaction[];
  setTransactions: (txs: Transaction[]) => void;
  onAccountsUpdate?: () => void;
}

export const useLedgerActions = ({
  accounts,
  transactions,
  setTransactions,
  onAccountsUpdate,
}: UseLedgerActionsOptions) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const reloadTransactions = async () => {
    try {
      const txs = await fetchTransactions(200);
      setTransactions(txs);
    } catch (error) {
      console.error('❌ 刷新交易失敗:', error);
    }
  };

  const openModal = (tx?: Transaction) => {
    if (tx) {
      setEditingId(tx.id);
      setFormType(tx.type);
      setFormAmount(tx.amount.toString());
      setFormCategory(tx.category);
      setFormDate(tx.date.split('T')[0]);
      setFormNote(tx.note);
      setFormAccountId(tx.accountId);
    } else {
      const defaultAccount = accounts.find(acc => acc.isDefault) || accounts[0];
      setEditingId(null);
      setFormType('expense');
      setFormAmount('');
      setFormCategory(TRANSACTION_CATEGORIES.expense[0]);
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormNote('');
      setFormAccountId(defaultAccount?.id || '');
    }
    setIsModalOpen(true);
  };

  const handleQuickAdd = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !quickAmount) return;
    const amount = parseFloat(quickAmount);
    if (isNaN(amount) || amount <= 0) return;
    const defaultAccount = accounts.find(acc => acc.isDefault) || accounts[0];
    if (!defaultAccount) { alert('請先建立帳戶'); return; }
    try {
      const newTx = await apiCreateTransaction(
        'expense', amount, '其他', new Date().toISOString().split('T')[0], '快速記帳', defaultAccount.id
      );
      if (newTx) {
        setTransactions([newTx, ...transactions]);
        onAccountsUpdate?.();
      }
    } catch (error) {
      console.error('❌ 快速記帳失敗:', error);
      alert('記帳失敗，請重試');
    }
    setQuickAmount('');
  };

  const handleSave = async () => {
    if (!formAmount) return;
    const amountVal = Math.abs(parseFloat(formAmount));
    if (!formAccountId) { alert('請選擇帳戶'); return; }
    try {
      if (editingId) {
        await apiDeleteTransaction(editingId);
        const newTx = await apiCreateTransaction(formType, amountVal, formCategory, formDate, formNote, formAccountId);
        if (newTx) { setIsModalOpen(false); await reloadTransactions(); onAccountsUpdate?.(); }
      } else {
        const newTx = await apiCreateTransaction(formType, amountVal, formCategory, formDate, formNote, formAccountId);
        if (newTx) {
          setIsModalOpen(false); await reloadTransactions(); onAccountsUpdate?.();
        } else {
          const account = accounts.find(a => a.id === formAccountId);
          if (formType === 'expense' && account && account.balance < amountVal) {
            alert(`帳戶餘額不足！\n${account.name} 餘額：${account.currency === 'TWD' ? 'NT$' : '$'}${account.balance}\n需要金額：${account.currency === 'TWD' ? 'NT$' : '$'}${amountVal}`);
          } else {
            alert('儲存失敗，請重試');
          }
        }
      }
    } catch (error) {
      console.error('❌ 儲存交易失敗:', error);
      if (error instanceof Error && error.message.includes('餘額不足')) {
        alert(error.message);
      } else {
        alert('儲存失敗，請重試');
      }
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!confirm('確定要刪除此紀錄嗎？')) return;
    const updateBalance = confirm(
      '是否要同步更新帳戶餘額？\n\n• 點選「確定」：刪除記錄並回復帳戶餘額\n• 點選「取消」：只刪除記錄，不影響帳戶餘額'
    );
    try {
      const skipBalanceUpdate = !updateBalance;
      const success = await apiDeleteTransaction(editingId, skipBalanceUpdate);
      if (success) {
        setIsModalOpen(false);
        await reloadTransactions();
        if (!skipBalanceUpdate) onAccountsUpdate?.();
      }
    } catch (error) {
      console.error('❌ 刪除交易失敗:', error);
      alert('刪除失敗，請重試');
    }
  };

  const toggleSelectMode = () => {
    setIsSelectMode(prev => !prev);
    setSelectedIds(new Set());
  };

  const toggleSelectTransaction = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllInView = (ids: string[]) => {
    setSelectedIds(new Set(ids));
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) { alert('請選擇要刪除的交易記錄'); return; }
    if (!confirm(`確定要刪除 ${selectedIds.size} 筆交易記錄嗎？`)) return;
    const updateBalance = confirm(
      '是否要同步更新帳戶餘額？\n\n• 點選「確定」：刪除記錄並回復帳戶餘額\n• 點選「取消」：只刪除記錄，不影響帳戶餘額'
    );
    try {
      const idsArray: string[] = Array.from(selectedIds);
      const skipBalanceUpdate = !updateBalance;
      const result = await apiBatchDeleteTransactions(idsArray, skipBalanceUpdate);
      if (result) {
        if (result.errors?.length) {
          alert(`部分刪除失敗：${result.deletedCount}/${result.totalRequested} 筆成功`);
        } else {
          alert(`成功刪除 ${result.deletedCount} 筆交易記錄`);
        }
        await reloadTransactions();
        if (!skipBalanceUpdate) onAccountsUpdate?.();
        setIsSelectMode(false);
        setSelectedIds(new Set());
      } else {
        alert('批次刪除失敗，請檢查網路連線或查看控制台錯誤訊息');
      }
    } catch (error) {
      console.error('❌ 批次刪除失敗:', error);
      alert('批次刪除失敗，請重試');
    }
  };

  return {
    editingId, isModalOpen, setIsModalOpen,
    formType, setFormType,
    formAmount, setFormAmount,
    formCategory, setFormCategory,
    formDate, setFormDate,
    formNote, setFormNote,
    formAccountId, setFormAccountId,
    quickAmount, setQuickAmount,
    isSelectMode, selectedIds,
    openModal, handleQuickAdd, handleSave, handleDelete,
    toggleSelectMode, toggleSelectTransaction, selectAllInView, handleBatchDelete,
  };
};
