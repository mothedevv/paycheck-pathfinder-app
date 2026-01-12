// src/pages/Bills.jsx (or wherever this Bills page lives)
// Copy/paste this whole file.

import React, { useMemo, useState } from "react";
import { localDB } from "@/components/localDB";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Check,
  X,
  Receipt,
  CreditCard,
  PiggyBank,
  Calendar,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BillForm from "@/components/forms/BillForm";

const quirkySayings = [
  "Broke is a mindset. Let's change yours.",
  "Stop being broke. It's embarrassing.",
  "Your bills don't pay themselves.",
  "Budget now, thank yourself later.",
];

function toYMD(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseYMD(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatShort(ymd) {
  const dt = parseYMD(ymd);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatLong(ymd) {
  const dt = parseYMD(ymd);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Safer month rolling (keeps "day" sensible if month shorter)
function addMonthsKeepDay(date, months, preferredDay) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const target = new Date(y, m + months, 1);
  const daysInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const day = Math.min(preferredDay, daysInTargetMonth);
  return new Date(target.getFullYear(), target.getMonth(), day);
}

export default function Bills() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [saying] = useState(() => quirkySayings[Math.floor(Math.random() * quirkySayings.length)]);

  const [showBillForm, setShowBillForm] = useState(false);
  const [editingBill, setEditingBill] = useState(null);

  const [viewingBill, setViewingBill] = useState(null);
  const [deletingBill, setDeletingBill] = useState(null);

  const { data: budgets = [] } = useQuery({
    queryKey: ["userBudget"],
    queryFn: async () => localDB.entities.UserBudget.filter(),
    refetchOnWindowFocus: false,
  });

  const budget = budgets[0];

  const { data: bills = [] } = useQuery({
    queryKey: ["bills"],
    queryFn: async () => {
      const allBills = await localDB.entities.Bill.filter();

      // Ensure bills exist for current month + 6 months ahead
      const today = new Date();
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 7);

      // Use earliest instance as template per name
      const templatesByName = {};
      for (const bill of allBills) {
        if (!bill?.name || !bill?.due_date) continue;
        const existing = templatesByName[bill.name];
        if (!existing) {
          templatesByName[bill.name] = bill;
          continue;
        }
        // keep earliest due_date as template
        if (String(bill.due_date).localeCompare(String(existing.due_date)) < 0) {
          templatesByName[bill.name] = bill;
        }
      }

      const billsToCreate = [];

      for (const billName of Object.keys(templatesByName)) {
        const template = templatesByName[billName];
        const templateDue = parseYMD(template.due_date);
        const templateDay = templateDue.getDate();

        const freq = template.frequency || "monthly";

        // How many instances we attempt to generate (but we still gate by endDate)
        let maxInstances = 12;
        if (freq === "weekly") maxInstances = 52;
        else if (freq === "biweekly") maxInstances = 26;
        else if (freq === "monthly") maxInstances = 12;
        else if (freq === "quarterly") maxInstances = 8;
        else if (freq === "biannually") maxInstances = 4;
        else if (freq === "annually") maxInstances = 2;
        else if (freq === "one_time") maxInstances = 1;

        for (let i = 0; i < maxInstances; i++) {
          let targetDate = new Date(templateDue);

          if (freq === "weekly") {
            targetDate.setDate(templateDue.getDate() + i * 7);
          } else if (freq === "biweekly") {
            targetDate.setDate(templateDue.getDate() + i * 14);
          } else if (freq === "monthly") {
            targetDate = addMonthsKeepDay(templateDue, i, templateDay);
          } else if (freq === "quarterly") {
            targetDate = addMonthsKeepDay(templateDue, i * 3, templateDay);
          } else if (freq === "biannually") {
            targetDate = addMonthsKeepDay(templateDue, i * 6, templateDay);
          } else if (freq === "annually") {
            targetDate = new Date(templateDue.getFullYear() + i, templateDue.getMonth(), templateDay);
          } else if (freq === "one_time") {
            // Just the one template instance
            targetDate = new Date(templateDue);
          } else {
            // default monthly
            targetDate = addMonthsKeepDay(templateDue, i, templateDay);
          }

          if (targetDate > endDate) continue;

          const targetDateStr = toYMD(targetDate);

          const exists = allBills.some((b) => b.name === billName && String(b.due_date) === targetDateStr);
          if (exists) continue;

          // late_by_date: if template has one, use its day-of-month for each instance
          let lateByDate = null;
          if (template.late_by_date) {
            const lateTemplate = parseYMD(template.late_by_date);
            const lateDay = lateTemplate.getDate();
            const lateDt = addMonthsKeepDay(targetDate, 0, lateDay);
            lateByDate = toYMD(lateDt);
          }

          billsToCreate.push({
            name: template.name,
            amount: template.amount,
            is_variable: template.is_variable,
            due_date: targetDateStr,
            late_by_date: lateByDate,
            category: template.category,
            subcategory: template.subcategory,
            is_autopay: template.is_autopay,
            frequency: template.frequency,
            notes: template.notes,
          });

          // one_time should not generate more
          if (freq === "one_time") break;
        }
      }

      if (billsToCreate.length > 0) {
        await localDB.entities.Bill.bulkCreate(billsToCreate);
        return localDB.entities.Bill.filter();
      }

      return allBills;
    },
    refetchOnWindowFocus: false,
  });

  // Totals (unique by name)
  const { totalBills, uniqueBillCount, billsAllocation } = useMemo(() => {
    const unique = bills.reduce((acc, bill) => {
      if (!bill?.name) return acc;
      if (!acc[bill.name]) acc[bill.name] = parseFloat(bill.amount) || 0;
      return acc;
    }, {});
    const total = Object.values(unique).reduce((sum, amt) => sum + (amt || 0), 0);
    const count = Object.keys(unique).length;
    const allocation = budget
      ? Number(budget.monthly_income || 0) * (Number(budget.bills_percentage || 50) / 100)
      : 0;
    return { totalBills: total, uniqueBillCount: count, billsAllocation: allocation };
  }, [bills, budget]);

  // Filter window: current + 7 months ahead
  const sevenMonthsAhead = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 7);
    return d;
  }, []);

  const filteredBills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return bills.filter((bill) => {
      const name = String(bill?.name || "");
      const matchesSearch = q === "" || name.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "all" || bill?.category === categoryFilter;

      if (!bill?.due_date) return false;
      const billDate = parseYMD(bill.due_date);
      const withinWindow = billDate <= sevenMonthsAhead;

      return matchesSearch && matchesCategory && withinWindow;
    });
  }, [bills, searchQuery, categoryFilter, sevenMonthsAhead]);

  // Group by month
  const { billsByMonth, sortedMonths } = useMemo(() => {
    const byMonth = filteredBills.reduce((acc, bill) => {
      const [y, m] = String(bill.due_date).split("-").map(Number);
      const key = `${y}-${String(m).padStart(2, "0")}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(bill);
      return acc;
    }, {});

    for (const k of Object.keys(byMonth)) {
      byMonth[k].sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
    }

    return { billsByMonth: byMonth, sortedMonths: Object.keys(byMonth).sort() };
  }, [filteredBills]);

  return (
    <div className="safe-screen screen h-[100dvh] overflow-hidden bg-[#0d0d1a] text-white flex flex-col">
      {/* ✅ Controlled scrolling + safe areas (matches the updated Dashboard) */}
      <main className="app-scroll flex-1 min-h-0">
        <div>
          <div className="max-w-lg mx-auto px-4 py-4 sm:py-6">
            {/* Header */}
            <div className="relative mb-4 sm:mb-6">
              <div className="flex items-center justify-between">
                <Link to={createPageUrl("Home")}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/10 h-9 w-9 sm:h-10 sm:w-10"
                    type="button"
                  >
                    <ArrowLeft size={20} />
                  </Button>
                </Link>

                <div className="w-9 sm:w-10" />
              </div>

              <div className="w-full text-center px-10">
                <h1 className="text-2xl sm:text-3xl font-black leading-tight">Your Bills</h1>
                <p className="text-lime-400 italic text-xs sm:text-sm mt-1">"{saying}"</p>
              </div>

              <div className="mt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setEditingBill(null);
                    setShowBillForm(true);
                  }}
                  className="w-full h-11 sm:h-12 bg-lime-500 text-black font-bold hover:bg-lime-400 text-sm sm:text-base"
                >
                  <Plus size={18} className="mr-1" />
                  Add Bill
                </Button>
              </div>
            </div>

            {/* Total Bills Card */}
            <div className="bg-gradient-to-br from-blue-900/40 to-blue-950/20 border border-blue-800/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 mt-4 sm:mt-6">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div>
                  <p className="text-xs sm:text-sm text-blue-200/60 uppercase tracking-wider mb-2">
                    Total Monthly Bills
                  </p>
                  <p className="text-3xl sm:text-5xl font-black mb-1">${totalBills.toFixed(2)}</p>
                  <p className="text-xs sm:text-sm text-blue-200/60">{uniqueBillCount} bills tracked</p>
                </div>
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-blue-800/40">
                  <Receipt size={24} className="text-blue-300 sm:w-8 sm:h-8" />
                </div>
              </div>

              <div className="border-t border-blue-800/30 pt-3 sm:pt-4 mt-3 sm:mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-blue-200/80">
                    Bills Allocation ({budget?.bills_percentage || 50}%)
                  </span>
                  <span className="text-base sm:text-lg font-bold">${billsAllocation.toFixed(2)}/mo</span>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative mt-4 sm:mt-6">
              <Search
                className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bills..."
                className="pl-10 sm:pl-11 bg-[#1a1a2e] border-white/10 text-white placeholder:text-gray-500 h-11 sm:h-12 text-sm sm:text-base"
              />
            </div>

            {/* Category Filter */}
            <div className="mt-3 sm:mt-4">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="bg-[#1a1a2e] border-white/10 text-white h-11 sm:h-12 text-sm sm:text-base">
                  <div className="flex items-center gap-2">
                    <Filter size={16} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="housing">Housing</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="transportation">Transportation</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="subscriptions">Subscriptions</SelectItem>
                  <SelectItem value="debt_payments">Debt Payments</SelectItem>
                  <SelectItem value="child_family">Child/Family</SelectItem>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="taxes">Taxes</SelectItem>
                  <SelectItem value="furniture_rental">Furniture/Rental</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bills List */}
            {filteredBills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 mt-8">
                <div className="p-6 rounded-2xl bg-white/5 mb-6">
                  <Receipt size={48} className="text-gray-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">No bills yet</h3>
                <p className="text-gray-400 text-center text-sm max-w-xs">
                  Add your first bill to start tracking where your money goes.
                </p>
              </div>
            ) : (
              <div className="mt-4 sm:mt-6 space-y-6">
                {sortedMonths.map((monthKey) => {
                  const [year, month] = monthKey.split("-").map(Number);
                  const monthDate = new Date(year, month - 1, 1);
                  const monthName = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

                  return (
                    <div key={monthKey}>
                      <h2 className="text-lg sm:text-xl font-bold mb-3 text-lime-400">{monthName}</h2>

                      <div className="space-y-2 sm:space-y-3">
                        {billsByMonth[monthKey].map((bill) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);

                          const dueDate = parseYMD(bill.due_date);
                          const lateByDate = bill.late_by_date ? parseYMD(bill.late_by_date) : dueDate;

                          const isLate = !bill.last_paid_date && today > lateByDate;

                          return (
                            <div
                              key={bill.id}
                              onClick={() => setViewingBill(bill)}
                              className={
                                isLate
                                  ? "bg-red-900/30 border border-red-500/50 rounded-xl p-3 sm:p-4 hover:bg-red-900/40 transition-colors cursor-pointer"
                                  : "bg-[#1a1a2e] border border-white/10 rounded-xl p-3 sm:p-4 hover:bg-[#252538] transition-colors cursor-pointer"
                              }
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0 pr-2">
                                  <h3 className="font-semibold text-white text-sm sm:text-base truncate">
                                    {bill.name}
                                  </h3>
                                  <p className="text-xs sm:text-sm text-gray-400 capitalize truncate">
                                    {bill.category?.replace("_", " ")} • Due {formatShort(bill.due_date)}
                                    {bill.late_by_date ? ` • Late by ${formatShort(bill.late_by_date)}` : ""}
                                  </p>
                                </div>

                                <div className="text-right flex-shrink-0 flex items-center gap-2">
                                  <div>
                                    <p className="text-base sm:text-lg font-bold">
                                      ${(parseFloat(bill.amount) || 0).toFixed(2)}
                                    </p>
                                    {bill.is_autopay && <p className="text-xs text-lime-400">Auto-pay</p>}
                                    {bill.last_paid_date && <p className="text-xs text-green-400">✓ Paid</p>}
                                  </div>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <MoreVertical size={16} />
                                      </Button>
                                    </DropdownMenuTrigger>

                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setViewingBill(null);
                                          setEditingBill(bill);
                                          setShowBillForm(true);
                                        }}
                                      >
                                        <Edit size={14} className="mr-2" />
                                        Edit
                                      </DropdownMenuItem>

                                      {!bill.last_paid_date ? (
                                        <DropdownMenuItem
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                              await localDB.entities.Bill.update(bill.id, { last_paid_date: toYMD(new Date()) });
                                              queryClient.invalidateQueries({ queryKey: ["bills"] });
                                            } catch (error) {
                                              console.error("Error marking bill as paid:", error);
                                            }
                                          }}
                                        >
                                          <Check size={14} className="mr-2" />
                                          Mark as Paid
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                              await localDB.entities.Bill.update(bill.id, { last_paid_date: null });
                                              queryClient.invalidateQueries({ queryKey: ["bills"] });
                                            } catch (error) {
                                              console.error("Error unmarking bill:", error);
                                            }
                                          }}
                                        >
                                          <X size={14} className="mr-2" />
                                          Unmark as Paid
                                        </DropdownMenuItem>
                                      )}

                                      <DropdownMenuItem
                                        className="text-red-400"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingBill(bill);
                                        }}
                                      >
                                        <svg width="14" height="14" className="mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                          />
                                        </svg>
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
              <Receipt className="w-6 h-6 text-lime-400" />
              <span className="text-xs text-lime-400 font-semibold">Bills</span>
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

      {/* Bill Detail Modal */}
      {viewingBill && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          onClick={() => setViewingBill(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80" />

          {/* Centered modal */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div
              className="w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-2xl bg-[#1a1a2e] text-white border border-white/10 shadow-xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{viewingBill.name}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => setViewingBill(null)}
                  className="text-white hover:bg-white/10"
                >
                  <X size={20} />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Amount</p>
                  <p className="text-2xl font-bold text-white">
                    ${(parseFloat(viewingBill.amount) || 0).toFixed(2)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Due Date</p>
                    <p className="text-sm font-semibold text-white">{formatLong(viewingBill.due_date)}</p>
                  </div>

                  {viewingBill.late_by_date && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Late By Date</p>
                      <p className="text-sm font-semibold text-orange-400">{formatLong(viewingBill.late_by_date)}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-1">Category</p>
                  <p className="text-sm font-semibold text-white capitalize">
                    {viewingBill.category?.replace("_", " ")}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-1">Frequency</p>
                  <p className="text-sm font-semibold text-white capitalize">
                    {String(viewingBill.frequency || "").replace("_", "-")}
                  </p>
                </div>

                {viewingBill.is_autopay && (
                  <div className="bg-lime-500/10 border border-lime-500/30 rounded-lg p-3">
                    <p className="text-sm text-lime-400 font-semibold">✓ Auto-pay enabled</p>
                  </div>
                )}

                {viewingBill.last_paid_date && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Paid On</p>
                    <p className="text-sm text-green-400 font-semibold">
                      {formatLong(viewingBill.last_paid_date)}
                    </p>
                  </div>
                )}

                {viewingBill.notes && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Notes</p>
                    <p className="text-sm text-gray-300">{viewingBill.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  onClick={() => {
                    setViewingBill(null);
                    setEditingBill(viewingBill);
                    setShowBillForm(true);
                  }}
                  className="flex-1 bg-white/10 border border-white/20 text-white hover:bg-white/20"
                >
                  <Edit size={16} className="mr-2" />
                  Edit
                </Button>

                <Button
                  type="button"
                  onClick={() => setViewingBill(null)}
                  className="flex-1 bg-lime-500 text-black font-bold hover:bg-lime-400"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bill Form Modal */}
      {showBillForm && (
        <BillForm
          bill={editingBill}
          onClose={() => {
            setShowBillForm(false);
            setEditingBill(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["bills"] });
            setShowBillForm(false);
            setEditingBill(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingBill && (
        <>
          <div className="modal-backdrop" onClick={() => setDeletingBill(null)} />
          <div className="modal-container p-4">
            <div className="modal-card bg-[#1a1a2e] border border-white/10 text-white w-full max-w-sm p-6">
              <h2 className="text-xl font-bold mb-3">Delete Bill?</h2>
              <p className="text-gray-400 text-sm mb-6">
                Are you sure you want to delete "{deletingBill.name}"? This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setDeletingBill(null)}
                  className="flex-1 bg-white/10 border border-white/20 text-white hover:bg-white/20"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      const allBills = await localDB.entities.Bill.filter();
                      const allBillsWithSameName = allBills.filter((b) => b.name === deletingBill.name);

                      await Promise.all(allBillsWithSameName.map((b) => localDB.entities.Bill.delete(b.id)));

                      queryClient.invalidateQueries({ queryKey: ["bills"] });
                      setDeletingBill(null);
                    } catch (error) {
                      console.error("Error deleting bill:", error);
                    }
                  }}
                  className="flex-1 bg-red-500 text-white font-bold hover:bg-red-600"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
