
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calculator, Settings, Shield, ChevronRight, 
  MessageCircle, FileText, PieChart, HelpCircle, 
  LogOut 
} from 'lucide-react';

const MorePage: React.FC = () => {
  const navigate = useNavigate();

  const menuGroups = [
    {
      title: "策略工具",
      items: [
        { 
          label: "策略實驗室", 
          icon: <Calculator size={20} />, 
          desc: "凱利公式、馬丁格爾、網格交易", 
          action: () => navigate('/strategy'),
          color: "bg-morandi-blueLight text-morandi-blue"
        },
        { 
          label: "數據分析", 
          icon: <PieChart size={20} />, 
          desc: "資產報告、收支趨勢", 
          action: () => navigate('/analytics'),
          color: "bg-morandi-sageLight text-morandi-sage"
        }
      ]
    },
    {
      title: "系統設定",
      items: [
        { 
          label: "偏好設定", 
          icon: <Settings size={20} />, 
          desc: "幣別、顯示語言", 
          action: () => navigate('/settings'),
          color: "bg-stone-100 text-ink-500"
        },
        { 
          label: "隱私安全", 
          icon: <Shield size={20} />, 
          desc: "密碼鎖、隱藏金額", 
          action: () => navigate('/settings'),
          color: "bg-stone-100 text-ink-500"
        },
        { 
          label: "LINE Bot 綁定", 
          icon: <MessageCircle size={20} />, 
          desc: "快速記帳通知", 
          action: () => navigate('/settings'),
          color: "bg-[#06C755]/10 text-[#06C755]"
        }
      ]
    },
    {
      title: "幫助",
      items: [
        { 
          label: "使用指南", 
          icon: <FileText size={20} />, 
          desc: "新手教學影片", 
          action: () => navigate('/help'),
          color: "bg-stone-100 text-ink-500"
        },
        { 
          label: "聯絡客服", 
          icon: <HelpCircle size={20} />, 
          desc: "回報問題", 
          action: () => navigate('/help'),
          color: "bg-stone-100 text-ink-500"
        }
      ]
    }
  ];

  return (
    <div className="animate-fade-in pb-20">
       {menuGroups.map((group, idx) => (
         <div key={idx} className="mb-6">
            <h3 className="text-xs font-serif font-bold text-ink-400 uppercase tracking-widest mb-3 ml-1">
              {group.title}
            </h3>
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
               {group.items.map((item, i) => (
                 <div 
                   key={i} 
                   onClick={item.action}
                   className={`flex items-center p-4 gap-4 transition-colors cursor-pointer hover:bg-stone-50 ${i !== group.items.length - 1 ? 'border-b border-stone-50' : ''}`}
                 >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                       {item.icon}
                    </div>
                    <div className="flex-1">
                       <div className="text-sm font-bold text-ink-900 font-serif">{item.label}</div>
                       <div className="text-xs text-ink-400 font-serif mt-0.5">{item.desc}</div>
                    </div>
                    <ChevronRight size={18} className="text-stone-300" />
                 </div>
               ))}
            </div>
         </div>
       ))}

       <div className="mt-8 mb-4">
         <button className="w-full py-3 rounded-xl border border-stone-200 text-ink-400 text-sm font-bold font-serif hover:bg-stone-100 hover:text-morandi-rose transition-colors flex items-center justify-center gap-2">
            <LogOut size={16} /> 登出帳號
         </button>
         <div className="text-center mt-4 text-[10px] text-stone-300 font-serif">
            SmartCapital v1.0.3 (Beta)
         </div>
       </div>
    </div>
  );
};

export default MorePage;
