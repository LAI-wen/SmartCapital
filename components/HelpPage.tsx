
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, PlayCircle, MessageSquare, Mail } from 'lucide-react';

const HelpPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "如何開始第一筆記帳？",
      a: "點擊底部的「記帳」標籤，或直接在首頁點擊「記一筆」。您也可以使用頂部的快速輸入框，輸入金額後按下 Enter 即可。"
    },
    {
      q: "什麼是凱利公式？",
      a: "凱利公式是一種資金管理策略，用於計算在勝率與賠率已知的情況下，最佳的下注（投資）比例，以最大化長期資產增長速度。"
    },
    {
      q: "如何綁定 LINE Bot？",
      a: "前往「設定」頁面，點擊上方的 LINE 助理卡片中的「立即綁定」，掃描 QR Code 並加入好友即可開始使用。"
    },
    {
      q: "資料安全嗎？",
      a: "您的所有數據均經過加密存儲。我們提供本地備份功能，並且不會將您的個人財務數據出售給第三方。"
    }
  ];

  return (
    <div className="animate-fade-in pb-20">
       
       {/* Hero / Tutorial Video Mock */}
       <div className="mb-8">
          <h3 className="text-xl font-bold font-serif text-ink-900 mb-4">新手入門教學</h3>
          <div className="relative w-full aspect-video bg-ink-900 rounded-2xl overflow-hidden shadow-lg group cursor-pointer">
             <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors"></div>
             <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <PlayCircle size={48} className="mb-2 opacity-90 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold font-serif">3 分鐘快速上手</span>
             </div>
             {/* Decorative Elements */}
             <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">03:15</div>
          </div>
       </div>

       {/* FAQ Section */}
       <h3 className="text-lg font-bold font-serif text-ink-900 mb-4">常見問題 (FAQ)</h3>
       <div className="space-y-3 mb-8">
          {faqs.map((item, idx) => (
            <div key={idx} className="bg-white border border-stone-100 rounded-xl overflow-hidden shadow-sm transition-all">
               <button 
                 onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                 className="w-full flex items-center justify-between p-4 text-left hover:bg-stone-50"
               >
                  <span className="text-sm font-bold text-ink-900 font-serif">{item.q}</span>
                  {openFaq === idx ? <ChevronUp size={16} className="text-morandi-blue"/> : <ChevronDown size={16} className="text-ink-300"/>}
               </button>
               <div className={`overflow-hidden transition-all duration-300 bg-stone-50 ${openFaq === idx ? 'max-h-40 p-4 pt-0' : 'max-h-0'}`}>
                  <p className="text-xs text-ink-500 font-serif leading-relaxed">
                     {item.a}
                  </p>
               </div>
            </div>
          ))}
       </div>

       {/* Contact Section */}
       <h3 className="text-lg font-bold font-serif text-ink-900 mb-4">需要更多協助？</h3>
       <div className="grid grid-cols-2 gap-4">
          <button className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col items-center justify-center gap-3 hover:border-morandi-blue transition-colors group">
             <div className="w-10 h-10 rounded-full bg-morandi-blueLight flex items-center justify-center text-morandi-blue group-hover:bg-morandi-blue group-hover:text-white transition-colors">
                <MessageSquare size={20} />
             </div>
             <span className="text-sm font-bold text-ink-900 font-serif">線上客服</span>
          </button>
          <button className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col items-center justify-center gap-3 hover:border-morandi-blue transition-colors group">
             <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-ink-500 group-hover:bg-ink-800 group-hover:text-white transition-colors">
                <Mail size={20} />
             </div>
             <span className="text-sm font-bold text-ink-900 font-serif">寄送 Email</span>
          </button>
       </div>

    </div>
  );
};

export default HelpPage;
