// src/pages/Home.jsx (or wherever your Home component lives)
// Copy/paste this whole file.

import React, { useState } from "react";
import { localDB } from "@/components/localDB";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ArrowRight,
  Receipt,
  CreditCard,
  PiggyBank,
  Calendar,
  MoreVertical,
} from "lucide-react";
import { Link } from "react-router-dom";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import IncomeForm from "@/components/forms/IncomeForm";
import BillForm from "@/components/forms/BillForm";
import DebtForm from "@/components/forms/DebtForm";
import SavingsGoalForm from "@/components/forms/SavingsGoalForm";
import OneTimeDepositForm from "@/components/forms/OneTimeDepositForm";

const quirkySayings = [
  "Rich people budget. Coincidence? I think not.",
  "Stop being broke. It's embarrassing.",
  "Your budget called. It misses you.",
  "Money talks, but wealth whispers.",
  "Budget like your future self is watching.",
];

export default function Home() {
  const queryClient = useQueryClient();

  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);

  const [showBillForm, setShowBillForm] = useState(false);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);

  const [showDepositForm, setShowDepositForm] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState(null);

  const [saying] = useState(
    () => quirkySayings[Math.floor(Math.random() * quirkySayings.length)]
  );

  const { data: budgets = [], isLoading: budgetLoading } = useQuery({
    queryKey: ["userBudget"],
    queryFn: async () => localDB.entities.UserBudget.filter(),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["bills"],
    queryFn: async () => localDB.entities.Bill.filter(),
    refetchOnWindowFocus: false,
  });

  const { data: debts = [] } = useQuery({
    queryKey: ["debts"],
    queryFn: async () => localDB.entities.Debt.filter(),
    refetchOnWindowFocus: false,
  });

  const { data: savingsGoals = [] } = useQuery({
    queryKey: ["savingsGoals"],
    queryFn: async () => localDB.entities.SavingsGoal.filter(),
    refetchOnWindowFocus: false,
  });

  const { data: incomes = [] } = useQuery({
    queryKey: ["incomes"],
    queryFn: async () => localDB.entities.Income.filter(),
    refetchOnWindowFocus: false,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => localDB.entities.Asset.filter(),
    refetchOnWindowFocus: false,
  });

  const { data: oneTimeDeposits = [] } = useQuery({
    queryKey: ["oneTimeDeposits"],
    queryFn: async () => localDB.entities.OneTimeDeposit.filter({ received: false }),
    refetchOnWindowFocus: false,
  });

  const budget = budgets[0];

  // Loading shell
  if (budgetLoading) {
    return <div className="screen h-[100dvh] overflow-hidden bg-[#0d0d1a]" />;
  }

  // If no budget yet, show onboarding (still inside a stable screen)
  if (!budget) {
    return (
      <div className="screen h-[100dvh] overflow-hidden bg-[#0d0d1a] text-white">
        <main className="app-scroll h-full">
          <div>
            <OnboardingFlow
              onComplete={() => {
                queryClient.invalidateQueries({ queryKey: ["userBudget"] });
                queryClient.invalidateQueries({ queryKey: ["incomes"] });
              }}
            />
          </div>
        </main>
      </div>
    );
  }

  // Upcoming statement dates (next 7 days)
  const upcomingStatements = debts.filter((debt) => {
    if (!debt.statement_day) return false;

    const today = new Date();
    const currentDay = today.getDate();
    const statementDay = debt.statement_day;

    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysUntilStatement =
      statementDay >= currentDay ? statementDay - currentDay : (daysInMonth - currentDay) + statementDay;

    return daysUntilStatement >= 0 && daysUntilStatement <= 7;
  });

  // Totals (unique bills by name)
  const uniqueBills = bills.reduce((acc, bill) => {
    if (!acc[bill.name]) acc[bill.name] = parseFloat(bill.amount) || 0;
    return acc;
  }, {});
  const totalBills = Object.values(uniqueBills).reduce((sum, amount) => sum + amount, 0);
  const uniqueBillCount = Object.keys(uniqueBills).length;

  const totalAssets = assets.reduce((sum, a) => sum + (parseFloat(a.current_value) || 0), 0);
  const totalSavingsGoals = savingsGoals.reduce((sum, g) => sum + (parseFloat(g.target_amount) || 0), 0);
  const currentSavings = savingsGoals.reduce((sum, g) => sum + (parseFloat(g.current_amount) || 0), 0);
  const savingsProgress = totalSavingsGoals > 0 ? Math.round((currentSavings / totalSavingsGoals) * 100) : 0;

  // Debt categories
  const debtCategories = [
    {
      type: "credit_card",
      label: "Credit Cards",
      amount: debts
        .filter((d) => d.type === "credit_card")
        .reduce((sum, d) => sum + (parseFloat(d.balance) || 0), 0),
      color: "purple",
      icon: "credit-card",
      showAsPercent: false,
    },
    {
      type: "student_loan",
      label: "Student Loans",
      amount: debts
        .filter((d) => d.type === "student_loan")
        .reduce((sum, d) => sum + (parseFloat(d.balance) || 0), 0),
      color: "blue",
      icon: "graduation",
      showAsPercent: false,
    },
    {
      type: "car_loan",
      label: "Auto Loans",
      amount: debts
        .filter((d) => d.type === "car_loan")
        .reduce((sum, d) => sum + (parseFloat(d.balance) || 0), 0),
      percentPaid: (() => {
        const carDebts = debts.filter((d) => d.type === "car_loan" && d.balance > 0);
        if (carDebts.length === 0) return 0;

        const totalPaid = carDebts.reduce((sum, d) => {
          const linkedAsset = assets.find((a) => a.id === d.linked_asset_id);
          const purchasePrice = linkedAsset?.purchase_price || d.original_balance || d.balance;
          return sum + (purchasePrice - d.balance);
        }, 0);

        const totalOriginal = carDebts.reduce((sum, d) => {
          const linkedAsset = assets.find((a) => a.id === d.linked_asset_id);
          return sum + (linkedAsset?.purchase_price || d.original_balance || d.balance);
        }, 0);

        return totalOriginal > 0 ? Math.round((totalPaid / totalOriginal) * 100) : 0;
      })(),
      color: "cyan",
      icon: "car",
      showAsPercent: true,
    },
    {
      type: "personal_loan",
      label: "Personal Loans",
      amount: debts
        .filter((d) => d.type === "personal_loan")
        .reduce((sum, d) => sum + (parseFloat(d.balance) || 0), 0),
      color: "orange",
      icon: "document",
      showAsPercent: false,
    },
    {
      type: "mortgage",
      label: "Mortgages",
      amount: debts
        .filter((d) => d.type === "mortgage")
        .reduce((sum, d) => sum + (parseFloat(d.balance) || 0), 0),
      percentPaid: (() => {
        const mortgageDebts = debts.filter((d) => d.type === "mortgage" && d.balance > 0);
        if (mortgageDebts.length === 0) return 0;

        const totalPaid = mortgageDebts.reduce((sum, d) => {
          const linkedAsset = assets.find((a) => a.id === d.linked_asset_id);
          const purchasePrice = linkedAsset?.purchase_price || d.original_balance || d.balance;
          return sum + (purchasePrice - d.balance);
        }, 0);

        const totalOriginal = mortgageDebts.reduce((sum, d) => {
          const linkedAsset = assets.find((a) => a.id === d.linked_asset_id);
          return sum + (linkedAsset?.purchase_price || d.original_balance || d.balance);
        }, 0);

        return totalOriginal > 0 ? Math.round((totalPaid / totalOriginal) * 100) : 0;
      })(),
      color: "red",
      icon: "home",
      showAsPercent: true,
    },
    {
      type: "medical",
      label: "Medical Debt",
      amount: debts
        .filter((d) => d.type === "medical")
        .reduce((sum, d) => sum + (parseFloat(d.balance) || 0), 0),
      color: "rose",
      icon: "medical",
      showAsPercent: false,
    },
  ].filter((cat) => cat.amount > 0);

  // Next payday
  const primaryIncome = incomes.find((i) => i.is_primary) || incomes[0];
  const nextPayday = primaryIncome?.next_payday;
  const expectedAmount = primaryIncome?.paycheck_amount || 0;

  // Flexible width logic for next payday tile
  const totalOtherCards = 3 + debtCategories.length; // Bills + Assets + Debt cats + Savings
  const isNextPaydayFullWidth = totalOtherCards % 2 === 0;

  const colorClasses = {
    purple: { bg: "bg-purple-500/20", text: "text-purple-400" },
    blue: { bg: "bg-blue-500/20", text: "text-blue-400" },
    cyan: { bg: "bg-cyan-500/20", text: "text-cyan-400" },
    orange: { bg: "bg-orange-500/20", text: "text-orange-400" },
    red: { bg: "bg-red-500/20", text: "text-red-400" },
    rose: { bg: "bg-rose-500/20", text: "text-rose-400" },
  };

  const icons = {
    "credit-card": (cls) => <CreditCard className={cls} size={16} />,
    graduation: (cls) => (
      <svg className={cls} width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
        />
      </svg>
    ),
    car: (cls) => (
      <svg className={cls} width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    document: (cls) => (
      <svg className={cls} width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    home: (cls) => (
      <svg className={cls} width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
    medical: (cls) => (
      <svg className={cls} width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    ),
  };

  return (
    <div className="safe-screen screen h-[100dvh] overflow-hidden bg-[#0d0d1a] text-white flex flex-col">
      {/* ✅ This restores the “respected space” like your other pages:
          safe-area top padding + safe-area bottom padding, inside the scroller */}
      <main className="app-scroll flex-1 min-h-0">
        <div className="">
          {/* 96px bottom gives room for the fixed bottom nav */}
          <div className="max-w-lg mx-auto px-4 py-4 sm:py-6">
            {/* Statement Date Warning */}
            {upcomingStatements.length > 0 && (
              <div className="mb-4 bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/50 rounded-xl p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-amber-200 text-sm sm:text-base mb-1">
                      Statement Date Reminder
                    </h3>
                    <div className="space-y-1">
                      {upcomingStatements.map((debt) => {
                        const today = new Date();
                        const statementDay = debt.statement_day;
                        const currentDay = today.getDate();
                        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                        const daysUntil =
                          statementDay >= currentDay
                            ? statementDay - currentDay
                            : (daysInMonth - currentDay) + statementDay;

                        return (
                          <p key={debt.id} className="text-xs sm:text-sm text-amber-100">
                            <strong>{debt.name}</strong> statement closes{" "}
                            {daysUntil === 0 ? "today" : `in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`}{" "}
                            - pay now to reduce utilization
                          </p>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="relative mb-4 sm:mb-6">
              {/* Settings (3-dot) */}
              <Link
                to="/settings"
                aria-label="Open settings"
                className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-md text-white hover:bg-white/10"
              >
                <MoreVertical size={20} />
              </Link>

              {/* Centered title + quote */}
              <div className="w-full text-center px-10">
                <h1 className="text-2xl sm:text-3xl font-black leading-tight">Dashboard</h1>
                <p className="text-lime-400 italic text-xs sm:text-sm mt-1">"{saying}"</p>
              </div>
            </div>

            {/* Income + Deposit buttons */}
            <div className="mb-3">
              <div className="mt-3 grid grid-cols-2 gap-2 mb-4">
                <Button
                  type="button"
                  onClick={() => {
                    setEditingIncome(null);
                    setShowIncomeForm(true);
                  }}
                  className="w-full h-11 bg-lime-500 text-black font-bold hover:bg-lime-400 text-sm px-4 whitespace-nowrap"
                >
                  <Plus size={16} className="mr-1" />
                  Income
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    setEditingDeposit(null);
                    setShowDepositForm(true);
                  }}
                  className="w-full h-11 bg-amber-500 text-black font-bold hover:bg-amber-400 text-sm px-4 whitespace-nowrap"
                >
                  <Plus size={16} className="mr-1" />
                  Deposit
                </Button>
              </div>

              {incomes.length === 0 && oneTimeDeposits.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-xs sm:text-sm mb-3">
                    Add regular income sources and one-time deposits (tax returns, bonuses, etc.)
                  </p>
                </div>
              ) : (
                <>
                  {/* One-Time Deposits */}
                  {oneTimeDeposits.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-amber-400 font-semibold mb-2">Pending Deposits</p>
                      <div className="space-y-2">
                        {oneTimeDeposits.map((deposit) => (
                          <div
                            key={deposit.id}
                            onClick={() => {
                              setEditingDeposit(deposit);
                              setShowDepositForm(true);
                            }}
                            className="bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 rounded-lg p-3 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold text-white text-sm">{deposit.name}</h3>
                                <p className="text-xs text-gray-400 mt-1">
                                  Expected:{" "}
                                  {(() => {
                                    const [y, m, d] = deposit.expected_date.split("-").map(Number);
                                    const date = new Date(y, m - 1, d);
                                    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                                  })()}
                                </p>
                              </div>
                              <p className="text-lg font-semibold text-amber-400">
                                ${Number(deposit.amount || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regular Incomes */}
                  {incomes.length > 0 && (
                    <div className="space-y-2">
                      {incomes.map((income) => (
                        <div
                          key={income.id}
                          onClick={() => {
                            setEditingIncome(income);
                            setShowIncomeForm(true);
                          }}
                          className="bg-white/5 hover:bg-white/10 rounded-lg p-3 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                                {income.name}
                                {income.is_primary && (
                                  <span className="text-xs bg-lime-500/20 text-lime-400 px-2 py-0.5 rounded">
                                    Primary
                                  </span>
                                )}
                              </h3>
                              <p className="text-xs text-gray-400 mt-1">
                                {String(income.pay_frequency || "").replace("_", "-")} • $
                                {Number(income.paycheck_amount || 0).toLocaleString()}/check
                              </p>
                            </div>

                            {income.next_payday && (
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Next</p>
                                <p className="text-sm font-semibold text-lime-400">
                                  {(() => {
                                    const [y, m, d] = income.next_payday.split("-").map(Number);
                                    const date = new Date(y, m - 1, d);
                                    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                                  })()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
              {/* Monthly Bills */}
              <Link to="/bills">
                <div className="bg-[#1a1a2e] border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 hover:bg-[#252538] transition-colors cursor-pointer">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-pink-500/20 mb-2">
                      <Receipt className="text-pink-400" size={16} />
                    </div>
                    <span className="text-xs sm:text-sm text-gray-400 mb-2">Monthly Bills</span>
                    <p className="text-xl sm:text-2xl font-black mb-1">${totalBills.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{uniqueBillCount} bills</p>
                  </div>
                </div>
              </Link>

              {/* Assets (you link to /debt currently, keeping as-is) */}
              <Link to="/debt">
                <div className="bg-[#1a1a2e] border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 hover:bg-[#252538] transition-colors cursor-pointer">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/20 mb-2">
                      <svg
                        className="text-emerald-400"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                        />
                      </svg>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-400 mb-2">Assets</span>
                    <p className="text-xl sm:text-2xl font-black mb-1">${totalAssets.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{assets.length} tracked</p>
                  </div>
                </div>
              </Link>

              {/* Dynamic Debt Categories */}
              {debtCategories.map((category) => {
                const cls = colorClasses[category.color] || colorClasses.purple;

                // utilization (if credit limits exist for this category)
                const totalLimit = debts
                  .filter((d) => d.type === category.type && d.credit_limit)
                  .reduce((sum, d) => sum + (Number(d.credit_limit) || 0), 0);
                const utilization = totalLimit > 0 ? Math.round((category.amount / totalLimit) * 100) : null;

                const iconRenderer = icons[category.icon];
                const iconNode = iconRenderer ? iconRenderer(cls.text) : <CreditCard className={cls.text} size={16} />;

                return (
                  <Link key={category.type} to="/debt">
                    <div className="bg-[#1a1a2e] border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 hover:bg-[#252538] transition-colors cursor-pointer">
                      <div className="flex flex-col items-center text-center">
                        <div className={`p-1.5 sm:p-2 rounded-lg ${cls.bg} mb-2`}>{iconNode}</div>
                        <span className="text-xs sm:text-sm text-gray-400 mb-2">{category.label}</span>
                        <p className="text-xl sm:text-2xl font-black mb-1">${category.amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">
                          {category.showAsPercent
                            ? `${category.percentPaid || 0}% paid off`
                            : utilization !== null
                            ? `${utilization}% utilization`
                            : "debt"}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {/* Savings Goals */}
              <Link to="/savings">
                <div className="bg-[#1a1a2e] border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 hover:bg-[#252538] transition-colors cursor-pointer">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-lime-500/20 mb-2">
                      <PiggyBank className="text-lime-400" size={16} />
                    </div>
                    <span className="text-xs sm:text-sm text-gray-400 mb-2">Savings Goals</span>
                    <p className="text-xl sm:text-2xl font-black mb-1">${currentSavings.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{savingsProgress}% to goals</p>
                  </div>
                </div>
              </Link>

              {/* Next Payday */}
              <div className={isNextPaydayFullWidth ? "col-span-2" : ""}>
                <div className="bg-[#1a1a2e] border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 hover:bg-[#252538] transition-colors cursor-pointer">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/20 mb-2">
                      <Calendar className="text-green-400" size={16} />
                    </div>
                    <span className="text-xs sm:text-sm text-gray-400 mb-2">Next Payday</span>
                    <p className="text-xl sm:text-2xl font-black mb-1">
                      {nextPayday
                        ? (() => {
                            const [y, m, d] = String(nextPayday).split("-").map(Number);
                            const date = new Date(y, m - 1, d);
                            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                          })()
                        : "Not set"}
                    </p>
                    <p className="text-xs text-gray-500">${Number(expectedAmount || 0).toLocaleString()}</p>

                    {isNextPaydayFullWidth && primaryIncome && (
                      <div className="mt-3 pt-3 border-t border-white/10 w-full flex justify-center gap-8">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Income Source</p>
                          <p className="text-sm font-semibold text-white">{primaryIncome.name}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Frequency</p>
                          <p className="text-sm font-semibold text-white capitalize">
                            {String(primaryIncome.pay_frequency || "").replace("_", "-")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="w-full mt-4">
              <Link to="/payday">
                <Button className="w-full h-12 sm:h-14 bg-lime-500 text-black font-bold hover:bg-lime-400 text-sm sm:text-base">
                  Plan Payday
                  <ArrowRight size={16} className="ml-1 sm:ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation (fixed) */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a2e] border-t border-white/10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-around">
            <Link to="/" className="flex flex-col items-center gap-1">
              <div className="text-lime-400">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </div>
              <span className="text-xs text-lime-400 font-semibold">Dashboard</span>
            </Link>

            <Link to="/bills" className="flex flex-col items-center gap-1">
              <Receipt className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-400">Bills</span>
            </Link>

            <Link to="/debt" className="flex flex-col items-center gap-1">
              <CreditCard className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-400">Debt</span>
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

      {/* Forms / Modals */}
      {showIncomeForm && (
        <IncomeForm
          income={editingIncome}
          onClose={() => {
            setShowIncomeForm(false);
            setEditingIncome(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["incomes"] });
            setShowIncomeForm(false);
            setEditingIncome(null);
          }}
        />
      )}

      {showBillForm && (
        <BillForm
          onClose={() => setShowBillForm(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["bills"] });
            setShowBillForm(false);
          }}
        />
      )}

      {showDebtForm && (
        <DebtForm
          onClose={() => setShowDebtForm(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["debts"] });
            setShowDebtForm(false);
          }}
        />
      )}

      {showGoalForm && (
        <SavingsGoalForm
          onClose={() => setShowGoalForm(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["savingsGoals"] });
            setShowGoalForm(false);
          }}
        />
      )}

      {showDepositForm && (
        <OneTimeDepositForm
          deposit={editingDeposit}
          onClose={() => {
            setShowDepositForm(false);
            setEditingDeposit(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["oneTimeDeposits"] });
            queryClient.invalidateQueries({ queryKey: ["userBudget"] });
            setShowDepositForm(false);
            setEditingDeposit(null);
          }}
        />
      )}
    </div>
  );
}
