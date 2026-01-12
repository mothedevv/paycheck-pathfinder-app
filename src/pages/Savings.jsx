// src/pages/Savings.jsx (or wherever this Savings page lives)
// Copy/paste this whole file.

import React, { useState } from "react";
import { localDB } from "@/components/localDB";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Target, Receipt, CreditCard, PiggyBank, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SavingsGoalForm from "@/components/forms/SavingsGoalForm";

const quirkySayings = [
  "Debt is heavy. Let's get that weight off.",
  "Save now, flex later.",
  "Your future self will thank you.",
  "Small savings, big dreams.",
];

export default function Savings() {
  const queryClient = useQueryClient();

  const [saying] = useState(() => quirkySayings[Math.floor(Math.random() * quirkySayings.length)]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const { data: savingsGoals = [] } = useQuery({
    queryKey: ["savingsGoals"],
    queryFn: async () => localDB.entities.SavingsGoal.filter(),
    refetchOnWindowFocus: false,
  });

  return (
    <div className="safe-screen screen h-[100dvh] overflow-hidden bg-[#0d0d1a] text-white flex flex-col">
      {/* ✅ Controlled scrolling + safe areas */}
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

                {/* spacer to keep the back button from crowding */}
                <div className="w-9 sm:w-10" />
              </div>

              {/* Centered title + quote (keeps spacing consistent across pages) */}
              <div className="w-full text-center px-10">
                <h1 className="text-2xl sm:text-3xl font-black leading-tight">Savings Goals</h1>
                <p className="text-lime-400 italic text-xs sm:text-sm mt-1">"{saying}"</p>
              </div>

              {/* Full-width action (only when goals exist) */}
              {savingsGoals.length > 0 && (
                <div className="mt-4">
                  <Button
                    type="button"
                    onClick={() => {
                      setEditingGoal(null);
                      setShowGoalForm(true);
                    }}
                    className="w-full h-11 sm:h-12 bg-lime-500 text-black font-bold hover:bg-lime-400 text-sm sm:text-base"
                  >
                    <Plus size={18} className="mr-1" />
                    Add Savings Goal
                  </Button>
                </div>
              )}

            </div>

            {/* Empty State */}
            {savingsGoals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 mt-6">
                <div className="p-8 rounded-3xl bg-gradient-to-br from-lime-900/20 to-lime-950/10 mb-6">
                  <Target size={64} className="text-lime-500" strokeWidth={3} />
                </div>
                <h2 className="text-2xl font-black mb-4">No savings goals yet</h2>
                <p className="text-gray-400 text-center text-sm max-w-sm mb-8 leading-relaxed">
                  What are you saving for? Emergency fund? Vacation? New car? Set a goal and watch your progress.
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    setEditingGoal(null);
                    setShowGoalForm(true);
                  }}
                  className="bg-lime-500 text-black font-bold hover:bg-lime-400 px-8 h-12"
                >
                  <Plus size={20} className="mr-2" />
                  Create Your First Goal
                </Button>
              </div>
            ) : (
              /* Goals List */
              <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                {savingsGoals.map((goal) => {
                  const current = Number(goal.current_amount) || 0;
                  const target = Number(goal.target_amount) || 0;

                  const progress = target > 0 ? (current / target) * 100 : 0;
                  const clamped = Math.min(Math.max(progress, 0), 100);

                  return (
                    <div
                      key={goal.id}
                      onClick={() => {
                        setEditingGoal(goal);
                        setShowGoalForm(true);
                      }}
                      className="bg-[#1a1a2e] border border-white/10 rounded-xl p-3 sm:p-4 hover:bg-[#252538] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="font-semibold text-white text-sm sm:text-base truncate">{goal.name}</h3>
                          {goal.target_date && (
                            <p className="text-xs sm:text-sm text-gray-400">
                              Target:{" "}
                              {(() => {
                                const [y, m, d] = goal.target_date.split("-").map(Number);
                                const date = new Date(y, m - 1, d);
                                return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                              })()}
                            </p>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-lg sm:text-xl font-bold text-lime-400">${current.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">of ${target.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-lime-500 h-2 rounded-full transition-all"
                          style={{ width: `${clamped}%` }}
                        />
                      </div>

                      <p className="text-xs text-gray-400 mt-2">{Math.round(progress)}% complete</p>
                    </div>
                  );
                })}
              </div>
            )}
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
              <PiggyBank className="w-6 h-6 text-lime-400" />
              <span className="text-xs text-lime-400 font-semibold">Savings</span>
            </Link>

            <Link to="/payday" className="flex flex-col items-center gap-1">
              <Calendar className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-400">Payday</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Savings Goal Form Modal */}
      {showGoalForm && (
        <SavingsGoalForm
          goal={editingGoal}
          onClose={() => {
            setShowGoalForm(false);
            setEditingGoal(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["savingsGoals"] });
            setShowGoalForm(false);
            setEditingGoal(null);
          }}
        />
      )}
    </div>
  );
}
