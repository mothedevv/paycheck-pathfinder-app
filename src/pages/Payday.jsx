// src/pages/Payday.jsx
// Copy/paste this whole file.

import React, { useMemo, useState, useEffect } from "react";
import { localDB } from "@/components/localDB";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Receipt,
  CreditCard,
  PiggyBank,
  Calendar,
  Sparkles,
  Info,
  CheckCircle,
  Edit,
  X,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BillForm from "@/components/forms/BillForm";
import DebtForm from "@/components/forms/DebtForm";
import SavingsGoalForm from "@/components/forms/SavingsGoalForm";

const quirkySayings = [
  "Stop treating your savings like an emergency fund for brunch.",
  "Your paycheck has a purpose. Give it one.",
  "Budget like you mean it.",
  "Every dollar needs a job.",
];

function toDateParts(yyyyMmDd) {
  const [y, m, d] = String(yyyyMmDd || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function dateFromParts({ y, m, d }, endOfDay = false) {
  const dt = new Date(y, m - 1, d);
  if (endOfDay) dt.setHours(23, 59, 59, 999);
  else dt.setHours(0, 0, 0, 0);
  return dt;
}

function formatMoney(n) {
  const num = Number(n) || 0;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMoneyNoCents(n) {
  const num = Number(n) || 0;
  return num.toLocaleString();
}

function clamp(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

export default function Payday() {
  const queryClient = useQueryClient();

  const [saying] = useState(
    () => quirkySayings[Math.floor(Math.random() * quirkySayings.length)]
  );
  const [showBillForm, setShowBillForm] = useState(false);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const [showBucketInfo, setShowBucketInfo] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [showEditPayday, setShowEditPayday] = useState(false);
  const [editPaydayDate, setEditPaydayDate] = useState("");
  const [editPaydayAmount, setEditPaydayAmount] = useState("");

  // ✅ Savings allocation control (Auto vs Custom)
  const [allocationMode, setAllocationMode] = useState("auto"); // "auto" | "custom"
  const [debtAllocations, setDebtAllocations] = useState({}); // { [debtId]: number }
  const [goalAllocations, setGoalAllocations] = useState({}); // { [goalId]: number }

  // ✅ Expand/collapse itemized auto breakdown
  const [showAutoBreakdown, setShowAutoBreakdown] = useState(true);

  const { data: budgets = [] } = useQuery({
    queryKey: ["userBudget"],
    queryFn: async () => localDB.entities.UserBudget.filter(),
    refetchOnWindowFocus: false,
  });

  const { data: incomes = [] } = useQuery({
    queryKey: ["incomes"],
    queryFn: async () => localDB.entities.Income.filter(),
    refetchOnWindowFocus: false,
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

  const { data: paydayHistory = [] } = useQuery({
    queryKey: ["paydayHistory"],
    queryFn: async () => localDB.entities.PaydayHistory.filter(),
    refetchOnWindowFocus: false,
  });

  const budget = budgets[0];

  const computed = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingPaydays = incomes
      .filter((i) => i?.next_payday)
      .map((i) => {
        const parts = toDateParts(i.next_payday);
        if (!parts) return null;
        return { income: i, date: dateFromParts(parts, false), dateStr: i.next_payday };
      })
      .filter(Boolean)
      .filter((p) => p.date >= today)
      .sort((a, b) => a.date - b.date);

    const nextPaydayDateStr = upcomingPaydays.length > 0 ? upcomingPaydays[0].dateStr : null;
    const incomesOnNextPayday = nextPaydayDateStr
      ? upcomingPaydays.filter((p) => p.dateStr === nextPaydayDateStr)
      : [];

    const primaryIncome = incomesOnNextPayday[0]?.income || null;

    const paycheckAmount = incomesOnNextPayday.reduce(
      (sum, p) => sum + (Number(p.income?.paycheck_amount) || 0),
      0
    );

    const payFrequency =
      incomesOnNextPayday.length > 1 ? "combined" : (primaryIncome?.pay_frequency || "biweekly");

    // Bucket balances carried forward
    const billsBucketBalance = Number(budget?.bills_bucket_balance) || 0;
    const spendingBucketBalance = Number(budget?.spending_bucket_balance) || 0;
    const savingsBucketBalance = Number(budget?.savings_bucket_balance) || 0;

    const billsPct = Number(budget?.bills_percentage) || 0;
    const spendingPct = Number(budget?.spending_percentage) || 0;
    const savingsPct = Number(budget?.savings_percentage) || 0;

    const billsAmount = budget ? paycheckAmount * (billsPct / 100) + billsBucketBalance : 0;
    const spendingAmount = budget ? paycheckAmount * (spendingPct / 100) + spendingBucketBalance : 0;
    const savingsAmount = budget ? paycheckAmount * (savingsPct / 100) + savingsBucketBalance : 0;

    // Compute next payday after this for filtering bills
    const nextPaydayAfterThis = (() => {
      if (!nextPaydayDateStr) return null;

      if (upcomingPaydays.length >= 2) return upcomingPaydays[1].date;

      if (!primaryIncome) return null;

      const parts = toDateParts(nextPaydayDateStr);
      if (!parts) return null;

      const nextDt = dateFromParts(parts, false);
      const frequency = primaryIncome?.pay_frequency;

      if (frequency === "weekly") nextDt.setDate(nextDt.getDate() + 7);
      else if (frequency === "biweekly") nextDt.setDate(nextDt.getDate() + 14);
      else if (frequency === "semimonthly") nextDt.setDate(nextDt.getDate() + 15);
      else if (frequency === "monthly") nextDt.setMonth(nextDt.getMonth() + 1);
      else return null;

      return nextDt;
    })();

    // Bills due this paycheck
    const billsByPriority = bills
      .filter((bill) => {
        if (!bill?.due_date) return false;
        if (bill.last_paid_date) return false;

        const dueParts = toDateParts(bill.due_date);
        if (!dueParts) return false;

        const dueDate = dateFromParts(dueParts, false);

        // If no next payday scheduled, include all unpaid bills
        if (!nextPaydayAfterThis) return true;

        // Past due OR due before day before next payday
        const isPastDue = dueDate < today;

        const dayBeforeNext = new Date(nextPaydayAfterThis);
        dayBeforeNext.setDate(dayBeforeNext.getDate() - 1);
        dayBeforeNext.setHours(23, 59, 59, 999);

        const isDueBeforeNextPayday = dueDate <= dayBeforeNext;

        return isPastDue || isDueBeforeNextPayday;
      })
      .sort((a, b) => {
        if (a.is_autopay && !b.is_autopay) return -1;
        if (!a.is_autopay && b.is_autopay) return 1;

        const aLateBy = a.late_by_date || a.due_date;
        const bLateBy = b.late_by_date || b.due_date;

        return String(aLateBy).localeCompare(String(bLateBy));
      });

    let remainingBillsBucket = billsAmount;
    const billsDueNow = [];
    const billsSkipped = [];

    for (const bill of billsByPriority) {
      const amt = Number(bill.amount) || 0;
      if (remainingBillsBucket >= amt) {
        billsDueNow.push(bill);
        remainingBillsBucket -= amt;
      } else {
        billsSkipped.push(bill);
      }
    }

    const totalBillsDueAmount = billsDueNow.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const billsUnallocated = remainingBillsBucket;

    // Debt allocation from savings bucket (extra payments only)
    const debtPaymentBillNames = billsByPriority
      .filter((b) => b.category === "debt_payments")
      .map((b) => b.name);

    const debtStrategy = budget?.debt_strategy || "avalanche";

    const sortedDebts = [...debts]
      .filter((d) => (Number(d.balance) || 0) > 0)
      .filter((d) => {
        const billName = `${d.name} Payment`;
        return !debtPaymentBillNames.includes(billName);
      })
      .sort((a, b) => {
        if (debtStrategy === "snowball") return (Number(a.balance) || 0) - (Number(b.balance) || 0);
        return (Number(b.apr) || 0) - (Number(a.apr) || 0);
      });

    let remainingSavingsBucket = savingsAmount;
    const debtsToAllocate = [];

    for (const debt of sortedDebts) {
      if (remainingSavingsBucket <= 0) break;
      const bal = Number(debt.balance) || 0;
      const amountToAllocate = Math.min(bal, remainingSavingsBucket);
      if (amountToAllocate > 0) {
        debtsToAllocate.push({ ...debt, allocated: amountToAllocate });
        remainingSavingsBucket -= amountToAllocate;
      }
    }

    const totalDebtAllocation = debtsToAllocate.reduce(
      (sum, d) => sum + (Number(d.allocated) || 0),
      0
    );

    // Savings goals allocation (priority-based)
    const sortedGoals = [...savingsGoals]
      .filter((g) => (Number(g.current_amount) || 0) < (Number(g.target_amount) || 0))
      .sort((a, b) => (Number(a.priority) || 999) - (Number(b.priority) || 999));

    const goalsToAllocate = [];
    let remainingForGoals = remainingSavingsBucket;

    for (const goal of sortedGoals) {
      if (remainingForGoals <= 0) break;

      const needed = (Number(goal.target_amount) || 0) - (Number(goal.current_amount) || 0);
      const toAllocate = Math.min(needed, remainingForGoals);

      if (toAllocate > 0) {
        goalsToAllocate.push({ ...goal, allocated: toAllocate });
        remainingForGoals -= toAllocate;
      }
    }

    const savingsUnallocated = remainingForGoals;
    const hasHYSA = Boolean(budget?.has_hysa);

    const totalGoalsAllocation = goalsToAllocate.reduce(
      (s, g) => s + (Number(g.allocated) || 0),
      0
    );

    return {
      today,
      upcomingPaydays,
      nextPayday: nextPaydayDateStr,
      incomesOnNextPayday,
      primaryIncome,
      paycheckAmount,
      payFrequency,
      billsBucketBalance,
      spendingBucketBalance,
      savingsBucketBalance,
      billsAmount,
      spendingAmount,
      savingsAmount,
      billsByPriority,
      billsDueNow,
      billsSkipped,
      totalBillsDueAmount,
      billsUnallocated,
      debtStrategy,
      sortedDebts,
      debtsToAllocate,
      totalDebtAllocation,
      sortedGoals,
      goalsToAllocate,
      totalGoalsAllocation,
      savingsUnallocated,
      hasHYSA,
    };
  }, [incomes, bills, debts, savingsGoals, budget]);

  // ✅ Seed custom allocations from current auto plan (so switching to Custom feels sane)
  useEffect(() => {
    if (!computed) return;

    const nextDebtMap = {};
    (debts || []).forEach((d) => (nextDebtMap[d.id] = 0));

    const nextGoalMap = {};
    (savingsGoals || []).forEach((g) => (nextGoalMap[g.id] = 0));

    (computed.debtsToAllocate || []).forEach((d) => {
      if (d?.id) nextDebtMap[d.id] = Number(d.allocated || 0);
    });

    (computed.goalsToAllocate || []).forEach((g) => {
      if (g?.id) nextGoalMap[g.id] = Number(g.allocated || 0);
    });

    setDebtAllocations(nextDebtMap);
    setGoalAllocations(nextGoalMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed?.nextPayday, (debts || []).length, (savingsGoals || []).length]);

  // ✅ Final plan: auto vs custom
  const allocationPlan = useMemo(() => {
    const available = Number(computed?.savingsAmount || 0);

    if (allocationMode === "auto") {
      const debtTotal = Number(computed?.totalDebtAllocation || 0);
      const goalTotal = Number(computed?.totalGoalsAllocation || 0);
      const total = debtTotal + goalTotal;

      // ✅ Itemized arrays already exist: debtsToAllocate / goalsToAllocate
      return {
        mode: "auto",
        available,
        debts: (computed?.debtsToAllocate || []).map((d) => ({
          debt: d,
          payment: Number(d.allocated || 0),
        })),
        goals: (computed?.goalsToAllocate || []).map((g) => ({
          goal: g,
          amount: Number(g.allocated || 0),
        })),
        debtTotal,
        goalTotal,
        totalAllocated: total,
        unallocated: Math.max(0, available - total),
        isOver: total > available + 0.01,
      };
    }

    // Custom mode: show ALL debts and ALL goals (capped)
    const debtRows = (debts || [])
      .filter((d) => (Number(d.balance) || 0) > 0)
      .map((d) => {
        const bal = Number(d.balance || 0);
        const raw = Number(debtAllocations?.[d.id] || 0);
        const payment = clamp(raw, 0, bal);
        return { debt: d, payment };
      });

    const goalRows = (savingsGoals || [])
      .filter((g) => (Number(g.target_amount) || 0) > 0)
      .map((g) => {
        const current = Number(g.current_amount || 0);
        const target = Number(g.target_amount || 0);
        const need = Math.max(0, target - current);
        const raw = Number(goalAllocations?.[g.id] || 0);
        const amount = clamp(raw, 0, need);
        return { goal: g, amount, need };
      });

    const debtTotal = debtRows.reduce((s, r) => s + (Number(r.payment) || 0), 0);
    const goalTotal = goalRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalAllocated = debtTotal + goalTotal;

    return {
      mode: "custom",
      available,
      debtRows,
      goalRows,
      debts: debtRows.filter((r) => (Number(r.payment) || 0) > 0),
      goals: goalRows.filter((r) => (Number(r.amount) || 0) > 0),
      debtTotal,
      goalTotal,
      totalAllocated,
      unallocated: Math.max(0, available - totalAllocated),
      isOver: totalAllocated > available + 0.01,
    };
  }, [allocationMode, computed, debts, savingsGoals, debtAllocations, goalAllocations]);

  const handleMarkComplete = async () => {
    if (!computed.primaryIncome || !computed.nextPayday) return;
    if (allocationPlan.isOver) {
      alert("Your custom allocation exceeds the savings bucket. Reduce amounts before completing payday.");
      return;
    }

    if (!confirm("Mark this payday as complete? This will record allocations and update your next payday date.")) {
      return;
    }

    setIsCompleting(true);
    try {
      const billsAllocatedData = computed.billsDueNow.map((bill) => ({
        bill_name: bill.name,
        amount_due: Number(bill.amount) || 0,
        amount_allocated: Number(bill.amount) || 0,
        due_date: bill.due_date,
        was_autopay: Boolean(bill.is_autopay),
      }));

      const debtsAllocatedData = (allocationPlan.debts || []).map(({ debt, payment }) => ({
        debt_name: debt.name,
        amount_allocated: Number(payment) || 0,
        apr: Number(debt.apr) || 0,
      }));

      const savingsGoalsAllocatedData = (allocationPlan.goals || []).map(({ goal, amount }) => ({
        goal_name: goal.name,
        amount_allocated: Number(amount) || 0,
      }));

      const parts = toDateParts(computed.nextPayday);
      const localPaydayDate = parts ? dateFromParts(parts, false) : new Date();
      const paydayDateStr = `${localPaydayDate.getFullYear()}-${String(localPaydayDate.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(localPaydayDate.getDate()).padStart(2, "0")}`;

      await localDB.entities.PaydayHistory.create({
        payday_date: paydayDateStr,
        paycheck_amount: Number(computed.paycheckAmount) || 0,
        bills_amount: Number(computed.billsAmount) || 0,
        spending_amount: Number(computed.spendingAmount) || 0,
        savings_amount: Number(computed.savingsAmount) || 0,
        bills_allocated: billsAllocatedData,
        debts_allocated: debtsAllocatedData,
        savings_goals_allocated: savingsGoalsAllocatedData,
        bills_unallocated: Number(computed.billsUnallocated) || 0,
        savings_unallocated: Number(allocationPlan.unallocated) || 0,
      });

      // Update each bill allocated
      for (const bill of computed.billsDueNow) {
        const amt = Number(bill.amount) || 0;
        await localDB.entities.Bill.update(bill.id, {
          allocated_amount: (Number(bill.allocated_amount) || 0) + amt,
          last_allocated_date: paydayDateStr,
        });
      }

      // Debts paid via bills
      const debtPaymentBills = computed.billsDueNow.filter((b) => b.category === "debt_payments");
      for (const bill of debtPaymentBills) {
        const debtName = String(bill.name || "").replace(" Payment", "");
        const debt = debts.find((d) => d.name === debtName);
        if (debt) {
          await localDB.entities.Debt.update(debt.id, {
            balance: Math.max(0, (Number(debt.balance) || 0) - (Number(bill.amount) || 0)),
          });
        }
      }

      // Extra debt payments (auto/custom)
      for (const { debt, payment } of allocationPlan.debts || []) {
        await localDB.entities.Debt.update(debt.id, {
          balance: Math.max(0, (Number(debt.balance) || 0) - (Number(payment) || 0)),
        });
      }

      // Savings goals (auto/custom)
      for (const { goal, amount } of allocationPlan.goals || []) {
        await localDB.entities.SavingsGoal.update(goal.id, {
          current_amount: (Number(goal.current_amount) || 0) + (Number(amount) || 0),
        });
      }

      // Advance next payday for each income on this payday
      for (const { income } of computed.incomesOnNextPayday) {
        const p = toDateParts(income.next_payday);
        if (!p) continue;

        const nextDt = dateFromParts(p, false);
        const frequency = income.pay_frequency;

        if (frequency === "weekly") nextDt.setDate(nextDt.getDate() + 7);
        else if (frequency === "biweekly") nextDt.setDate(nextDt.getDate() + 14);
        else if (frequency === "semimonthly") nextDt.setDate(nextDt.getDate() + 15);
        else if (frequency === "monthly") nextDt.setMonth(nextDt.getMonth() + 1);

        const yyyy = nextDt.getFullYear();
        const mm = String(nextDt.getMonth() + 1).padStart(2, "0");
        const dd = String(nextDt.getDate()).padStart(2, "0");

        await localDB.entities.Income.update(income.id, {
          next_payday: `${yyyy}-${mm}-${dd}`,
        });
      }

      // Update bucket balances
      if (budget?.id) {
        await localDB.entities.UserBudget.update(budget.id, {
          bills_bucket_balance: Number(computed.billsUnallocated) || 0,
          spending_bucket_balance: 0,
          savings_bucket_balance: Number(allocationPlan.unallocated) || 0,
        });
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      queryClient.invalidateQueries({ queryKey: ["userBudget"] });
      queryClient.invalidateQueries({ queryKey: ["paydayHistory"] });
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["savingsGoals"] });

      alert("Payday marked complete! Next payday updated.");
    } catch (error) {
      console.error("Error marking payday complete:", error);
      alert("Error completing payday. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="safe-screen screen h-[100dvh] overflow-hidden bg-[#0d0d1a] text-white flex flex-col">
      {/* ✅ Controlled scroll + safe areas */}
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

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHistory(true)}
                  className="text-white/70 hover:text-white hover:bg-white/10 h-9 w-9 sm:h-10 sm:w-10"
                  title="Payday history"
                >
                  <History size={18} />
                </Button>
              </div>

              <div className="w-full text-center px-10">
                <h1 className="text-2xl sm:text-3xl font-black leading-tight">Payday</h1>
                <p className="text-lime-400 italic text-xs sm:text-sm mt-1">"{saying}"</p>
              </div>
            </div>

            {/* Payday Card */}
            <div className="mt-4 sm:mt-6 bg-gradient-to-br from-[#2d3a1f] to-[#1a2312] border border-lime-500/30 rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 text-lime-400 text-xs mb-1">
                <Calendar size={12} />
                <span>{String(computed.payFrequency).replace("_", "-")} pay</span>
              </div>

              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl sm:text-2xl font-black">
                  {computed.nextPayday
                    ? (() => {
                        const parts = toDateParts(computed.nextPayday);
                        const dt = parts ? dateFromParts(parts, false) : new Date();
                        return dt.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        });
                      })()
                    : "No payday set"}
                </h2>

                <Button
                  type="button"
                  onClick={() => {
                    setEditPaydayDate(computed.nextPayday || "");
                    setEditPaydayAmount(String(computed.paycheckAmount || ""));
                    setShowEditPayday(true);
                  }}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-lime-400 hover:text-lime-300 hover:bg-lime-500/10"
                >
                  <Edit size={16} />
                </Button>
              </div>

              <p className="text-gray-400 text-xs mb-1">Expected Amount</p>
              <p className="text-3xl sm:text-4xl font-black text-lime-400 mb-3 sm:mb-4">
                ${formatMoneyNoCents(computed.paycheckAmount)}
              </p>

              {/* Buckets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-gray-400">Your Buckets</h3>
                  <Button
                    type="button"
                    onClick={() => setShowBucketInfo(true)}
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10"
                  >
                    <Info size={16} />
                  </Button>
                </div>

                {/* Bills Bucket */}
                <div className="bg-gradient-to-br from-pink-900/40 to-pink-950/30 border border-pink-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-pink-500/20">
                      <Receipt className="text-pink-400" size={20} />
                    </div>
                    <div className="flex-1">
                      <span className="text-pink-200 text-xs font-semibold uppercase tracking-wide block mb-0.5">
                        Bills
                      </span>
                      <p className="text-2xl font-black text-white">${formatMoney(computed.billsAmount)}</p>
                      {computed.billsBucketBalance > 0 && (
                        <p className="text-xs text-pink-200/60">
                          +${formatMoney(computed.billsBucketBalance)} carried forward
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Spending Bucket */}
                <div className="bg-gradient-to-br from-purple-900/40 to-purple-950/30 border border-purple-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <CreditCard className="text-purple-400" size={20} />
                    </div>
                    <div className="flex-1">
                      <span className="text-purple-200 text-xs font-semibold uppercase tracking-wide block mb-0.5">
                        Spending
                      </span>
                      <p className="text-2xl font-black text-white">${formatMoney(computed.spendingAmount)}</p>
                      {computed.spendingBucketBalance > 0 && (
                        <p className="text-xs text-purple-200/60">
                          +${formatMoney(computed.spendingBucketBalance)} from deposits
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Savings Bucket */}
                <div className="bg-gradient-to-br from-lime-900/40 to-lime-950/30 border border-lime-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-lime-500/20">
                      <PiggyBank className="text-lime-400" size={20} />
                    </div>
                    <div className="flex-1">
                      <span className="text-lime-200 text-xs font-semibold uppercase tracking-wide block mb-0.5">
                        Savings
                      </span>
                      <p className="text-2xl font-black text-white">${formatMoney(computed.savingsAmount)}</p>
                      {computed.savingsBucketBalance > 0 && (
                        <p className="text-xs text-lime-200/60">
                          +${formatMoney(computed.savingsBucketBalance)} from deposits
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Debt Strategy Selector */}
            {debts.length > 0 && budget?.id && (
              <div className="mt-4 sm:mt-6 bg-[#1a1a2e] border border-white/10 rounded-xl p-4">
                <Label className="text-sm text-gray-400 mb-2 block">Debt Payoff Strategy</Label>
                <Select
                  value={budget?.debt_strategy || "avalanche"}
                  onValueChange={async (value) => {
                    try {
                      await localDB.entities.UserBudget.update(budget.id, { debt_strategy: value });
                      queryClient.invalidateQueries({ queryKey: ["userBudget"] });
                    } catch (error) {
                      console.error("Error updating debt strategy:", error);
                    }
                  }}
                >
                  <SelectTrigger className="bg-[#252538] border-white/10 text-white h-auto py-3">
                    <SelectValue>
                      {budget?.debt_strategy === "snowball"
                        ? "Snowball Method - Pay smallest balance first (quick wins)"
                        : "Avalanche Method - Pay highest APR first (saves most money)"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    <SelectItem value="avalanche" className="py-3">
                      <div className="flex flex-col items-start">
                        <span className="font-semibold">Avalanche Method</span>
                        <span className="text-xs text-gray-400">Pay highest APR first (saves most money)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="snowball" className="py-3">
                      <div className="flex flex-col items-start">
                        <span className="font-semibold">Snowball Method</span>
                        <span className="text-xs text-gray-400">Pay smallest balance first (quick wins)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* HYSA Warning */}
            {!computed.hasHYSA && (
              <div className="mt-6 bg-gradient-to-r from-amber-900/20 to-amber-950/20 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                <Sparkles className="text-amber-400 mt-0.5 flex-shrink-0" size={24} />
                <div className="flex-1">
                  <h3 className="font-bold text-white mb-1">Don't have a HYSA yet?</h3>
                  <p className="text-sm text-gray-300">
                    Your bills and savings should sit in a high-yield account.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-amber-400 hover:bg-amber-500/10 flex-shrink-0"
                  onClick={() =>
                    window.open(
                      "https://www.fool.com/money/banks/landing/best-high-yield-savings-accounts/",
                      "_blank"
                    )
                  }
                  title="Find HYSA options"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </Button>
              </div>
            )}

            {/* Pay These Bills Now */}
            <div className="mt-6">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <span className="text-pink-400">$</span>
                Pay These Bills Now
              </h3>

              {computed.billsDueNow.length === 0 ? (
                <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-6 flex flex-col items-center justify-center">
                  <CheckCircle className="text-lime-500 mb-2" size={40} />
                  <p className="text-gray-400 text-center text-sm">No bills due this check!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {computed.billsDueNow.map((bill) => (
                    <div key={bill.id} className="bg-[#1a1a2e] border border-white/10 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <h4 className="font-semibold text-white text-sm truncate">{bill.name}</h4>
                          <p className="text-xs text-gray-400">
                            Due:{" "}
                            {(() => {
                              const p = toDateParts(bill.due_date);
                              const dt = p ? dateFromParts(p, false) : new Date();
                              return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                            })()}
                            {bill.is_autopay && <span className="ml-2 text-lime-400">• Auto-pay</span>}
                            {bill.late_by_date &&
                              (() => {
                                const p = toDateParts(bill.late_by_date);
                                if (!p) return null;
                                const late = dateFromParts(p, false);
                                return (
                                  <span className="ml-2 text-orange-400">
                                    • Late by{" "}
                                    {late.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                );
                              })()}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-pink-400">${formatMoney(bill.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bills Bucket Summary */}
            <div className="mt-4 bg-gradient-to-br from-pink-900/20 to-pink-950/10 border border-pink-500/30 rounded-lg p-3">
              <div className="space-y-1.5">
                {computed.billsBucketBalance > 0 && (
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                    <p className="text-xs text-gray-300">Previous Balance</p>
                    <p className="text-base font-semibold text-purple-400">
                      ${formatMoney(computed.billsBucketBalance)}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-300">Bills Bucket Total</p>
                  <p className="text-lg font-bold text-white">${formatMoney(computed.billsAmount)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-300">Paying Now</p>
                  <p className="text-base font-semibold text-pink-400">
                    -${formatMoney(computed.totalBillsDueAmount)}
                  </p>
                </div>
                <div className="border-t border-white/10 pt-1.5 flex items-center justify-between">
                  <p className="text-xs text-gray-300">Carries to Next Payday</p>
                  <p className="text-lg font-bold text-lime-400">${formatMoney(computed.billsUnallocated)}</p>
                </div>
              </div>
            </div>

            {/* ✅ Savings Allocation (Auto vs Custom) */}
            <div className="mt-6">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
                <PiggyBank className="text-lime-400" size={18} />
                Savings Allocation
              </h3>

              <p className="text-gray-400 mb-4 text-sm">
                Available from Savings bucket:{" "}
                <span className="text-lime-400 font-bold">${formatMoney(computed.savingsAmount)}</span>
              </p>

              {/* Mode Toggle */}
              <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-3 mb-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => setAllocationMode("auto")}
                    className={
                      allocationMode === "auto"
                        ? "flex-1 bg-lime-500 text-black font-bold hover:bg-lime-400"
                        : "flex-1 bg-white/10 border border-white/20 text-white hover:bg-white/20"
                    }
                  >
                    Auto
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setAllocationMode("custom")}
                    className={
                      allocationMode === "custom"
                        ? "flex-1 bg-lime-500 text-black font-bold hover:bg-lime-400"
                        : "flex-1 bg-white/10 border border-white/20 text-white hover:bg-white/20"
                    }
                  >
                    Custom
                  </Button>
                </div>

                <div className="mt-3 text-xs text-gray-400">
                  Allocated:{" "}
                  <span className={allocationPlan.isOver ? "text-red-400 font-bold" : "text-white font-semibold"}>
                    ${formatMoney(allocationPlan.totalAllocated)}
                  </span>{" "}
                  • Remaining:{" "}
                  <span className="text-lime-400 font-bold">${formatMoney(allocationPlan.unallocated)}</span>
                  {allocationPlan.isOver && <span className="ml-2 text-red-400 font-bold">Too much allocated</span>}
                </div>
              </div>

              {allocationMode === "custom" ? (
                <>
                  {/* Debts */}
                  <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 mb-4">
                    <h4 className="text-base font-bold mb-3">Debts</h4>

                    {(debts || []).filter((d) => (Number(d.balance) || 0) > 0).length === 0 ? (
                      <p className="text-sm text-gray-400">No debts added.</p>
                    ) : (
                      <div className="space-y-3">
                        {(debts || [])
                          .filter((d) => (Number(d.balance) || 0) > 0)
                          .map((d) => {
                            const bal = Number(d.balance || 0);
                            const val = Number(debtAllocations?.[d.id] || 0);

                            return (
                              <div key={d.id} className="bg-[#252538] border border-white/10 rounded-lg p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-white truncate">{d.name}</p>
                                    <p className="text-xs text-gray-400">
                                      Balance: ${formatMoney(bal)} • {Number(d.apr || 0).toFixed(2)}% APR
                                    </p>
                                  </div>

                                  <div className="w-32">
                                    <Label className="text-xs text-gray-400">Pay</Label>
                                    <Input
                                      type="number"
                                      inputMode="decimal"
                                      value={String(val)}
                                      onChange={(e) =>
                                        setDebtAllocations((prev) => ({
                                          ...prev,
                                          [d.id]: e.target.value === "" ? 0 : Number(e.target.value),
                                        }))
                                      }
                                      className="bg-[#1a1a2e] border-white/10 text-white"
                                    />
                                    <p className="text-[11px] text-gray-500 mt-1">Max: ${formatMoney(bal)}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Savings Goals */}
                  <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 mb-4">
                    <h4 className="text-base font-bold mb-3">Savings Goals</h4>

                    {(savingsGoals || []).length === 0 ? (
                      <p className="text-sm text-gray-400">No savings goals added.</p>
                    ) : (
                      <div className="space-y-3">
                        {(savingsGoals || []).map((g) => {
                          const current = Number(g.current_amount || 0);
                          const target = Number(g.target_amount || 0);
                          const need = Math.max(0, target - current);
                          const val = Number(goalAllocations?.[g.id] || 0);

                          return (
                            <div key={g.id} className="bg-[#252538] border border-white/10 rounded-lg p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold text-white truncate">{g.name}</p>
                                  <p className="text-xs text-gray-400">
                                    ${formatMoney(current)} / ${formatMoney(target)} • Need ${formatMoney(need)}
                                  </p>
                                </div>

                                <div className="w-32">
                                  <Label className="text-xs text-gray-400">Deposit</Label>
                                  <Input
                                    type="number"
                                    inputMode="decimal"
                                    value={String(val)}
                                    onChange={(e) =>
                                      setGoalAllocations((prev) => ({
                                        ...prev,
                                        [g.id]: e.target.value === "" ? 0 : Number(e.target.value),
                                      }))
                                    }
                                    className="bg-[#1a1a2e] border-white/10 text-white"
                                  />
                                  <p className="text-[11px] text-gray-500 mt-1">Max: ${formatMoney(need)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* ✅ Auto mode summary + itemized breakdown */}
                  <div className="bg-black/20 border border-white/10 rounded-xl p-4 mb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm text-gray-300">
                          Auto mode pays extra toward debts using your selected strategy, then funds goals by priority.
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Strategy:{" "}
                          <span className="text-gray-300 font-semibold">
                            {computed.debtStrategy === "snowball" ? "Snowball" : "Avalanche"}
                          </span>
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-gray-300 hover:text-white hover:bg-white/10"
                        onClick={() => setShowAutoBreakdown((v) => !v)}
                        title={showAutoBreakdown ? "Hide breakdown" : "Show breakdown"}
                      >
                        {showAutoBreakdown ? (
                          <span className="flex items-center gap-1">
                            Hide <ChevronUp size={16} />
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            Show <ChevronDown size={16} />
                          </span>
                        )}
                      </Button>
                    </div>

                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">To Debt</span>
                        <span className="text-white font-semibold">${formatMoney(allocationPlan.debtTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">To Goals</span>
                        <span className="text-white font-semibold">${formatMoney(allocationPlan.goalTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/10 pt-2">
                        <span className="text-gray-400">Unallocated</span>
                        <span className="text-lime-400 font-bold">${formatMoney(allocationPlan.unallocated)}</span>
                      </div>
                    </div>

                    {showAutoBreakdown && (
                      <div className="mt-4 grid gap-3">
                        {/* Debts breakdown */}
                        <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gray-300 mb-2">Auto Debt Payments</p>

                          {(allocationPlan.debts || []).length === 0 ? (
                            <p className="text-xs text-gray-500">No eligible debts to allocate right now.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {(allocationPlan.debts || []).map(({ debt, payment }) => (
                                <div key={debt.id} className="flex items-center justify-between text-sm">
                                  <div className="min-w-0 pr-2">
                                    <p className="text-gray-200 truncate">{debt.name}</p>
                                    <p className="text-[11px] text-gray-500">
                                      Bal ${formatMoney(debt.balance)} • {Number(debt.apr || 0).toFixed(2)}% APR
                                    </p>
                                  </div>
                                  <p className="text-white font-semibold">${formatMoney(payment)}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Goals breakdown */}
                        <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gray-300 mb-2">Auto Goal Funding</p>

                          {(allocationPlan.goals || []).length === 0 ? (
                            <p className="text-xs text-gray-500">No goals funded (or none need funding).</p>
                          ) : (
                            <div className="space-y-1.5">
                              {(allocationPlan.goals || []).map(({ goal, amount }) => (
                                <div key={goal.id} className="flex items-center justify-between text-sm">
                                  <div className="min-w-0 pr-2">
                                    <p className="text-gray-200 truncate">
                                      {goal.name}
                                      {goal.priority !== undefined && goal.priority !== null && (
                                        <span className="ml-2 text-[11px] text-lime-300/80">
                                          • Priority {goal.priority}
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[11px] text-gray-500">
                                      ${formatMoney(goal.current_amount)} / ${formatMoney(goal.target_amount)}
                                    </p>
                                  </div>
                                  <p className="text-lime-400 font-semibold">${formatMoney(amount)}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Savings Summary */}
              {computed.savingsAmount > 0 && (
                <div className="bg-gradient-to-br from-lime-900/20 to-lime-950/10 border border-lime-500/30 rounded-lg p-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-300">Savings Bucket Total</p>
                      <p className="text-lg font-bold text-white">${formatMoney(computed.savingsAmount)}</p>
                    </div>

                    {(allocationPlan.debtTotal || 0) > 0 && (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-300">To Debt Payments</p>
                        <p className="text-base font-semibold text-red-400">
                          -${formatMoney(allocationPlan.debtTotal)}
                        </p>
                      </div>
                    )}

                    {(allocationPlan.goalTotal || 0) > 0 && (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-300">To Savings Goals</p>
                        <p className="text-base font-semibold text-lime-400">
                          -${formatMoney(allocationPlan.goalTotal)}
                        </p>
                      </div>
                    )}

                    <div className="border-t border-white/10 pt-1.5 flex items-center justify-between">
                      <p className="text-xs text-gray-300">Unallocated</p>
                      <p className="text-lg font-bold text-lime-400">${formatMoney(allocationPlan.unallocated)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mark Complete Button */}
            <div className="mt-5">
              <Button
                type="button"
                onClick={handleMarkComplete}
                disabled={isCompleting || !computed.nextPayday || allocationPlan.isOver}
                className="w-full bg-lime-500 text-black font-bold hover:bg-lime-400 h-11 text-base disabled:opacity-50"
              >
                <CheckCircle size={16} className="mr-2" />
                {isCompleting ? "Processing..." : "Mark Payday Complete"}
              </Button>

              {allocationPlan.isOver && (
                <p className="text-xs text-red-400 mt-2">
                  ⚠️ Your allocations exceed the Savings bucket. Reduce amounts to continue.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
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
              <CreditCard className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-400">Debt</span>
            </Link>

            <Link to="/savings" className="flex flex-col items-center gap-1">
              <PiggyBank className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-400">Savings</span>
            </Link>

            <Link to="/payday" className="flex flex-col items-center gap-1">
              <Calendar className="w-6 h-6 text-lime-400" />
              <span className="text-xs text-lime-400 font-semibold">Payday</span>
            </Link>
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Payday History</h2>
              <Button type="button" variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
                <X size={20} />
              </Button>
            </div>

            {paydayHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Calendar className="text-gray-600 mb-4" size={48} />
                <p className="text-gray-400 text-center">No payday history yet</p>
                <p className="text-gray-500 text-sm text-center mt-2">
                  Complete your first payday to see history here
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {paydayHistory.map((record) => (
                  <div key={record.id} className="bg-[#252538] border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-white">
                          {(() => {
                            const p = toDateParts(record.payday_date);
                            const dt = p ? dateFromParts(p, false) : new Date();
                            return dt.toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            });
                          })()}
                        </h3>
                        <p className="text-sm text-gray-400">
                          Paycheck: ${formatMoneyNoCents(record.paycheck_amount)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="bg-pink-900/20 border border-pink-500/30 rounded-lg p-2">
                        <p className="text-xs text-pink-200 mb-1">Bills</p>
                        <p className="text-sm font-bold text-white">${formatMoney(record.bills_amount)}</p>
                      </div>
                      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-2">
                        <p className="text-xs text-purple-200 mb-1">Spending</p>
                        <p className="text-sm font-bold text-white">${formatMoney(record.spending_amount)}</p>
                      </div>
                      <div className="bg-lime-900/20 border border-lime-500/30 rounded-lg p-2">
                        <p className="text-xs text-lime-200 mb-1">Savings</p>
                        <p className="text-sm font-bold text-white">${formatMoney(record.savings_amount)}</p>
                      </div>
                    </div>

                    {record.bills_allocated?.length > 0 && (
                      <div className="border-t border-white/10 pt-3">
                        <p className="text-xs text-gray-400 mb-2 font-semibold">Bills Paid</p>
                        <div className="space-y-1">
                          {record.bills_allocated.map((bill, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-gray-300">{bill.bill_name}</span>
                              <span className="text-white font-semibold">${formatMoney(bill.amount_allocated)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {record.debts_allocated?.length > 0 && (
                      <div className="border-t border-white/10 pt-3 mt-3">
                        <p className="text-xs text-gray-400 mb-2 font-semibold">Debt Payments</p>
                        <div className="space-y-1">
                          {record.debts_allocated.map((debt, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-gray-300">{debt.debt_name}</span>
                              <span className="text-white font-semibold">${formatMoney(debt.amount_allocated)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {record.savings_goals_allocated?.length > 0 && (
                      <div className="border-t border-white/10 pt-3 mt-3">
                        <p className="text-xs text-gray-400 mb-2 font-semibold">Savings Goals</p>
                        <div className="space-y-1">
                          {record.savings_goals_allocated.map((goal, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-gray-300">{goal.goal_name}</span>
                              <span className="text-white font-semibold">${formatMoney(goal.amount_allocated)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(Number(record.bills_unallocated) || 0) > 0 && (
                      <div className="border-t border-white/10 pt-2 mt-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Bills Carried Forward</span>
                          <span className="text-lime-400 font-semibold">${formatMoney(record.bills_unallocated)}</span>
                        </div>
                      </div>
                    )}

                    {(Number(record.savings_unallocated) || 0) > 0 && (
                      <div className="border-t border-white/10 pt-2 mt-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Savings Unallocated</span>
                          <span className="text-lime-400 font-semibold">${formatMoney(record.savings_unallocated)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              onClick={() => setShowHistory(false)}
              className="w-full mt-6 bg-lime-500 text-black font-bold hover:bg-lime-400"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Edit Payday Modal */}
      {showEditPayday && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Change Payday</h2>
              <Button type="button" variant="ghost" size="icon" onClick={() => setShowEditPayday(false)}>
                <X size={20} />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Next Payday</label>
                <input
                  type="date"
                  value={editPaydayDate}
                  onChange={(e) => setEditPaydayDate(e.target.value)}
                  className="w-full bg-[#252538] border border-white/10 rounded-lg px-4 py-3 text-white [color-scheme:dark] min-w-0"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">Paycheck Amount (total)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editPaydayAmount}
                  onChange={(e) => setEditPaydayAmount(e.target.value)}
                  placeholder="2200"
                  className="w-full bg-[#252538] border border-white/10 rounded-lg px-4 py-3 text-white"
                />
              </div>

              <Button
                type="button"
                onClick={async () => {
                  if (!editPaydayDate || !editPaydayAmount) return;

                  try {
                    const total = parseFloat(editPaydayAmount);
                    const perIncome =
                      computed.incomesOnNextPayday.length > 1
                        ? total / computed.incomesOnNextPayday.length
                        : total;

                    for (const { income } of computed.incomesOnNextPayday) {
                      await localDB.entities.Income.update(income.id, {
                        next_payday: editPaydayDate,
                        paycheck_amount: perIncome,
                      });
                    }

                    queryClient.invalidateQueries({ queryKey: ["incomes"] });
                    setShowEditPayday(false);
                  } catch (error) {
                    console.error("Error updating payday:", error);
                    alert("Error updating payday. Please try again.");
                  }
                }}
                disabled={!editPaydayDate || !editPaydayAmount}
                className="w-full bg-lime-500 text-black font-bold hover:bg-lime-400 disabled:opacity-50"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bucket Info Modal */}
      {showBucketInfo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Where to Put Your Money</h2>
              <Button type="button" variant="ghost" size="icon" onClick={() => setShowBucketInfo(false)}>
                <X size={20} />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="bg-pink-900/20 border border-pink-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="text-pink-400" size={18} />
                  <h3 className="font-semibold text-pink-200">Bills Bucket</h3>
                </div>
                <p className="text-sm text-gray-300">
                  Transfer to your High-Yield Savings Account (HYSA). Let it earn interest until bills are due.
                </p>
              </div>

              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="text-purple-400" size={18} />
                  <h3 className="font-semibold text-purple-200">Spending Bucket</h3>
                </div>
                <p className="text-sm text-gray-300">
                  Keep in your checking account so you can swipe your debit card for daily expenses.
                </p>
              </div>

              <div className="bg-lime-900/20 border border-lime-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <PiggyBank className="text-lime-400" size={18} />
                  <h3 className="font-semibold text-lime-200">Savings Bucket</h3>
                </div>
                <p className="text-sm text-gray-300">
                  Transfer to your HYSA for debt payments and savings goals. Maximize interest earnings.
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setShowBucketInfo(false)}
              className="w-full mt-6 bg-lime-500 text-black font-bold hover:bg-lime-400"
            >
              Got it
            </Button>
          </div>
        </div>
      )}

      {/* Forms */}
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
    </div>
  );
}
