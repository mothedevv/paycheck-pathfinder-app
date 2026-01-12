import React, { useState } from 'react';
import { localDB } from '@/components/localDB';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Plus, Trash2, AlertTriangle, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import IncomeForm from '@/components/forms/IncomeForm';

export default function Settings() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningData, setWarningData] = useState(null);

  const { data: budgets = [] } = useQuery({
    queryKey: ['userBudget'],
    queryFn: async () => {
      return localDB.entities.UserBudget.filter();
    },
    refetchOnWindowFocus: false
  });

  const { data: incomes = [] } = useQuery({
    queryKey: ['incomes'],
    queryFn: async () => {
      return localDB.entities.Income.filter();
    },
    refetchOnWindowFocus: false
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: async () => {
      return localDB.entities.Bill.filter();
    },
    refetchOnWindowFocus: false
  });

  const budget = budgets[0];

  React.useEffect(() => {
    if (budget) {
      setFormData({
        bills_percentage: budget.bills_percentage || 50,
        spending_percentage: budget.spending_percentage || 30,
        savings_percentage: budget.savings_percentage || 20
      });
    }
  }, [budget]);

  const [formData, setFormData] = useState({
    bills_percentage: budget?.bills_percentage || 50,
    spending_percentage: budget?.spending_percentage || 30,
    savings_percentage: budget?.savings_percentage || 20
  });

  const dismissKeyboard = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const closeSettings = () => {
    // If user navigated here from Dashboard, this returns them there.
    // If not, it still works fine.
    navigate(-1);
    // Or hard route: navigate(createPageUrl('Home'));
  };

  const handleSave = async () => {
    if (!budget) return;

    dismissKeyboard();
    setLoading(true);

    try {
      // Calculate total monthly income from all income sources
      let totalMonthlyIncome = 0;
      for (const income of incomes) {
        const amount = parseFloat(income.paycheck_amount);
        let monthlyAmount = 0;

        switch (income.pay_frequency) {
          case 'weekly':
            monthlyAmount = (amount * 52) / 12;
            break;
          case 'biweekly':
            monthlyAmount = (amount * 26) / 12;
            break;
          case 'semimonthly':
            monthlyAmount = amount * 2;
            break;
          case 'monthly':
            monthlyAmount = amount;
            break;
          default:
            monthlyAmount = amount;
        }
        totalMonthlyIncome += monthlyAmount;
      }

      // Calculate total monthly bills (only count unique bill names)
      const uniqueBills = bills.reduce((acc, bill) => {
        if (!acc[bill.name]) {
          acc[bill.name] = bill.amount || 0;
        }
        return acc;
      }, {});
      const totalMonthlyBills = Object.values(uniqueBills).reduce((sum, amount) => sum + amount, 0);

      // Calculate bills bucket amount with new percentage
      const billsBucketAmount = totalMonthlyIncome * (formData.bills_percentage / 100);

      // Warn if bills bucket is less than monthly bills
      if (billsBucketAmount < totalMonthlyBills) {
        const shortfall = totalMonthlyBills - billsBucketAmount;
        const recommended = Math.ceil((totalMonthlyBills / totalMonthlyIncome) * 100);

        setWarningData({
          billsPercentage: formData.bills_percentage,
          billsBucketAmount,
          totalMonthlyBills,
          shortfall,
          recommended,
          totalMonthlyIncome
        });
        setShowWarningModal(true);
        setLoading(false);
        return;
      }

      await localDB.entities.UserBudget.update(budget.id, {
        ...formData,
        monthly_income: totalMonthlyIncome
      });

      await queryClient.invalidateQueries({ queryKey: ['userBudget'] });

      // ✅ CLOSE SETTINGS AFTER SAVE
      closeSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="safe-screen min-h-screen bg-[#0d0d1a] text-white pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="text-3xl font-black">Settings</h1>
        </div>

        {/* Income Sources */}
        <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Income Sources</h2>
            <Button
              onClick={() => {
                setEditingIncome(null);
                setShowIncomeForm(true);
              }}
              className="bg-lime-500 text-black font-bold hover:bg-lime-400 h-9 text-sm"
            >
              <Plus size={16} className="mr-1" />
              Add Income
            </Button>
          </div>

          {incomes.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No income sources added yet</p>
          ) : (
            <div className="space-y-2">
              {incomes.map(income => (
                <div
                  key={income.id}
                  onClick={() => {
                    setEditingIncome(income);
                    setShowIncomeForm(true);
                  }}
                  className="bg-[#252538] border border-white/10 rounded-lg p-3 hover:bg-[#2d2f42] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white text-sm">{income.name}</h3>
                      <p className="text-xs text-gray-400 capitalize">
                        {income.pay_frequency.replace('_', '-')} • ${income.paycheck_amount.toLocaleString()}
                        {income.is_primary && <span className="ml-2 text-lime-400">• Primary</span>}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bucket Percentages */}
        <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 mb-4">
          <h2 className="text-lg font-bold mb-4">Bucket Percentages</h2>

          <div className="space-y-4">
            <div>
              <Label className="text-sm text-gray-400 mb-2 block">Bills (%)</Label>
              <Input
                type="number"
                value={formData.bills_percentage}
                onChange={(e) => setFormData({ ...formData, bills_percentage: parseFloat(e.target.value) })}
                className="bg-[#252538] border-white/10 text-white"
              />
            </div>

            <div>
              <Label className="text-sm text-gray-400 mb-2 block">Spending (%)</Label>
              <Input
                type="number"
                value={formData.spending_percentage}
                onChange={(e) => setFormData({ ...formData, spending_percentage: parseFloat(e.target.value) })}
                className="bg-[#252538] border-white/10 text-white"
              />
            </div>

            <div>
              <Label className="text-sm text-gray-400 mb-2 block">Savings (%)</Label>
              <Input
                type="number"
                value={formData.savings_percentage}
                onChange={(e) => setFormData({ ...formData, savings_percentage: parseFloat(e.target.value) })}
                className="bg-[#252538] border-white/10 text-white"
              />
            </div>

            <p className="text-xs text-gray-400">
              Total: {formData.bills_percentage + formData.spending_percentage + formData.savings_percentage}%
              {formData.bills_percentage + formData.spending_percentage + formData.savings_percentage !== 100 && (
                <span className="text-amber-400 ml-2">(should equal 100%)</span>
              )}
            </p>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-lime-500 text-black font-bold hover:bg-lime-400 h-12"
        >
          <Save size={20} className="mr-2" />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Income Form Modal */}
      {showIncomeForm && (
        <IncomeForm
          income={editingIncome}
          onClose={() => {
            setShowIncomeForm(false);
            setEditingIncome(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['incomes'] });
            queryClient.invalidateQueries({ queryKey: ['userBudget'] });
            setShowIncomeForm(false);
            setEditingIncome(null);
          }}
        />
      )}

      {/* Warning Modal */}
      {showWarningModal && warningData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-amber-500/50 rounded-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <AlertTriangle className="text-amber-400" size={24} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-amber-200 mb-1">Bills Budget Warning</h2>
                <p className="text-sm text-gray-300">Your bills bucket may not cover all your monthly bills</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowWarningModal(false)} className="text-gray-400">
                <X size={20} />
              </Button>
            </div>

            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Bills Bucket ({warningData.billsPercentage}%)</span>
                <span className="text-base font-semibold text-white">${warningData.billsBucketAmount.toFixed(2)}/mo</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Monthly Bills Total</span>
                <span className="text-base font-semibold text-white">${warningData.totalMonthlyBills.toFixed(2)}/mo</span>
              </div>
              <div className="border-t border-amber-500/30 pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-amber-200">Monthly Shortfall</span>
                  <span className="text-lg font-bold text-red-400">-${warningData.shortfall.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-lime-900/20 border border-lime-500/30 rounded-lg p-3 mb-4">
              <p className="text-xs text-lime-200 mb-1">💡 Recommendation</p>
              <p className="text-sm text-white">
                Set bills bucket to at least <strong>{warningData.recommended}%</strong> to cover all monthly bills
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowWarningModal(false)}
                className="flex-1 bg-white/10 border border-white/20 text-white hover:bg-white/20"
              >
                Cancel
              </Button>

              <Button
                onClick={async () => {
                  dismissKeyboard();
                  setShowWarningModal(false);
                  setLoading(true);
                  try {
                    await localDB.entities.UserBudget.update(budget.id, {
                      ...formData,
                      monthly_income: warningData.totalMonthlyIncome
                    });
                    await queryClient.invalidateQueries({ queryKey: ['userBudget'] });

                    // ✅ CLOSE SETTINGS AFTER "SAVE ANYWAY"
                    closeSettings();
                  } catch (error) {
                    console.error('Error saving settings:', error);
                    alert('Error saving settings.');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="flex-1 bg-amber-500 text-black font-bold hover:bg-amber-400"
              >
                Save Anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
