import React, { useState } from 'react';
import { localDB } from '@/components/localDB';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Trash2 } from 'lucide-react';

export default function OneTimeDepositForm({ deposit, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: deposit?.name || '',
    amount: deposit?.amount || '',
    expected_date: deposit?.expected_date || '',
    notes: deposit?.notes || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (deposit) {
        await localDB.entities.OneTimeDeposit.update(deposit.id, formData);
      } else {
        await localDB.entities.OneTimeDeposit.create(formData);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving deposit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReceived = async () => {
    if (!deposit) return;
    
    setLoading(true);
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      // Mark deposit as received
      await localDB.entities.OneTimeDeposit.update(deposit.id, {
        received: true,
        received_date: todayStr
      });

      // Split deposit into buckets
      const budgets = await localDB.entities.UserBudget.filter();
      const budget = budgets[0];

      if (budget) {
        const amount = parseFloat(formData.amount);
        const billsAdd = amount * (budget.bills_percentage / 100);
        const spendingAdd = amount * (budget.spending_percentage / 100);
        const savingsAdd = amount * (budget.savings_percentage / 100);

        await localDB.entities.UserBudget.update(budget.id, {
          bills_bucket_balance: (budget.bills_bucket_balance || 0) + billsAdd,
          spending_bucket_balance: (budget.spending_bucket_balance || 0) + spendingAdd,
          savings_bucket_balance: (budget.savings_bucket_balance || 0) + savingsAdd
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error marking deposit as received:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deposit || !confirm('Delete this deposit?')) return;

    setLoading(true);
    try {
      await localDB.entities.OneTimeDeposit.delete(deposit.id);
      onSuccess();
    } catch (error) {
      console.error('Error deleting deposit:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{deposit ? 'Edit' : 'Add'} One-Time Deposit</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Deposit Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Tax Return, Bonus"
              className="bg-white/10 border-white/20 text-white"
              required
            />
          </div>

          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="1000"
              className="bg-white/10 border-white/20 text-white"
              required
            />
          </div>

          <div>
            <Label>Expected Date</Label>
            <Input
              type="date"
              value={formData.expected_date}
              onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
              className="bg-[#252538] border-white/10 text-white [color-scheme:dark] w-full min-w-0"
              required
            />
          </div>

          <div>
            <Label>Notes (Optional)</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional details..."
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div className="flex gap-3 pt-4">
            {deposit && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1"
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </Button>
            )}
            {deposit && !deposit.received && (
              <Button
                type="button"
                onClick={handleMarkReceived}
                disabled={loading}
                className="flex-1 bg-green-500 text-white font-bold hover:bg-green-400"
              >
                Mark Received
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-lime-500 text-black font-bold hover:bg-lime-400"
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}