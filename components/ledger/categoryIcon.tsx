import { Coffee, ShoppingBag, Home, Bus, HeartPulse, Briefcase, TrendingUp, Gift, Tag } from 'lucide-react';

export const getCategoryIcon = (category: string) => {
  if (category.includes('飲食')) return <Coffee size={18} />;
  if (category.includes('購物')) return <ShoppingBag size={18} />;
  if (category.includes('居住')) return <Home size={18} />;
  if (category.includes('交通')) return <Bus size={18} />;
  if (category.includes('醫')) return <HeartPulse size={18} />;
  if (category.includes('薪')) return <Briefcase size={18} />;
  if (category.includes('資')) return <TrendingUp size={18} />;
  if (category.includes('娛樂')) return <Gift size={18} />;
  return <Tag size={18} />;
};
