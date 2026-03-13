import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string;
    change: string;
    isPositive: boolean;
    icon: React.ElementType;
    iconColor: string;
    subtitle: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, isPositive, icon: Icon, iconColor, subtitle }) => (
    <div className="bg-white p-5 rounded border border-slate-100 shadow-sm transition-transform hover:scale-[1.02]">
        <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${iconColor}`}>
                <Icon className="w-4 h-4 text-white" />
            </div>
            <div className={`flex items-center space-x-1 text-xs font-bold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                <span>{isPositive ? '+' : ''}{change}%</span>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            </div>
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-xl font-black text-slate-900 mb-1">{value}</h3>
        <p className="text-[10px] font-bold text-slate-400">{subtitle}</p>
    </div>
);

export default StatCard;

