import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronRight } from 'lucide-react';

export default function BucketCard({ name, percentage, amount, color, icon: Icon, link }) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    lime: 'from-lime-500/20 to-lime-600/10 border-lime-500/30'
  };

  const iconColorClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    lime: 'bg-lime-500/20 text-lime-400'
  };

  return (
    <Link to={createPageUrl(link)}>
      <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-5 hover:scale-[1.02] transition-all cursor-pointer`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${iconColorClasses[color]}`}>
              <Icon size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{name}</h3>
              <p className="text-sm text-gray-400">{percentage}% of income</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-black text-white">${amount.toLocaleString()}</p>
            <ChevronRight className="text-gray-400" size={20} />
          </div>
        </div>
      </div>
    </Link>
  );
}