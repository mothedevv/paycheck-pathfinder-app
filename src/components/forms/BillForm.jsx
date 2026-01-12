import React, { useState } from 'react';
import { localDB } from '@/components/localDB';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Trash2 } from 'lucide-react';

export default function BillForm({ bill, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: bill?.name || '',
    amount: bill?.amount || '',
    is_variable: bill?.is_variable || false,
    due_date: bill?.due_date || '',
    late_by_date: bill?.late_by_date || '',
    category: bill?.category || 'utilities',
    subcategory: bill?.subcategory || '',
    is_autopay: bill?.is_autopay || false,
    frequency: bill?.frequency || 'monthly',
    notes: bill?.notes || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (bill) {
        // Update only this specific bill instance
        await localDB.entities.Bill.update(bill.id, {
          name: formData.name,
          amount: parseFloat(formData.amount),
          is_variable: formData.is_variable,
          due_date: formData.due_date,
          late_by_date: formData.late_by_date || null,
          category: formData.category,
          subcategory: formData.subcategory,
          is_autopay: formData.is_autopay,
          frequency: formData.frequency,
          notes: formData.notes
        });
      } else {
        // Create bills based on frequency
        const billsToCreate = [];
        const [year, month, day] = formData.due_date.split('-').map(Number);

        // Determine how many instances to create based on frequency
        let instanceCount = 1;
        if (formData.frequency === 'weekly') instanceCount = 52;
        else if (formData.frequency === 'biweekly') instanceCount = 26;
        else if (formData.frequency === 'monthly') instanceCount = 7;
        else if (formData.frequency === 'quarterly') instanceCount = 4;
        else if (formData.frequency === 'biannually') instanceCount = 2;
        else if (formData.frequency === 'annually') instanceCount = 1;
        else if (formData.frequency === 'one_time') instanceCount = 1;

        for (let i = 0; i < instanceCount; i++) {
          let targetDate = new Date(year, month - 1, day);

          // Calculate target date based on frequency
          if (formData.frequency === 'weekly') {
            targetDate.setDate(targetDate.getDate() + (i * 7));
          } else if (formData.frequency === 'biweekly') {
            targetDate.setDate(targetDate.getDate() + (i * 14));
          } else if (formData.frequency === 'monthly') {
            targetDate.setMonth(targetDate.getMonth() + i);
          } else if (formData.frequency === 'quarterly') {
            targetDate.setMonth(targetDate.getMonth() + (i * 3));
          } else if (formData.frequency === 'biannually') {
            targetDate.setMonth(targetDate.getMonth() + (i * 6));
          } else if (formData.frequency === 'annually') {
            targetDate.setFullYear(targetDate.getFullYear() + i);
          }

          const yyyy = targetDate.getFullYear();
          const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
          const dd = String(targetDate.getDate()).padStart(2, '0');

          let lateByDate = null;
          if (formData.late_by_date) {
            const [lateYear, lateMonth, lateDay] = formData.late_by_date.split('-').map(Number);
            let lateDateObj = new Date(lateYear, lateMonth - 1, lateDay);

            // Apply same frequency offset to late date
            if (formData.frequency === 'weekly') {
              lateDateObj.setDate(lateDateObj.getDate() + (i * 7));
            } else if (formData.frequency === 'biweekly') {
              lateDateObj.setDate(lateDateObj.getDate() + (i * 14));
            } else if (formData.frequency === 'monthly') {
              lateDateObj.setMonth(lateDateObj.getMonth() + i);
            } else if (formData.frequency === 'quarterly') {
              lateDateObj.setMonth(lateDateObj.getMonth() + (i * 3));
            } else if (formData.frequency === 'biannually') {
              lateDateObj.setMonth(lateDateObj.getMonth() + (i * 6));
            } else if (formData.frequency === 'annually') {
              lateDateObj.setFullYear(lateDateObj.getFullYear() + i);
            }

            const lateYYYY = lateDateObj.getFullYear();
            const lateMM = String(lateDateObj.getMonth() + 1).padStart(2, '0');
            const lateDD = String(lateDateObj.getDate()).padStart(2, '0');
            lateByDate = `${lateYYYY}-${lateMM}-${lateDD}`;
          }

          billsToCreate.push({
            name: formData.name,
            amount: parseFloat(formData.amount),
            is_variable: formData.is_variable,
            category: formData.category,
            subcategory: formData.subcategory,
            is_autopay: formData.is_autopay,
            frequency: formData.frequency,
            notes: formData.notes,
            due_date: `${yyyy}-${mm}-${dd}`,
            late_by_date: lateByDate
          });
        }

        await localDB.entities.Bill.bulkCreate(billsToCreate);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving bill:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!bill || !confirm('Delete this bill?')) return;

    setLoading(true);
    try {
      await localDB.entities.Bill.delete(bill.id);
      onClose();
      onSuccess();
    } catch (error) {
      console.error('Error deleting bill:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl max-w-md w-full p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{bill ? 'Edit' : 'Add'} Bill</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Bill Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Electric Bill"
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
              placeholder="100"
              className="bg-white/10 border-white/20 text-white"
              required
            />
          </div>

          <div>
            <Label>Due Date</Label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="bg-[#252538] border-white/10 text-white [color-scheme:dark] w-full min-w-0"
              required
            />
          </div>

          <div>
            <Label>Late By Date (Optional)</Label>
            <Input
              type="date"
              value={formData.late_by_date}
              onChange={(e) => setFormData({ ...formData, late_by_date: e.target.value })}
              className="bg-[#252538] border-white/10 text-white [color-scheme:dark] w-full min-w-0"
            />
            <p className="text-xs text-gray-400 mt-1">Last day to pay without being late</p>
          </div>

          <div>
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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

          <div>
            <Label>Frequency</Label>
            <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="biannually">Bi-annually</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
                <SelectItem value="one_time">One-time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_autopay"
              checked={formData.is_autopay}
              onChange={(e) => setFormData({ ...formData, is_autopay: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="is_autopay" className="cursor-pointer">Auto-pay enabled</Label>
          </div>

          <div className="flex gap-3 pt-4">
            {bill && (
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