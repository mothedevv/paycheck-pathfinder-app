import React, { useEffect, useMemo, useRef, useState } from "react";
import { localDB } from "@/components/localDB";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, Plus, Trash2 } from "lucide-react";

/**
 * One-page onboarding:
 * - Collect incomes (name, paycheck amount, next payday, frequency)
 * - Collect Monthly Bills + Monthly Spending
 * - Compute bucket % so:
 *    Bills bucket covers 100% of bills
 *    Spending bucket covers 100% of spending
 *    Remaining % goes to Savings/Debt bucket
 * - Create UserBudget + Income records
 * - onComplete() -> parent should route to Dashboard
 */
export default function OnboardingFlow({ onComplete }) {
  const [incomes, setIncomes] = useState([
    {
      name: "",
      paycheck_amount: "",
      next_payday: "",
      pay_frequency: "biweekly",
      is_primary: true,
    },
  ]);

  const [monthlyBills, setMonthlyBills] = useState("");
  const [monthlySpending, setMonthlySpending] = useState("");

  const [loading, setLoading] = useState(false);

  // Scroll management for iOS keyboard + tap to dismiss
  const scrollRef = useRef(null);
  const savedScrollTop = useRef(0);
  const focusDepth = useRef(0);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const isField = (el) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };

    const onFocusIn = (e) => {
      const el = e.target;
      if (!isField(el)) return;

      if (focusDepth.current === 0) savedScrollTop.current = scroller.scrollTop;
      focusDepth.current += 1;

      requestAnimationFrame(() => {
        try {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        } catch {}
      });
    };

    const onFocusOut = (e) => {
      const el = e.target;
      if (!isField(el)) return;

      focusDepth.current = Math.max(0, focusDepth.current - 1);

      if (focusDepth.current === 0) {
        requestAnimationFrame(() => {
          try {
            scroller.scrollTo({ top: savedScrollTop.current, behavior: "smooth" });
          } catch {}
        });
      }
    };

    // Tap empty space to dismiss keyboard
    const onPointerDown = (e) => {
      const target = e.target;
      const active = document.activeElement;

      if (target instanceof HTMLElement) {
        const tappedField = target.closest("input, textarea, select");
        if (tappedField) return;
      }

      if (active instanceof HTMLElement) {
        const activeIsField = active.matches("input, textarea, select");
        if (activeIsField) active.blur();
      }
    };

    scroller.addEventListener("focusin", onFocusIn);
    scroller.addEventListener("focusout", onFocusOut);
    scroller.addEventListener("pointerdown", onPointerDown);

    return () => {
      scroller.removeEventListener("focusin", onFocusIn);
      scroller.removeEventListener("focusout", onFocusOut);
      scroller.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  const addIncome = () => {
    setIncomes((prev) => [
      ...prev,
      {
        name: "",
        paycheck_amount: "",
        next_payday: "",
        pay_frequency: "biweekly",
        is_primary: false,
      },
    ]);
  };

  const removeIncome = (index) => {
    setIncomes((prev) => {
      if (prev.length === 1) return prev;
      const next = prev.filter((_, i) => i !== index);

      // Ensure at least one primary
      if (!next.some((i) => i.is_primary)) next[0].is_primary = true;
      return [...next];
    });
  };

  const updateIncome = (index, field, value) => {
    setIncomes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };

      // Keep primary unique
      if (field === "is_primary" && value === true) {
        return next.map((inc, i) => ({ ...inc, is_primary: i === index }));
      }

      return next;
    });
  };

  const hasValidIncome = useMemo(() => {
    return incomes.some(
      (inc) =>
        inc.name?.trim() &&
        inc.paycheck_amount !== "" &&
        parseFloat(inc.paycheck_amount) > 0
    );
  }, [incomes]);

  const calcMonthlyFromPay = (amount, frequency) => {
    const a = parseFloat(amount);
    if (!Number.isFinite(a)) return 0;

    switch (frequency) {
      case "weekly":
        return (a * 52) / 12;
      case "biweekly":
        return (a * 26) / 12;
      case "semimonthly":
        return a * 2;
      case "monthly":
        return a;
      case "irregular":
      default:
        // Safety: don't assume irregular contributes monthly
        return 0;
    }
  };

  const totalMonthlyIncome = useMemo(() => {
    return incomes.reduce((sum, inc) => {
      if (!inc.name?.trim() || inc.paycheck_amount === "") return sum;
      return sum + calcMonthlyFromPay(inc.paycheck_amount, inc.pay_frequency);
    }, 0);
  }, [incomes]);

  const incomeVsOutflow = useMemo(() => {
    const income = totalMonthlyIncome;
    const bills = Math.max(0, parseFloat(monthlyBills) || 0);
    const spending = Math.max(0, parseFloat(monthlySpending) || 0);
    const outflow = bills + spending;

    return {
      income,
      bills,
      spending,
      outflow,
      isOver: income > 0 && outflow > income,
      remaining: income - outflow,
    };
  }, [totalMonthlyIncome, monthlyBills, monthlySpending]);

  /**
   * Bucket %:
   * - Bills % covers bills (ceil)
   * - Spending % covers spending (ceil)
   * - Savings % is the remainder (savings/debt bucket)
   */
  const suggestedPercents = useMemo(() => {
    const income = totalMonthlyIncome;

    if (!income || income <= 0) return { bills: 50, spending: 30, savings: 20 };

    const bills = Math.max(0, parseFloat(monthlyBills) || 0);
    const spending = Math.max(0, parseFloat(monthlySpending) || 0);

    const billsPct = Math.ceil((bills / income) * 100);
    const spendingPct = Math.ceil((spending / income) * 100);

    let savingsPct = 100 - billsPct - spendingPct;
    if (savingsPct < 0) savingsPct = 0;

    const sum = billsPct + spendingPct + savingsPct;
    if (sum !== 100) savingsPct = Math.max(0, savingsPct + (100 - sum));

    return { bills: billsPct, spending: spendingPct, savings: savingsPct };
  }, [totalMonthlyIncome, monthlyBills, monthlySpending]);

  const handleComplete = async () => {
    if (!hasValidIncome) return;
    if (incomeVsOutflow.isOver) return;

    // dismiss keyboard
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setLoading(true);
    try {
      // If your app assumes only one budget, clear existing budget
      const existingBudgets = await localDB.entities.UserBudget.filter();
      if (existingBudgets?.length) {
        for (const b of existingBudgets) {
          await localDB.entities.UserBudget.delete(b.id);
        }
      }

      // Create budget
      const createdBudget = await localDB.entities.UserBudget.create({
        monthly_income: totalMonthlyIncome,
        bills_percentage: suggestedPercents.bills,
        spending_percentage: suggestedPercents.spending,
        savings_percentage: suggestedPercents.savings,

        // required by Payday math
        bills_bucket_balance: 0,
        spending_bucket_balance: 0,
        savings_bucket_balance: 0,

        // optional helpers (remove if your DB rejects unknown fields)
        // monthly_bills_estimate: Math.max(0, parseFloat(monthlyBills) || 0),
        // monthly_spending_estimate: Math.max(0, parseFloat(monthlySpending) || 0),
      });

      // Clear existing incomes (optional)
      const existingIncomes = await localDB.entities.Income.filter();
      if (existingIncomes?.length) {
        for (const inc of existingIncomes) {
          await localDB.entities.Income.delete(inc.id);
        }
      }

      // Create income records
      for (let idx = 0; idx < incomes.length; idx++) {
        const income = incomes[idx];
        if (!income.name?.trim() || income.paycheck_amount === "") continue;

        await localDB.entities.Income.create({
          name: income.name.trim(),
          paycheck_amount: parseFloat(income.paycheck_amount),
          pay_frequency: income.pay_frequency,
          next_payday: income.next_payday || null,
          is_primary: income.is_primary || idx === 0,
        });
      }

      onComplete?.(createdBudget);
    } catch (error) {
      console.error("Error creating onboarding data:", error);
      alert("There was an error setting up your budget. Please try again.");
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  return (
    <div className="screen h-[100dvh] overflow-hidden bg-[#0d0d1a] text-white flex flex-col">
      <main
        ref={scrollRef}
        id="onboarding-scroll"
        className="app-scroll flex-1 min-h-0 px-4 pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+16px)]"
      >
        <div className="max-w-lg mx-auto flex flex-col gap-6 py-4">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-lime-700 to-lime-900 flex items-center justify-center">
                <Calculator size={40} className="text-lime-400" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black mb-3">
              Let&apos;s figure this sh*t out
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
              Add income, monthly bills, and monthly spending. We&apos;ll build your buckets and drop you into the dashboard.
            </p>
          </div>

          {/* Income Sources */}
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">Income Sources</h2>
                <p className="text-sm text-gray-400">
                  Add each paycheck. Next payday is used to determine household payday order.
                </p>
              </div>
              <Button
                type="button"
                onClick={addIncome}
                className="bg-lime-500/20 text-lime-400 hover:bg-lime-500/30 border border-lime-500/30 h-9 text-sm"
              >
                <Plus size={16} className="mr-1" />
                Add Income
              </Button>
            </div>

            <div className="space-y-4">
              {incomes.map((income, index) => (
                <div
                  key={index}
                  className="bg-[#252538] border border-white/10 rounded-xl p-4 relative"
                >
                  {incomes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIncome(index)}
                      className="absolute top-3 right-3 text-red-400 hover:text-red-300"
                      aria-label="Remove income"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}

                  <div className="mb-3">
                    <div className="flex items-center gap-2 text-lime-400 text-sm mb-2">
                      <span>$</span>
                      <span>Income {index + 1}</span>
                    </div>
                    <Input
                      value={income.name}
                      onChange={(e) => updateIncome(index, "name", e.target.value)}
                      placeholder="e.g., Company, Side Hustle etc."
                      className="bg-[#1a1a2e] border-white/10 text-white text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">
                        Paycheck Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          $
                        </span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={income.paycheck_amount}
                          onChange={(e) =>
                            updateIncome(index, "paycheck_amount", e.target.value)
                          }
                          placeholder="0.00"
                          className="pl-7 bg-[#1a1a2e] border-white/10 text-white text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (document.activeElement instanceof HTMLElement) {
                                document.activeElement.blur();
                              }
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">
                        Next Payday
                      </label>
                      <Input
                        type="date"
                        value={income.next_payday}
                        onChange={(e) =>
                          updateIncome(index, "next_payday", e.target.value)
                        }
                        className="bg-[#1a1a2e] border-white/10 text-white text-sm w-full min-w-0"
                      />
                    </div>
                  </div>

                  <Select
                    value={income.pay_frequency}
                    onValueChange={(value) =>
                      updateIncome(index, "pay_frequency", value)
                    }
                  >
                    <SelectTrigger className="bg-[#1a1a2e] border-white/10 text-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="semimonthly">Semi-monthly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="irregular">Irregular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Monthly income preview */}
            <div className="mt-5 bg-black/20 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
                Estimated Monthly Income
              </p>
              <p className="text-2xl font-black text-lime-400">
                ${Math.round(totalMonthlyIncome).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Irregular incomes are ignored in this estimate (for safety).
              </p>
            </div>
          </div>

          {/* Monthly totals */}
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-4 sm:p-6">
            <h2 className="text-lg font-bold mb-1">Monthly Totals</h2>
            <p className="text-sm text-gray-400 mb-4">
              Bills bucket will cover 100% of bills, spending bucket will cover 100% of spending, and the rest goes to savings/debt.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Monthly Bills (total)
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={monthlyBills}
                  onChange={(e) => setMonthlyBills(e.target.value)}
                  placeholder="e.g., 2400"
                  className="bg-[#252538] border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Monthly Spending (groceries, gas, fun, etc.)
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={monthlySpending}
                  onChange={(e) => setMonthlySpending(e.target.value)}
                  placeholder="e.g., 900"
                  className="bg-[#252538] border-white/10 text-white"
                />
              </div>
            </div>

            {incomeVsOutflow.isOver && (
              <div className="mt-4 bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-300 font-semibold text-sm">
                  Bills + spending is higher than your monthly income.
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  Income: ${Math.round(incomeVsOutflow.income).toLocaleString()} •
                  Outflow: ${Math.round(incomeVsOutflow.outflow).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Reduce bills/spending or add income to continue.
                </p>
              </div>
            )}

            {/* Suggested buckets preview */}
            <div className="mt-5 bg-black/20 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">
                Bucket Percentages
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-pink-300">Bills</span>
                <span className="text-white font-semibold">
                  {suggestedPercents.bills}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-purple-300">Spending</span>
                <span className="text-white font-semibold">
                  {suggestedPercents.spending}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-lime-300">Savings / Debt</span>
                <span className="text-white font-semibold">
                  {suggestedPercents.savings}%
                </span>
              </div>

              {!incomeVsOutflow.isOver && totalMonthlyIncome > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Leftover after bills + spending: $
                  {Math.max(0, Math.round(incomeVsOutflow.remaining)).toLocaleString()}
                  /mo
                </p>
              )}
            </div>
          </div>

          {/* Complete */}
          <Button
            type="button"
            onClick={handleComplete}
            disabled={!hasValidIncome || loading || incomeVsOutflow.isOver}
            className="w-full bg-lime-500 hover:bg-lime-400 text-black font-black h-12 text-base disabled:opacity-50"
          >
            {loading ? "Setting things up..." : "Finish Setup → Go to Dashboard"}
          </Button>

          <p className="text-xs text-gray-500 text-center pb-8">
            Tip: Tap anywhere outside a field to dismiss the keyboard.
          </p>
        </div>
      </main>
    </div>
  );
}
