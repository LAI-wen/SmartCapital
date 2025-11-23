
import React from 'react';
import { Notification } from '../types';
import { Bell, Check, Info, AlertTriangle } from 'lucide-react';

interface NotificationsPageProps {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ notifications, setNotifications }) => {

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle size={20} />;
      case 'success': return <Check size={20} />;
      case 'info': default: return <Info size={20} />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'alert': return 'bg-morandi-roseLight text-morandi-rose';
      case 'success': return 'bg-morandi-sageLight text-morandi-sage';
      case 'info': default: return 'bg-morandi-blueLight text-morandi-blue';
    }
  };

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex justify-between items-center mb-6">
         <div className="text-sm text-ink-400 font-serif">
           您有 {notifications.filter(n => !n.read).length} 則未讀通知
         </div>
         {notifications.some(n => !n.read) && (
           <button 
             onClick={markAllRead} 
             className="text-xs font-bold text-morandi-blue hover:underline font-serif"
           >
             全部標為已讀
           </button>
         )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <Bell size={48} className="text-stone-300 mb-4" />
              <p className="font-serif text-ink-400">目前沒有新通知</p>
           </div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id} 
              onClick={() => markAsRead(n.id)}
              className={`
                relative p-4 rounded-xl border transition-all cursor-pointer
                ${n.read ? 'bg-white border-stone-100' : 'bg-white border-morandi-blue/20 shadow-sm'}
              `}
            >
              {!n.read && (
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-morandi-rose"></div>
              )}
              
              <div className="flex gap-4">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getColor(n.type)}`}>
                    {getIcon(n.type)}
                 </div>
                 <div className="flex-1 pr-4">
                    <h4 className={`text-sm font-bold font-serif mb-1 ${n.read ? 'text-ink-500' : 'text-ink-900'}`}>
                      {n.title}
                    </h4>
                    <p className="text-xs text-ink-400 font-serif leading-relaxed mb-2">
                      {n.message}
                    </p>
                    <div className="text-[10px] text-stone-300 font-serif">
                      {n.time}
                    </div>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
