/**
 * Scheduler Service - 排程服務
 * 使用 node-cron 定期執行價格檢查等任務
 */

import cron from 'node-cron';
import { checkAndTriggerAlerts } from './priceAlertService.js';
import { sendDailySummaryToAllUsers } from './dailySummaryService.js';
import { Client } from '@line/bot-sdk';

/**
 * 啟動所有排程任務
 * @param lineClient LINE Bot Client（用於推播通知）
 */
export function startScheduler(lineClient: Client) {
  console.log('🚀 啟動排程服務...');

  // 每 5 分鐘檢查一次價格警示
  // Cron 格式: */5 * * * * = 每 5 分鐘
  // 台股開盤時間：週一至週五 09:00-13:30
  // 美股開盤時間：週一至週五 21:30-04:00 (台灣時間)

  const priceCheckTask = cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('⏰ [排程] 開始執行價格檢查...');
      await checkAndTriggerAlerts(lineClient);
      console.log('✅ [排程] 價格檢查完成');
    } catch (error) {
      console.error('❌ [排程] 價格檢查失敗:', error);
    }
  });

  priceCheckTask.start();
  console.log('✅ 價格檢查排程已啟動 (每 5 分鐘執行一次)');

  // 每天晚上 21:00 台灣時間執行（UTC+8 → UTC 13:00）
  const dailySummaryTask = cron.schedule('0 13 * * *', async () => {
    try {
      console.log('⏰ [排程] 開始執行每日總結...');
      const result = await sendDailySummaryToAllUsers(lineClient);
      console.log(`✅ [排程] 每日總結完成 - 成功: ${result.successCount}, 失敗: ${result.failCount}`);
    } catch (error) {
      console.error('❌ [排程] 每日總結失敗:', error);
    }
  });

  dailySummaryTask.start();
  console.log('✅ 每日總結排程已啟動 (每天 21:00 執行)');

  return {
    priceCheckTask,
    dailySummaryTask
  };
}

/**
 * 停止所有排程任務
 */
export function stopScheduler(tasks: { priceCheckTask: any, dailySummaryTask: any }) {
  console.log('🛑 停止排程服務...');
  tasks.priceCheckTask.stop();
  tasks.dailySummaryTask.stop();
  console.log('✅ 所有排程已停止');
}
