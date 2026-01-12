// src/pages/Debt.jsx (or wherever this Debt page lives)
// Copy/paste this whole file.

import React, { useMemo, useState } from "react";
import { localDB } from "@/components/localDB";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  TrendingDown,
  Plus,
  Edit,
  Receipt,
  CreditCard,
  PiggyBank,
  Calendar,
  Home,
  Car,
  Package,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DebtForm from "@/components/forms/DebtForm";
import AssetForm from "@/components/forms/AssetForm";

const quirkySayings = [
  "Your credit card is not free money. Shocking, I know.",
  "Debt is like that ex who won't leave you alone.",
  "Interest is the price of impatience.",
  "Your future self called. They want their money back.",
];

export default function Debt() {
  const queryClient = useQueryClient();

  const [saying] = useState(() => quirkySayings[Math.floor(Math.random() * quirkySayings.length)]);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);

  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  const { data: debts = [] } = useQuery({
    queryKey: ["debts"],
    queryFn: async () => localDB.entities.Debt.filter(),
    refetchOnWindowFocus: false,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => localDB.entities.Asset.filter(),
    refetchOnWindowFocus: false,
  });

  const totals = useMemo(() => {
    const totalAssetValue = assets.reduce((sum, a) => sum + (Number(a.current_value) || 0), 0);
    const totalDebtValue = debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0);
    const netWorth = totalAssetValue - totalDebtValue;
    return { totalAssetValue, totalDebtValue, netWorth };
  }, [assets, debts]);

  const getAssetIcon = (type) => {
    switch (type) {
      case "property":
        return Home;
      case "vehicle":
        return Car;
      default:
        return Package;
    }
  };

  const getLinkedDebt = (assetId) => debts.find((d) => d.linked_asset_id === assetId);

  const getLinkedAsset = (debtId) => {
    const debt = debts.find((d) => d.id === debtId);
    if (!debt?.linked_asset_id) return null;
    return assets.find((a) => a.id === debt.linked_asset_id);
  };

  return (
    <div className="safe-screen screen h-[100dvh] overflow-hidden bg-[#0d0d1a] text-white flex flex-col">
      {/* ✅ Controlled scrolling + safe areas (same pattern as Bills/Dashboard) */}
      <main className="app-scroll flex-1 min-h-0">
        <div>
          <div className="max-w-lg mx-auto px-4 py-4 sm:py-6">
            {/* Header */}
            <div className="relative mb-4 sm:mb-6">
              <div className="flex items-center justify-between">
                <Link to={createPageUrl("Home")}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/10 h-9 w-9 sm:h-10 sm:w-10"
                  >
                    <ArrowLeft size={20} />
                  </Button>
                </Link>

                <div className="w-9 sm:w-10" />
              </div>

              {/* Centered title + quote (keeps spacing consistent across pages) */}
              <div className="w-full text-center px-10">
                <h1 className="text-2xl sm:text-3xl font-black leading-tight">Assets &amp; Debt</h1>
                <p className="text-lime-400 italic text-xs sm:text-sm mt-1">"{saying}"</p>
              </div>

              {/* Actions */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setEditingAsset(null);
                    setShowAssetForm(true);
                  }}
                  className="w-full bg-[#1a1a2e] border border-white/20 text-white hover:bg-[#252538] h-11 text-sm font-semibold whitespace-nowrap"
                >
                  <Plus size={16} className="mr-1" />
                  Asset
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    setEditingDebt(null);
                    setShowDebtForm(true);
                  }}
                  className="w-full bg-lime-500 text-black font-bold hover:bg-lime-400 h-11 text-sm whitespace-nowrap"
                >
                  <Plus size={16} className="mr-1" />
                  Debt
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="mt-4 sm:mt-6 space-y-3">
              <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/30 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-emerald-200/60 text-xs uppercase tracking-wider mb-1">Total Value</p>
                <p className="text-3xl font-black text-lime-400">${totals.totalAssetValue.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-red-900/40 to-red-950/30 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-200/60 text-xs uppercase tracking-wider mb-1">Owed</p>
                <p className="text-3xl font-black text-red-400">${totals.totalDebtValue.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-lime-900/40 to-lime-950/30 border border-lime-500/30 rounded-xl p-4">
                <p className="text-lime-200/60 text-xs uppercase tracking-wider mb-1">Net Worth</p>
                <p className="text-3xl font-black text-lime-400">${totals.netWorth.toLocaleString()}</p>
              </div>
            </div>

            {/* Individual Assets */}
            {assets.length > 0 && (
              <div className="mt-6 space-y-3">
                {assets.map((asset) => {
                  const Icon = getAssetIcon(asset.type);
                  const linkedDebt = getLinkedDebt(asset.id);

                  const assetValue = Number(asset.current_value) || 0;
                  const debtBalance = Number(linkedDebt?.balance) || 0;

                  const equity = linkedDebt ? assetValue - debtBalance : assetValue;

                  return (
                    <div
                      key={asset.id}
                      className="bg-gradient-to-br from-[#1f2a2e] to-[#1a1a2e] border border-white/10 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-lime-500/20 flex-shrink-0">
                            <Icon className="text-lime-400" size={20} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-white text-base truncate">{asset.name}</h3>
                            <p className="text-xs text-gray-400 capitalize truncate">{asset.type}</p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={() => {
                            setEditingAsset(asset);
                            setShowAssetForm(true);
                          }}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
                        >
                          <Edit size={14} />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Current Value</span>
                          <span className="text-xl font-bold text-lime-400">${assetValue.toLocaleString()}</span>
                        </div>

                        {linkedDebt && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Owed ({linkedDebt.name})</span>
                            <span className="text-lg font-bold text-red-400">${debtBalance.toLocaleString()}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <span className="text-sm text-gray-400">Equity</span>
                          <span className="text-xl font-bold text-white">${equity.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Debts Section */}
            {debts.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Debts</h2>
                  <Button
                    type="button"
                    onClick={() => {
                      setEditingDebt(null);
                      setShowDebtForm(true);
                    }}
                    className="bg-lime-500 text-black font-bold hover:bg-lime-400 h-9 text-sm px-3"
                  >
                    <Plus size={14} className="mr-1" />
                    Add Debt
                  </Button>
                </div>

                <div className="space-y-3">
                  {debts.map((debt) => {
                    const linkedAsset = getLinkedAsset(debt.id);

                    const balance = Number(debt.balance) || 0;
                    const apr = debt.apr ?? "";
                    const minPay = Number(debt.minimum_payment) || 0;

                    const purchasePrice =
                      Number(linkedAsset?.purchase_price) ||
                      Number(debt.original_balance) ||
                      null;

                    const paidOffPercent =
                      purchasePrice && purchasePrice > 0
                        ? Math.max(0, Math.min(100, Math.round(((purchasePrice - balance) / purchasePrice) * 100)))
                        : null;

                    return (
                      <div
                        key={debt.id}
                        className="bg-gradient-to-br from-[#2a1f1f] to-[#1a1a2e] border border-red-500/20 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="min-w-0 pr-2">
                            <h3 className="font-semibold text-white text-base truncate">{debt.name}</h3>
                            <p className="text-xs text-gray-400 capitalize truncate">
                              {debt.type?.replace("_", " ")}
                              {linkedAsset && <span className="ml-2">• {linkedAsset.name}</span>}
                            </p>
                          </div>

                          <Button
                            type="button"
                            onClick={() => {
                              setEditingDebt(debt);
                              setShowDebtForm(true);
                            }}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
                          >
                            <Edit size={14} />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Balance</span>
                            <span className="text-xl font-bold text-red-400">${balance.toLocaleString()}</span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">APR</span>
                            <span className="text-white font-semibold">{apr !== "" ? `${apr}%` : "—"}</span>
                          </div>

                          <div className="flex items-center justify-between text-sm pt-2 border-t border-white/5">
                            <span className="text-gray-500">Min Payment</span>
                            <span className="text-gray-300">${minPay.toLocaleString()}</span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Due Day</span>
                            <span className="text-gray-300">{debt.due_day ?? "—"}</span>
                          </div>

                          {paidOffPercent !== null && (
                            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                              <span className="text-xs text-gray-500">Paid off</span>
                              <span className="text-sm font-semibold text-lime-400">{paidOffPercent}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {assets.length === 0 && debts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 mt-12">
                <div className="p-8 rounded-3xl bg-gradient-to-br from-lime-900/20 to-lime-950/10 mb-6">
                  <TrendingDown size={64} className="text-lime-500" strokeWidth={3} />
                </div>
                <h2 className="text-2xl font-black mb-3">Track your assets & debt</h2>
                <p className="text-gray-400 text-center text-sm max-w-sm mb-8 leading-relaxed">
                  Start by adding your assets (home, car) and any debts to see your net worth.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation (fixed) */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a2e] border-t border-white/10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-around">
            <Link to="/" className="flex flex-col items-center gap-1">
              <div className="text-gray-400">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </div>
              <span className="text-xs text-gray-400">Dashboard</span>
            </Link>

            <Link to="/bills" className="flex flex-col items-center gap-1">
              <Receipt className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-400">Bills</span>
            </Link>

            <Link to="/debt" className="flex flex-col items-center gap-1">
              <CreditCard className="w-6 h-6 text-lime-400" />
              <span className="text-xs text-lime-400 font-semibold">Debt</span>
            </Link>

            <Link to="/savings" className="flex flex-col items-center gap-1">
              <PiggyBank className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-400">Savings</span>
            </Link>

            <Link to="/payday" className="flex flex-col items-center gap-1">
              <Calendar className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-400">Payday</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Forms */}
      {showDebtForm && (
        <DebtForm
          debt={editingDebt}
          onClose={() => {
            setShowDebtForm(false);
            setEditingDebt(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["debts"] });
            setShowDebtForm(false);
            setEditingDebt(null);
          }}
        />
      )}

      {showAssetForm && (
        <AssetForm
          asset={editingAsset}
          onClose={() => {
            setShowAssetForm(false);
            setEditingAsset(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["assets"] });
            setShowAssetForm(false);
            setEditingAsset(null);
          }}
        />
      )}
    </div>
  );
}
