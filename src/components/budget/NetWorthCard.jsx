import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function NetWorthCard({ totalAssets, totalDebts, netWorth, assets, debts }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h2 className="text-2xl font-bold mb-6">Net Worth Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <p className="text-sm text-gray-400 mb-1">Total Assets</p>
          <p className="text-2xl font-bold text-green-400">${totalAssets.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-1">Total Debts</p>
          <p className="text-2xl font-bold text-red-400">${totalDebts.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-1">Net Worth</p>
          <p className={`text-3xl font-black ${netWorth >= 0 ? 'text-lime-400' : 'text-red-400'}`}>
            ${netWorth.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="text-green-400" size={18} />
            <h3 className="font-semibold">Assets</h3>
          </div>
          {assets.length === 0 ? (
            <p className="text-sm text-gray-400">No assets tracked yet</p>
          ) : (
            <div className="space-y-2">
              {assets.map(asset => (
                <div key={asset.id} className="flex justify-between text-sm">
                  <span className="text-gray-300">{asset.name}</span>
                  <span className="text-green-400">${asset.current_value?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="text-red-400" size={18} />
            <h3 className="font-semibold">Debts</h3>
          </div>
          {debts.length === 0 ? (
            <p className="text-sm text-gray-400">No debts tracked yet</p>
          ) : (
            <div className="space-y-2">
              {debts.map(debt => (
                <div key={debt.id} className="flex justify-between text-sm">
                  <span className="text-gray-300">{debt.name}</span>
                  <span className="text-red-400">${debt.balance?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}