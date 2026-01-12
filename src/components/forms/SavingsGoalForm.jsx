import React, { useState } from 'react';
import { localDB } from '@/components/localDB';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Trash2 } from 'lucide-react';

export default function SavingsGoalForm({ goal, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: goal?.name || '',
    target_amount: goal?.target_amount || '',
    current_amount: goal?.current_amount || 0,
    target_date: goal?.target_date || '',
    priority: goal?.priority || 1
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        target_date: formData.target_date || null
      };
      
      if (goal) {
        await localDB.entities.SavingsGoal.update(goal.id, submitData);
      } else {
        await localDB.entities.SavingsGoal.create(submitData);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving savings goal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!goal || !confirm('Delete this savings goal?')) return;

    setLoading(true);
    try {
      await localDB.entities.SavingsGoal.delete(goal.id);
      onSuccess();
    } catch (error) {
      console.error('Error deleting savings goal:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{goal ? 'Edit' : 'Add'} Savings Goal</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Goal Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Emergency Fund"
              className="bg-white/10 border-white/20 text-white"
              required
            />
          </div>

          <div>
            <Label>Target Amount</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.target_amount}
              onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
              placeholder="5000"
              className="bg-white/10 border-white/20 text-white"
              required
            />
          </div>

          <div>
            <Label>Current Amount</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.current_amount}
              onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
              placeholder="0"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div>
            <Label>Target Date (Optional)</Label>
            <Input
              type="date"
              value={formData.target_date}
              onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
              className="bg-[#252538] border-white/10 text-white [color-scheme:dark] w-full min-w-0"
            />
          </div>

          <div className="flex gap-3 pt-4">
            {goal && (
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