
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, AlertTriangle, Info, RotateCcw, 
  Layers, Grid3X3, Scale, TrendingUp, DollarSign, BookOpen, AlertCircle, Sprout
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type StrategyType = 'Compound' | 'Kelly' | 'VA' | 'Grid' | 'Pyramid' | 'Martingale';

const StrategyLab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StrategyType>('Compound');
  const [showGuide, setShowGuide] = useState(true);

  // --- STATE: Compound Interest (New for Stock/Fund Investors) ---
  const [initialPrincipal, setInitialPrincipal] = useState(100000); // 初始本金
  const [monthlyContribution, setMonthlyContribution] = useState(5000); // 定期定額
  const [annualRate, setAnnualRate] = useState(7); // 年化報酬 (台股長期約7-9%)
  const [years, setYears] = useState(10); // 投資年限

  // --- STATE: Kelly ---
  const [winProb, setWinProb] = useState(55);
  const [odds, setOdds] = useState(2.0);
  const [bankroll, setBankroll] = useState(10000);
  const [kellyResult, setKellyResult] = useState(0);

  // --- STATE: Martingale ---
  const [initialBet, setInitialBet] = useState(100);
  const [lossStreak, setLossStreak] = useState(3);
  const [martingaleNextBet, setMartingaleNextBet] = useState(0);
  const [totalRisk, setTotalRisk] = useState(0);

  // --- STATE: Pyramid (Anti-Martingale) ---
  const [entryPrice, setEntryPrice] = useState(100);
  const [baseSize, setBaseSize] = useState(1000);
  const [priceGap, setPriceGap] = useState(5); // %
  const [sizeMultiplier, setSizeMultiplier] = useState(0.5);
  const [maxAdds, setMaxAdds] = useState(3);
  
  // --- STATE: Grid Trading ---
  const [gridLower, setGridLower] = useState(90);
  const [gridUpper, setGridUpper] = useState(110);
  const [gridCount, setGridCount] = useState(10);
  const [gridInvest, setGridInvest] = useState(10000);

  // --- STATE: Value Averaging (VA) ---
  const [vaTargetGrowth, setVaTargetGrowth] = useState(5000);
  const [vaPeriod, setVaPeriod] = useState(6);
  const [vaCurrentValue, setVaCurrentValue] = useState(28000);

  // --- CALCULATIONS ---

  // Compound Interest Calculation
  const compoundData = useMemo(() => {
    const data = [];
    let currentTotal = initialPrincipal;
    let totalCost = initialPrincipal;

    for (let i = 0; i <= years; i++) {
      data.push({
        year: i,
        total: Math.round(currentTotal),
        cost: Math.round(totalCost),
        interest: Math.round(currentTotal - totalCost)
      });

      if (i < years) {
        // Compound for next year
        for (let m = 0; m < 12; m++) {
          currentTotal = (currentTotal + monthlyContribution) * (1 + (annualRate / 100 / 12));
          totalCost += monthlyContribution;
        }
      }
    }
    return data;
  }, [initialPrincipal, monthlyContribution, annualRate, years]);

  // Kelly
  useEffect(() => {
    const b = odds - 1;
    const p = winProb / 100;
    const q = 1 - p;
    let fStar = (b * p - q) / b;
    if (fStar < 0) fStar = 0;
    setKellyResult(fStar);
  }, [winProb, odds]);

  // Martingale
  useEffect(() => {
    const next = initialBet * Math.pow(2, lossStreak);
    setMartingaleNextBet(next);
    const sunkCost = initialBet * (Math.pow(2, lossStreak) - 1);
    setTotalRisk(sunkCost + next);
  }, [initialBet, lossStreak]);

  // Pyramid Calculation
  const pyramidData = useMemo(() => {
    let currentPrice = entryPrice;
    let currentSize = baseSize;
    let totalCost = 0;
    let totalSize = 0;
    const steps = [];

    // Initial position
    totalCost += currentPrice * currentSize;
    totalSize += currentSize;
    steps.push({
      step: 0,
      price: currentPrice,
      size: currentSize,
      avgPrice: totalCost / totalSize,
      totalSize: totalSize,
      cost: currentPrice * currentSize
    });

    for (let i = 1; i <= maxAdds; i++) {
      currentPrice = currentPrice * (1 + priceGap / 100);
      currentSize = currentSize * sizeMultiplier;
      totalCost += currentPrice * currentSize;
      totalSize += currentSize;
      
      steps.push({
        step: i,
        price: currentPrice,
        size: currentSize,
        avgPrice: totalCost / totalSize,
        totalSize: totalSize,
        cost: currentPrice * currentSize
      });
    }
    return steps;
  }, [entryPrice, baseSize, priceGap, sizeMultiplier, maxAdds]);

  // Grid Calculation
  const gridData = useMemo(() => {
    if (gridUpper <= gridLower || gridCount <= 1) return { profitPerGrid: 0, grids: [] };
    
    const range = gridUpper - gridLower;
    const step = range / gridCount;
    const grids = [];
    const amountPerGrid = gridInvest / gridCount;

    for (let i = 0; i <= gridCount; i++) {
      grids.push({
        price: gridLower + (step * i),
        action: i === 0 ? 'Buy Only' : i === gridCount ? 'Sell Only' : 'Buy/Sell'
      });
    }

    const minProfitPercent = (step / gridUpper) * 100;
    const maxProfitPercent = (step / gridLower) * 100;

    return { 
      profitRange: `${minProfitPercent.toFixed(2)}% ~ ${maxProfitPercent.toFixed(2)}%`,
      stepValue: step,
      grids 
    };
  }, [gridLower, gridUpper, gridCount, gridInvest]);

  // VA Calculation
  const vaData = useMemo(() => {
    const targetValue = vaTargetGrowth * vaPeriod;
    const diff = targetValue - vaCurrentValue;
    const action = diff > 0 ? 'Buy' : 'Sell';
    const dcaInvest = vaTargetGrowth; 
    
    return { targetValue, diff, action, dcaInvest };
  }, [vaTargetGrowth, vaPeriod, vaCurrentValue]);


  // --- UI COMPONENTS ---

  const TabButton = ({ id, label, icon: Icon }: { id: StrategyType, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-serif transition-all whitespace-nowrap shadow-sm border flex-shrink-0
        ${activeTab === id 
          ? `bg-morandi-blue text-white border-morandi-blue` 
          : 'bg-white text-ink-400 border-stone-200 hover:bg-stone-50'
        }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  const GuideCard = ({ title, concept, bestFor, risk }: { title: string, concept: string, bestFor: string, risk: string }) => (
    <div className={`mb-6 bg-paper border border-stone-200 rounded-xl p-6 relative overflow-hidden transition-all duration-300 ${showGuide ? 'block' : 'hidden'}`}>
       <div className="absolute top-0 left-0 w-1 h-full bg-morandi-blue"></div>
       <div className="flex items-start gap-4">
          <div className="bg-white p-2 rounded-lg shadow-sm text-morandi-blue mt-1">
             <BookOpen size={20} />
          </div>
          <div className="flex-1">
             <h4 className="font-serif font-bold text-ink-900 text-lg mb-2">新手指南：{title}</h4>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-serif leading-relaxed">
                <div>
                  <span className="block text-ink-400 text-xs font-bold uppercase tracking-wider mb-1">白話文解釋</span>
                  <p className="text-ink-800">{concept}</p>
                </div>
                <div>
                  <span className="block text-ink-400 text-xs font-bold uppercase tracking-wider mb-1">適合情境</span>
                  <p className="text-ink-800">{bestFor}</p>
                </div>
                <div>
                  <span className="block text-morandi-rose text-xs font-bold uppercase tracking-wider mb-1">風險注意</span>
                  <p className="text-morandi-rose">{risk}</p>
                </div>
             </div>
          </div>
          <button onClick={() => setShowGuide(false)} className="text-ink-300 hover:text-ink-900">
             <span className="text-xs border-b border-ink-300">隱藏教學</span>
          </button>
       </div>
    </div>
  );

  return (
    <div className="pb-24 md:pb-0 max-w-5xl mx-auto bg-graph-paper min-h-screen">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold font-serif text-ink-900 mb-2">財富目標試算</h2>
          <p className="text-ink-400 text-sm font-serif">試算你的定期投入，看見財富成長的可能。</p>
        </div>
        {!showGuide && (
          <button onClick={() => setShowGuide(true)} className="text-morandi-blue text-sm font-serif underline">
            顯示新手教學
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-4 mb-2 gap-3 no-scrollbar">
        <TabButton id="Compound" label="財富試算 ✦" icon={Sprout} />
        <TabButton id="VA" label="價值平均" icon={Scale} />
        <TabButton id="Grid" label="網格交易" icon={Grid3X3} />
        <TabButton id="Pyramid" label="金字塔加碼" icon={Layers} />
        <TabButton id="Kelly" label="凱利公式" icon={Calculator} />
        <TabButton id="Martingale" label="馬丁格爾" icon={AlertTriangle} />
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 shadow-paper min-h-[500px]">
        
        {/* === COMPOUND INTEREST (For Fund Investors) === */}
        {activeTab === 'Compound' && (
          <div className="space-y-6 animate-fade-in">
             <GuideCard
                title="複利試算 — 財富成長的核心工具"
                concept="這是台股存股族與基金投資人最強大的武器。時間越長，複利的效果越驚人。這也是為什麼常說『越早開始越好』。"
                bestFor="定期定額買 0050、0056 或全球股票基金，或任何想估算未來資產規模的人。"
                risk="需有耐心，前幾年的效果不明顯，且需確保持續投入不中斷。"
             />

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {/* Controls */}
               <div className="space-y-6 md:col-span-1">
                 <div>
                    <label className="text-xs font-serif font-bold text-ink-500 mb-1 block">初始本金 (Initial)</label>
                    <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400">$</span><input type="number" value={initialPrincipal} onChange={(e) => setInitialPrincipal(Number(e.target.value))} className="w-full bg-paper border border-stone-200 rounded-xl py-3 pl-8 text-ink-900 focus:border-morandi-blue focus:outline-none font-serif-num"/></div>
                 </div>
                 <div>
                    <label className="text-xs font-serif font-bold text-ink-500 mb-1 block">每月定期定額 (Monthly)</label>
                    <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400">$</span><input type="number" value={monthlyContribution} onChange={(e) => setMonthlyContribution(Number(e.target.value))} className="w-full bg-paper border border-stone-200 rounded-xl py-3 pl-8 text-ink-900 focus:border-morandi-blue focus:outline-none font-serif-num"/></div>
                 </div>
                 <div>
                    <label className="flex justify-between text-xs font-serif font-bold text-ink-500 mb-1">
                      <span>年化報酬率 (Rate)</span>
                      <span className="text-morandi-blue">{annualRate}%</span>
                    </label>
                    <input type="range" min="1" max="20" step="0.5" value={annualRate} onChange={(e) => setAnnualRate(Number(e.target.value))} className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-morandi-blue"/>
                    <div className="flex justify-between text-[10px] text-ink-400 mt-1 font-serif">
                       <span>保守(3%)</span>
                       <span>台股平均(7-9%)</span>
                       <span>積極(15%)</span>
                    </div>
                 </div>
                 <div>
                    <label className="flex justify-between text-xs font-serif font-bold text-ink-500 mb-1">
                      <span>投資年限 (Years)</span>
                      <span className="text-morandi-blue">{years} 年</span>
                    </label>
                    <input type="range" min="1" max="50" value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-morandi-blue"/>
                 </div>
               </div>

               {/* Result Chart & Stats */}
               <div className="md:col-span-2 flex flex-col h-full">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                     <div className="bg-paper p-4 rounded-xl border border-stone-200">
                        <span className="text-xs font-serif text-ink-400 uppercase tracking-wider">總投入成本</span>
                        <div className="text-2xl font-serif-num font-bold text-ink-500 mt-1">${compoundData[compoundData.length-1].cost.toLocaleString()}</div>
                     </div>
                     <div className="bg-morandi-sageLight p-4 rounded-xl border border-morandi-sage/30">
                        <span className="text-xs font-serif text-morandi-sage uppercase tracking-wider font-bold">期末總資產</span>
                        <div className="text-2xl font-serif-num font-bold text-morandi-sage mt-1">${compoundData[compoundData.length-1].total.toLocaleString()}</div>
                     </div>
                  </div>
                  
                  <div className="flex-1 bg-white rounded-xl border border-stone-100 p-4 shadow-sm min-h-[300px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={compoundData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                           <defs>
                              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#84A98C" stopOpacity={0.3}/>
                                 <stop offset="95%" stopColor="#84A98C" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <XAxis dataKey="year" stroke="#78716C" fontSize={12} tickLine={false} axisLine={false} />
                           <YAxis stroke="#78716C" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value/10000).toFixed(0)}萬`} />
                           <Tooltip 
                              contentStyle={{ backgroundColor: '#fff', borderColor: '#E6E2D6', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontFamily: 'Lora' }}
                              formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)}
                           />
                           <Area type="monotone" dataKey="total" stroke="#84A98C" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" name="總資產" />
                           <Area type="monotone" dataKey="cost" stroke="#D6D3C9" strokeWidth={2} strokeDasharray="5 5" fill="none" name="投入本金" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex justify-center gap-6 text-xs font-serif">
                     <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-morandi-sage rounded-full"></div>
                        <span className="text-ink-600">複利成長後資產</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="w-3 h-1 border-t-2 border-dashed border-stone-300"></div>
                        <span className="text-ink-400">僅投入本金</span>
                     </div>
                  </div>
               </div>
             </div>
          </div>
        )}

        {/* === VALUE AVERAGING (VA) === */}
        {activeTab === 'VA' && (
          <div className="space-y-6 animate-fade-in">
             <GuideCard 
                title="價值平均法 (Value Averaging)"
                concept="定期定額的『進階版』。如果台股大跌（例如 0050 跌到 100元），系統會叫你多買一點；如果大漲，則少買一點。這是強迫『低買高賣』的策略。"
                bestFor="想比單純定期定額賺更多，且手邊有一筆備用現金的基金/ETF投資人。"
                risk="在市場大跌時，為了維持目標價值，你需要拿出一大筆錢加碼，心裡壓力會比較大。"
             />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               <div className="space-y-6">
                 <div>
                    <label className="text-xs font-serif font-bold text-ink-500 mb-1 block">預期每月資產增加金額 (成長目標)</label>
                    <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400">$</span><input type="number" value={vaTargetGrowth} onChange={(e) => setVaTargetGrowth(Number(e.target.value))} className="w-full bg-paper border border-stone-200 rounded-xl py-3 pl-8 text-ink-900 focus:border-morandi-clay focus:outline-none font-serif-num"/></div>
                 </div>
                 <div>
                    <label className="text-xs font-serif font-bold text-ink-500 mb-1 block">目前進行到第幾期 (月)</label>
                    <input type="number" value={vaPeriod} onChange={(e) => setVaPeriod(Number(e.target.value))} className="w-full bg-paper border border-stone-200 rounded-xl py-3 pl-4 text-ink-900 focus:border-morandi-clay focus:outline-none font-serif-num"/>
                 </div>
                 <div>
                    <label className="text-xs font-serif font-bold text-ink-500 mb-1 block">當前實際持倉總市值</label>
                    <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400">$</span><input type="number" value={vaCurrentValue} onChange={(e) => setVaCurrentValue(Number(e.target.value))} className="w-full bg-paper border border-stone-200 rounded-xl py-3 pl-8 text-ink-900 focus:border-morandi-clay focus:outline-none font-serif-num"/></div>
                 </div>
               </div>

               <div className="flex flex-col justify-center">
                  <div className="bg-gradient-to-br from-morandi-blue to-ink-900 p-8 rounded-2xl shadow-lg text-center relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                     <div className="relative z-10">
                        <div className="text-sm text-blue-200 mb-4 font-serif tracking-wider">本期操作建議</div>
                        
                        {vaData.diff > 0 ? (
                        <div className="animate-pulse">
                            <div className="text-morandi-sageLight font-bold text-lg mb-2 flex items-center justify-center gap-2 font-serif">
                                <TrendingUp size={24}/> 強力買入 (加碼)
                            </div>
                            <div className="text-5xl font-serif-num font-bold text-white tracking-tight">
                            ${Math.abs(vaData.diff).toLocaleString()}
                            </div>
                        </div>
                        ) : (
                        <div>
                            <div className="text-morandi-roseLight font-bold text-lg mb-2 flex items-center justify-center gap-2 font-serif">
                                <TrendingUp size={24} className="rotate-180"/> 賣出獲利 (減碼)
                            </div>
                            <div className="text-5xl font-serif-num font-bold text-white tracking-tight">
                            ${Math.abs(vaData.diff).toLocaleString()}
                            </div>
                        </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-white/10 flex justify-between text-xs">
                            <div className="text-left">
                            <div className="text-blue-300 font-serif">本期目標總值</div>
                            <div className="text-white font-serif-num text-base">${vaData.targetValue.toLocaleString()}</div>
                            </div>
                            <div className="text-right opacity-70">
                            <div className="text-blue-300 font-serif">對照組: 傳統定期定額</div>
                            <div className="text-white font-serif-num text-base">固定投入 ${vaData.dcaInvest.toLocaleString()}</div>
                            </div>
                        </div>
                     </div>
                  </div>
                  <p className="text-xs text-ink-500 mt-6 text-center font-serif leading-relaxed px-4">
                     {vaData.diff > 0 
                       ? "目前資產低於目標路徑（可能市場大跌），應加大投入以降低平均成本。" 
                       : "目前資產表現優於預期（可能市場過熱），應減少投入或獲利了結。"}
                  </p>
               </div>
            </div>
          </div>
        )}

        {/* === GRID TRADING === */}
        {activeTab === 'Grid' && (
          <div className="space-y-6 animate-fade-in">
             <GuideCard 
                title="網格交易 (Grid Trading)"
                concept="想像在海裡撒網。價格跌了就分批買進，價格漲了就分批賣出。不用預測未來會漲還跌，只要它在區間內震盪，你就能一直賺『價差』。"
                bestFor="適合高股息 ETF (如 0056, 00878) 或長期箱型整理的股票。不適合一直飆漲的飆股。"
                risk="如果價格衝出網子（大漲或大跌），你可能會賣飛（少賺）或套牢（虧損）。"
             />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-serif font-bold text-ink-500 mb-1">區間下限 (Lower)</label>
                      <input type="number" value={gridLower} onChange={e => setGridLower(Number(e.target.value))} className="w-full bg-paper border border-stone-200 rounded-lg p-3 text-ink-900 text-sm font-serif-num" />
                    </div>
                    <div>
                      <label className="text-xs font-serif font-bold text-ink-500 mb-1">區間上限 (Upper)</label>
                      <input type="number" value={gridUpper} onChange={e => setGridUpper(Number(e.target.value))} className="w-full bg-paper border border-stone-200 rounded-lg p-3 text-ink-900 text-sm font-serif-num" />
                    </div>
                 </div>
                 <div>
                    <label className="text-xs font-serif font-bold text-ink-500 mb-1">網格數量 (Grids)</label>
                    <input type="range" min="2" max="100" value={gridCount} onChange={e => setGridCount(Number(e.target.value))} className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-morandi-blue mb-2"/>
                    <div className="text-right text-morandi-blue font-serif-num text-sm font-bold">{gridCount} 格</div>
                 </div>
                 <div>
                    <label className="text-xs font-serif font-bold text-ink-500 mb-1">總投入資金</label>
                    <input type="number" value={gridInvest} onChange={e => setGridInvest(Number(e.target.value))} className="w-full bg-paper border border-stone-200 rounded-lg p-3 text-ink-900 text-sm font-serif-num" />
                 </div>
                 
                 <div className="bg-paper p-5 rounded-xl border border-stone-200 shadow-sm">
                    <div className="flex justify-between text-sm mb-2 font-serif">
                       <span className="text-ink-500">每格價差:</span>
                       <span className="text-ink-900 font-serif-num">{gridData.stepValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-serif">
                       <span className="text-ink-500">單格預估利潤:</span>
                       <span className="text-morandi-sage font-serif-num font-bold">{gridData.profitRange}</span>
                    </div>
                 </div>
              </div>

              {/* Visual Grid */}
              <div className="bg-paper border border-stone-200 rounded-xl p-4 h-96 relative overflow-y-auto custom-scrollbar shadow-inner">
                 <div className="absolute top-2 right-2 px-2 py-1 bg-white rounded text-[10px] text-ink-400 font-serif shadow-sm">模擬掛單簿</div>
                 <div className="space-y-1 relative mt-8">
                    {/* Center Line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-stone-300"></div>
                    
                    {gridData.grids.slice().reverse().map((g, i) => (
                      <div key={i} className="flex items-center text-xs py-1.5 hover:bg-white transition-colors rounded">
                        <div className={`flex-1 text-right pr-4 font-serif-num ${i === 0 ? 'text-morandi-rose font-bold' : i === gridData.grids.length-1 ? 'text-morandi-sage font-bold' : 'text-ink-500'}`}>
                          ${g.price.toFixed(2)}
                        </div>
                        <div className="flex-1 pl-4">
                           <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wider
                             ${g.action.includes('Sell') ? 'bg-morandi-roseLight text-morandi-rose' : ''}
                             ${g.action.includes('Buy') ? 'bg-morandi-sageLight text-morandi-sage' : ''}
                           `}>
                             {g.action === 'Buy/Sell' ? '🔴 賣 / 🟢 買' : g.action === 'Sell Only' ? '🔴 賣出' : '🟢 買入'}
                           </span>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* === PYRAMID === */}
        {activeTab === 'Pyramid' && (
          <div className="space-y-6 animate-fade-in">
             <GuideCard 
                title="金字塔加碼 (Pyramid)"
                concept="『贏錢才加碼』。如果買進台積電後漲了，代表你看對趨勢，這時再加碼一點，但加碼金額要越來越少（像金字塔形狀）。"
                bestFor="大波段趨勢股（例如牛市中的權值股）。不適合盤整盤。"
                risk="如果加碼後行情反轉，加碼的部位會拉高平均成本，導致獲利回吐。建議搭配移動停利。"
             />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Inputs */}
              <div className="space-y-5 lg:col-span-1">
                <div>
                   <label className="text-xs font-serif font-bold text-ink-500 mb-1">初始價格</label>
                   <input type="number" value={entryPrice} onChange={e => setEntryPrice(Number(e.target.value))} className="w-full bg-paper border border-stone-200 rounded-lg p-3 text-ink-900 text-sm font-serif-num" />
                </div>
                <div>
                   <label className="text-xs font-serif font-bold text-ink-500 mb-1">初始倉位 (股/張)</label>
                   <input type="number" value={baseSize} onChange={e => setBaseSize(Number(e.target.value))} className="w-full bg-paper border border-stone-200 rounded-lg p-3 text-ink-900 text-sm font-serif-num" />
                </div>
                <div>
                   <label className="text-xs font-serif font-bold text-ink-500 mb-1">加碼觸發漲幅 (%)</label>
                   <input type="number" value={priceGap} onChange={e => setPriceGap(Number(e.target.value))} className="w-full bg-paper border border-stone-200 rounded-lg p-3 text-ink-900 text-sm font-serif-num" />
                </div>
                <div>
                   <label className="text-xs font-serif font-bold text-ink-500 mb-1">加碼倍率 (通常 &lt; 1.0)</label>
                   <input type="number" step="0.1" max="1.0" value={sizeMultiplier} onChange={e => setSizeMultiplier(Number(e.target.value))} className="w-full bg-paper border border-stone-200 rounded-lg p-3 text-ink-900 text-sm font-serif-num" />
                </div>
              </div>

              {/* Visual Table */}
              <div className="lg:col-span-2 bg-paper rounded-2xl p-6 border border-stone-200 overflow-hidden shadow-inner">
                <div className="flex justify-between items-end mb-8 px-2">
                  <div className="text-sm font-bold font-serif text-ink-900">加碼路徑預覽</div>
                  <div className="text-xs text-morandi-sage font-bold bg-white px-2 py-1 rounded shadow-sm">總持倉: {pyramidData[pyramidData.length-1].totalSize.toFixed(0)} | 均價: {pyramidData[pyramidData.length-1].avgPrice.toFixed(2)}</div>
                </div>
                <div className="relative h-64 flex flex-col-reverse items-center justify-end gap-2">
                  {pyramidData.map((step, idx) => {
                    const widthPercent = (step.size / baseSize) * 80; // Scale bar width
                    return (
                      <div key={idx} className="w-full flex items-center justify-center group relative">
                        {/* Tooltip */}
                        <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-ink-900 text-white text-xs p-2 rounded shadow-lg z-10 whitespace-nowrap font-serif-num">
                          成本: ${step.cost.toFixed(0)} | 均價: ${step.avgPrice.toFixed(2)}
                        </div>
                        {/* Bar */}
                        <div 
                          className={`h-12 rounded-lg flex items-center justify-center text-xs font-serif-num font-bold text-white shadow-sm transition-all hover:scale-105 cursor-pointer ${idx === 0 ? 'bg-morandi-sage' : 'bg-morandi-sage/60'}`}
                          style={{ width: `${Math.max(widthPercent, 10)}%` }}
                        >
                          {step.size.toFixed(0)}
                        </div>
                        {/* Price Label */}
                        <div className="absolute right-4 text-xs font-serif-num text-ink-400">@ ${step.price.toFixed(2)}</div>
                        <div className="absolute left-4 text-xs font-serif-num text-ink-300">#{idx+1}</div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-center text-xs text-ink-400 mt-6 font-serif italic">底部為初始建倉，越往上為後續加碼，形成穩固的金字塔。</p>
              </div>
            </div>
          </div>
        )}

        {/* === KELLY CRITERION === */}
        {activeTab === 'Kelly' && (
          <div className="space-y-6 animate-fade-in">
             <GuideCard 
                title="凱利公式 (Kelly Criterion)"
                concept="這個公式幫你算出『這把該下多少錢』。如果勝率高、賠率好，就下多一點；反之則少下一點。它是為了讓錢滾得最快。"
                bestFor="適合短線價差交易者（Swing Trader）決定單筆進場資金比例。"
                risk="計算出的倉位通常很大（全凱利），遇到連續虧損心態容易崩。建議新手只用『半凱利』(算出來的除以2)。"
             />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div>
                  <label className="flex justify-between text-sm font-serif font-bold text-ink-500 mb-2">獲勝機率 (Win Rate) <span className="text-ink-900">{winProb}%</span></label>
                  <input type="range" min="1" max="99" value={winProb} onChange={(e) => setWinProb(Number(e.target.value))} className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-morandi-blue"/>
                </div>
                <div>
                  <label className="flex justify-between text-sm font-serif font-bold text-ink-500 mb-2">賠率 (Odds/Risk-Reward) <span className="text-ink-900">{odds.toFixed(2)}x</span></label>
                  <input type="range" min="1.1" max="10" step="0.1" value={odds} onChange={(e) => setOdds(Number(e.target.value))} className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-morandi-blue"/>
                  <div className="text-xs text-ink-400 mt-1">例如：賺200賠100，賠率就是 2.0</div>
                </div>
                <div>
                  <label className="block text-sm font-serif font-bold text-ink-500 mb-2">總本金 (Bankroll)</label>
                  <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400">$</span><input type="number" value={bankroll} onChange={(e) => setBankroll(Number(e.target.value))} className="w-full bg-paper border border-stone-200 rounded-xl py-3 pl-8 text-ink-900 focus:border-morandi-blue focus:outline-none font-serif-num"/></div>
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-start bg-paper rounded-xl p-8 border border-stone-200 shadow-inner min-h-[400px]">
                {/* 圓餅圖區域 - Adjusted Size */}
                <div className="relative w-40 h-40 flex items-center justify-center mb-8">
                  <svg className="w-full h-full transform -rotate-90">
                    {/* Background Circle */}
                    <circle cx="80" cy="80" r="70" stroke="#E6E2D6" strokeWidth="12" fill="none" />
                    {/* Progress Circle */}
                    <circle 
                      cx="80" 
                      cy="80" 
                      r="70" 
                      stroke={kellyResult > 0 ? "#84A98C" : "#D68C92"} 
                      strokeWidth="12" 
                      fill="none" 
                      strokeDasharray={440} 
                      strokeDashoffset={440 - (440 * Math.min(Math.max(kellyResult, 0), 1))} 
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-3xl font-serif-num font-bold text-ink-900">{(Math.max(kellyResult, 0) * 100).toFixed(1)}<span className="text-lg">%</span></div>
                    <div className="text-[10px] text-ink-400 font-serif uppercase tracking-widest mt-0.5">倉位</div>
                  </div>
                </div>

                {/* 結果卡片 (下注單) */}
                <div className="w-full max-w-xs bg-white p-5 rounded-xl shadow-paper border border-stone-100 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-20 h-20 bg-morandi-sand/30 rounded-full blur-xl -mr-5 -mt-5"></div>
                   
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-ink-400 uppercase tracking-wider font-serif">最佳投入金額</span>
                      {kellyResult > 0.25 && <AlertCircle size={14} className="text-morandi-clay" />}
                   </div>
                   
                   <div className="text-3xl font-serif-num font-bold text-ink-900 mb-2">
                     ${Math.max(bankroll * kellyResult, 0).toFixed(2)}
                   </div>
                   
                   <div className="text-xs font-serif leading-relaxed text-ink-500 pt-3 border-t border-stone-100">
                     {kellyResult > 0.25 
                       ? "🔥 倉位過大 (>25%)，建議使用「半凱利」以降低破產風險。" 
                       : kellyResult <= 0 
                         ? "⛔ 期望值為負，不建議進場。" 
                         : "✨ 此倉位比例可最大化長期複利成長。"}
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === MARTINGALE === */}
        {activeTab === 'Martingale' && (
           <div className="space-y-6 animate-fade-in">
            <GuideCard 
                title="馬丁格爾 (Martingale)"
                concept="俗稱『凹單』或『倍壓法』。輸了就加倍下注，只要贏一把，之前的虧損全回來。在股票中類似『越跌越買』，但風險極高。"
                bestFor="極短線交易或資金無限的人。一般台股投資人不建議使用此策略，請參考『價值平均法』。"
                risk="非常高！若股票一路下跌不回頭（如宏達電從1300跌到兩位數），本金會迅速歸零。新手慎用！"
             />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                 <div>
                  <label className="block text-sm font-serif font-bold text-ink-500 mb-2">初始下注金額 (Base Bet)</label>
                  <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400">$</span><input type="number" value={initialBet} onChange={(e) => setInitialBet(Number(e.target.value))} className="w-full bg-paper border border-stone-200 rounded-xl py-3 pl-8 text-ink-900 focus:border-morandi-rose focus:outline-none font-serif-num"/></div>
                </div>
                <div>
                  <label className="flex justify-between text-sm font-serif font-bold text-ink-500 mb-2">當前連敗次數 <span>{lossStreak} 連敗</span></label>
                  <input type="range" min="0" max="15" value={lossStreak} onChange={(e) => setLossStreak(Number(e.target.value))} className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-morandi-rose"/>
                  <button onClick={() => setLossStreak(0)} className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 border border-stone-200 rounded-lg text-ink-400 hover:text-ink-900 hover:bg-paper transition-colors text-sm font-serif"><RotateCcw size={14} /> 重置連敗</button>
                </div>
              </div>
               <div className="flex flex-col justify-center gap-6">
                 <div className="bg-paper p-8 rounded-2xl border border-stone-200 shadow-sm">
                    <span className="text-ink-400 text-xs font-serif uppercase tracking-wider">下一次需加碼金額</span>
                    <div className="text-4xl font-serif-num font-bold text-ink-900 mt-2">${martingaleNextBet.toLocaleString()}</div>
                 </div>
                 <div className="bg-morandi-roseLight p-8 rounded-2xl border border-morandi-rose/20 relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 h-1.5 bg-morandi-rose transition-all duration-300" style={{ width: `${Math.min((totalRisk / 100000) * 100, 100)}%` }}/>
                    <span className="text-morandi-rose text-xs font-serif uppercase tracking-wider font-bold">累積風險資本 (Total Risk)</span>
                    <div className="text-2xl font-serif-num font-bold text-morandi-rose mt-2">${totalRisk.toLocaleString()}</div>
                    <p className="text-xs text-morandi-rose/70 mt-2 font-serif">如果下一把輸了，你將累計損失這麼多錢。</p>
                 </div>
               </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default StrategyLab;
