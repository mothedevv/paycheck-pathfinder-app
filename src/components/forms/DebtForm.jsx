import React, { useState } from 'react';
import { localDB } from '@/components/localDB';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Trash2 } from 'lucide-react';

export default function DebtForm({ debt, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: debt?.name || '',
    balance: debt?.balance || '',
    original_balance: debt?.original_balance || debt?.balance || '',
    minimum_payment: debt?.minimum_payment || '',
    apr: debt?.apr || '',
    due_day: debt?.due_day || '',
    late_by_day: debt?.late_by_day || '',
    statement_day: debt?.statement_day || '',
    type: debt?.type || 'credit_card',
    credit_limit: debt?.credit_limit || '',
    linked_asset_id: debt?.linked_asset_id || ''
  });
  const [loading, setLoading] = useState(false);

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      return localDB.entities.Asset.filter();
    },
    refetchOnWindowFocus: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Auto-calculate late_by_day for debts tied to assets (30 days from due date)
      let lateByDay = formData.late_by_day ? parseInt(formData.late_by_day) : undefined;
      if (formData.linked_asset_id && formData.due_day) {
        const dueDay = parseInt(formData.due_day);
        const tempDate = new Date(2025, 0, dueDay); // Use any month to calculate
        tempDate.setDate(tempDate.getDate() + 30);
        lateByDay = tempDate.getDate();
      }

      const dataToSubmit = {
        ...formData,
        balance: parseFloat(formData.balance),
        original_balance: formData.original_balance ? parseFloat(formData.original_balance) : parseFloat(formData.balance),
        minimum_payment: formData.minimum_payment ? parseFloat(formData.minimum_payment) : undefined,
        apr: parseFloat(formData.apr),
        due_day: parseInt(formData.due_day),
        late_by_day: lateByDay,
        statement_day: formData.statement_day ? parseInt(formData.statement_day) : undefined,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : undefined,
        linked_asset_id: formData.linked_asset_id || undefined
      };

      let debtId;
      if (debt) {
        await localDB.entities.Debt.update(debt.id, dataToSubmit);
        debtId = debt.id;
      } else {
        const newDebt = await localDB.entities.Debt.create(dataToSubmit);
        debtId = newDebt.id;
      }

      // Create or update corresponding bill if minimum payment exists
      if (dataToSubmit.minimum_payment) {
        const allBills = await localDB.entities.Bill.filter();
        const billName = `${formData.name} Payment`;
        const existingBills = allBills.filter(b => b.name === billName);

        const today = new Date();
        const dueDay = parseInt(formData.due_day);
        let dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
        if (dueDate < today) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }

        if (debt) {
          // Update existing bills with same name
          const updatePromises = existingBills.map(b => {
            const [y, m, d] = b.due_date.split('-').map(Number);
            // All debt bills: 30 days from due date
            const dueDate = new Date(y, m - 1, d);
            dueDate.setDate(dueDate.getDate() + 30);
            const lateByDate = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;
            
            return localDB.entities.Bill.update(b.id, {
              amount: dataToSubmit.minimum_payment,
              late_by_date: lateByDate,
              category: 'debt_payments',
              frequency: 'monthly',
              notes: `Auto-generated from debt: ${formData.name}`
            });
          });
          
          await Promise.all(updatePromises);
        } else {
          // Create bills for this month and next 6 months
          const billsToCreate = [];
          
          for (let i = 0; i < 7; i++) {
            const targetDate = new Date(dueDate.getFullYear(), dueDate.getMonth() + i, dueDay);
            const dueDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
            
            // All debt bills: 30 days from due date
            const lateDate = new Date(targetDate);
            lateDate.setDate(lateDate.getDate() + 30);
            const lateByDate = `${lateDate.getFullYear()}-${String(lateDate.getMonth() + 1).padStart(2, '0')}-${String(lateDate.getDate()).padStart(2, '0')}`;
            
            billsToCreate.push({
              name: `${formData.name} Payment`,
              amount: dataToSubmit.minimum_payment,
              due_date: dueDateStr,
              late_by_date: lateByDate,
              category: 'debt_payments',
              frequency: 'monthly',
              notes: `Auto-generated from debt: ${formData.name}`
            });
          }
          
          await localDB.entities.Bill.bulkCreate(billsToCreate);
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving debt:', error);
      alert('Error saving debt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!debt || !confirm('Delete this debt? This will also remove all associated bill payments.')) return;

    setLoading(true);
    try {
      // Delete all associated bills
      const allBills = await localDB.entities.Bill.filter();
      const billName = `${debt.name} Payment`;
      const existingBills = allBills.filter(b => b.name === billName);
      
      const deletePromises = existingBills.map(bill => localDB.entities.Bill.delete(bill.id));
      await Promise.all(deletePromises);

      await localDB.entities.Debt.delete(debt.id);
      onSuccess();
    } catch (error) {
      console.error('Error deleting debt:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl max-w-md w-full p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{debt ? 'Edit' : 'Add'} Debt</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Account Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Chase Credit Card"
              className="bg-white/10 border-white/20 text-white"
              required
            />
          </div>

          <div>
            <Label>Current Balance</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
              placeholder="5000"
              className="bg-white/10 border-white/20 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>APR (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.apr}
                onChange={(e) => setFormData({ ...formData, apr: e.target.value })}
                placeholder="19.99"
                className="bg-white/10 border-white/20 text-white"
                required
              />
            </div>

            {(formData.type === 'credit_card' || formData.type === 'personal_loan') && (
              <div>
                <Label>Credit Limit</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                  placeholder="10000"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            )}
          </div>

          <div>
            <Label>Minimum Payment</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.minimum_payment}
              onChange={(e) => setFormData({ ...formData, minimum_payment: e.target.value })}
              placeholder="100"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Due Day</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={formData.due_day}
                onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                placeholder="15"
                className="bg-white/10 border-white/20 text-white"
                required
              />
            </div>

            <div>
              <Label>Statement Day</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={formData.statement_day}
                onChange={(e) => setFormData({ ...formData, statement_day: e.target.value })}
                placeholder="10"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          <div>
            <Label>Late By Day (Optional)</Label>
            <Input
              type="number"
              min="1"
              max="31"
              value={formData.late_by_day}
              onChange={(e) => setFormData({ ...formData, late_by_day: e.target.value })}
              placeholder="20"
              className="bg-white/10 border-white/20 text-white"
              disabled={!!formData.linked_asset_id}
            />
            <p className="text-xs text-gray-400 mt-1">
              {formData.linked_asset_id 
                ? 'Auto-calculated as 30 days from due date for asset-backed debt' 
                : 'Last day to pay without being late'}
            </p>
          </div>

          <div>
            <Label>Debt Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="student_loan">Student Loan</SelectItem>
                <SelectItem value="car_loan">Car Loan</SelectItem>
                <SelectItem value="personal_loan">Personal Loan</SelectItem>
                <SelectItem value="mortgage">Mortgage</SelectItem>
                <SelectItem value="medical">Medical</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                </SelectContent>
                </Select>
                </div>

                {/* Linked Asset */}
                <div className="space-y-2">
                <Label>Linked Asset (Optional)</Label>
                <Select
                value={formData.linked_asset_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, linked_asset_id: value === 'none' ? '' : value })}
                >
                <SelectTrigger className="bg-[#1a1a2e] border-white/10 text-white">
                <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {assets.map(asset => (
                  <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>
                ))}
                </SelectContent>
                </Select>
                </div>

          <div className="flex gap-3 pt-4">
            {debt && (
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