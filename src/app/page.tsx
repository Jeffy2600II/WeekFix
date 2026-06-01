'use client';

import { useState, useEffect } from 'react';
import { BudgetItem, WeeklyBudget } from '@/types';
import { Plus, Trash2, Calendar, Wallet, Layers } from 'lucide-react';

const DAYS = [
  { key: 'All', label: 'ภาพรวม / รวบยอดสัปดาห์' },
  { key: 'Monday', label: 'วันจันทร์ (ร้อยละ 100)' },
  { key: 'Tuesday', label: 'วันอังคาร (ร้อยละ 100)' },
  { key: 'Wednesday', label: 'วันพุธ (ร้อยละ 100)' },
  { key: 'Thursday', label: 'วันพฤหัสบดี (ร้อยละ 100)' },
  { key: 'Friday', label: 'วันศุกร์ (ร้อยละ 100)' },
  { key: 'Saturday', label: 'วันเสาร์' },
  { key: 'Sunday', label: 'วันอาทิตย์' }
];

export default function Home() {
  const [budget, setBudget] = useState<WeeklyBudget>({ income: 500, items: [] });
  const [loading, setLoading] = useState(true);

  // Form States
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<BudgetItem['dayOfWeek']>('All');
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    fetch('/api/budget')
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setBudget(data);
        setLoading(false);
      });
  }, []);

  const updateIncomeInDB = async (newIncome: number) => {
    setBudget(prev => ({ ...prev, income: newIncome }));
    await fetch('/api/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_income', data: { income: newIncome } }),
    });
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;

    const newItem: BudgetItem = {
      id: crypto.randomUUID(),
      name,
      amount: parseFloat(amount),
      dayOfWeek,
      expiryDate: expiryDate || '2099-12-31',
      createdAt: new Date().toISOString().split('T')[0]
    };

    setBudget(prev => ({ ...prev, items: [newItem, ...prev.items] }));
    
    await fetch('/api/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_item', data: newItem }),
    });

    setName('');
    setAmount('');
    setExpiryDate('');
  };

  const handleDeleteItem = async (id: string) => {
    setBudget(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
    await fetch('/api/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_item', data: { id } }),
    });
  };

  // กรองตารางสัปดาห์นี้ vs คลังข้อมูลที่ตั้งค่าซ่อน/หมดอายุไปแล้ว
  const todayStr = new Date().toISOString().split('T')[0];
  const activeItems = budget.items.filter(item => item.expiryDate >= todayStr);
  const archivedItems = budget.items.filter(item => item.expiryDate < todayStr);

  const totalExpenses = activeItems.reduce((sum, item) => sum + item.amount, 0);
  const remainingBalance = budget.income - totalExpenses;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center font-bold text-indigo-600 animate-pulse text-lg">
          🛸 กำลังโหลดข้อมูล WeekFix ของครอบครัว...
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-md p-4 pb-20">
      {/* ส่วนหัวแสดงเงินคงเหลือ */}
      <header className="rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white shadow-xl shadow-indigo-200 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            ⚡ WeekFix
          </h1>
          <span className="text-[10px] bg-indigo-500/40 border border-indigo-400/30 px-2 py-1 rounded-full uppercase tracking-wider font-semibold">
            D1 Database Connected
          </span>
        </div>
        
        <div className="mb-4">
          <label className="text-xs text-indigo-200 block mb-1 font-medium">เงินรายรับประจำสัปดาห์นี้ (บาท)</label>
          <input
            type="number"
            value={budget.income}
            onChange={(e) => updateIncomeInDB(parseFloat(e.target.value) || 0)}
            className="bg-indigo-700/40 text-white font-black text-3xl rounded-2xl px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-white border border-indigo-500/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-indigo-500/30 pt-4 mt-2">
          <div>
            <span className="text-xs text-indigo-200 block font-medium">แผนการจ่ายทั้งหมด</span>
            <span className="text-xl font-bold">{totalExpenses} ฿</span>
          </div>
          <div>
            <span className="text-xs text-indigo-200 block font-medium">คงเหลือให้ช้อป</span>
            <span className={`text-xl font-bold ${remainingBalance < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
              {remainingBalance} ฿
            </span>
          </div>
        </div>
      </header>

      {/* ฟอร์มเพิ่มรายการ */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6">
        <h2 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-indigo-600" /> วางแผนจัดรายการซื้อ
        </h2>
        <form onSubmit={handleAddItem} className="space-y-3">
          <input
            type="text"
            placeholder="จะซื้ออะไร? (เช่น ค่ารถ, ข้าวเที่ยง, เติมเกม)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm p-3 bg-slate-50 rounded-xl border border-slate-200/60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="ราคาโดยประมาณ"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-sm p-3 bg-slate-50 rounded-xl border border-slate-200/60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value as any)}
              className="text-sm p-3 bg-slate-50 rounded-xl border border-slate-200/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
            >
              {DAYS.map(day => (
                <option key={day.key} value={day.key}>{day.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-slate-400 font-medium block px-1 mb-1">
              🗓️ ตั้งค่าซ่อนรายการนี้อัตโนมัติเมื่อสิ้นวันสัปดาห์ไหน: (เว้นว่างไว้ถ้าจะใช้ซ้ำเรื่อยๆ)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full text-sm p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-500"
            />
          </div>
          <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold p-3 rounded-xl text-sm transition-all shadow-sm">
            บันทึกเข้าแผนตารางกลาง
          </button>
        </form>
      </section>

      {/* บอร์ดแสดงรายการประจำแต่ละวัน */}
      <section className="space-y-4">
        <h2 className="font-bold text-slate-800 flex items-center gap-2 text-base px-1">
          <Calendar className="w-5 h-5 text-indigo-600" /> แผนตารางเงินรายสัปดาห์นี้
        </h2>

        {DAYS.map(day => {
          const dayItems = activeItems.filter(item => item.dayOfWeek === day.key);
          if (dayItems.length === 0 && day.key !== 'All') return null;

          const dayTotal = dayItems.reduce((s, i) => s + i.amount, 0);

          return (
            <div key={day.key} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 transition-all">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${day.key === 'All' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                  {day.key === 'All' ? '📌 รวมรายจ่ายภาพรวม' : day.label.split(' ')[0]}
                </span>
                <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                  {dayTotal} บาท
                </span>
              </div>

              {dayItems.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2 text-center">ยังไม่มีรายการวางแผน</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {dayItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{item.name}</p>
                        {item.expiryDate !== '2099-12-31' && (
                          <p className="text-[10px] text-amber-600 font-medium">จะซ่อนอัตโนมัติเมื่อพ้นวันที่: {item.expiryDate}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-slate-800">{item.amount} ฿</span>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors p-1"
                          title="ลบถาวรออกจากตารางครอบครัว"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* คลังประวัติรายการเก่า (ซ่อนอัตโนมัติแต่ไม่ลบถาวร) */}
      {archivedItems.length > 0 && (
        <section className="mt-8 bg-slate-200/50 rounded-2xl p-4 border border-dashed border-slate-300">
          <details className="group">
            <summary className="font-bold text-xs text-slate-500 cursor-pointer list-none flex justify-between items-center select-none">
              <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> รายการเก่าที่ถูกซ่อนประจำอาทิตย์ ({archivedItems.length})</span>
              <span className="group-open:rotate-180 transition-transform text-[10px]">▼</span>
            </summary>
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto divide-y divide-slate-200">
              {archivedItems.map(item => (
                <div key={item.id} className="flex justify-between items-center pt-2 text-xs text-slate-500">
                  <span>{item.name} ({DAYS.find(d => d.key === item.dayOfWeek)?.label.split(' ')[0]})</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{item.amount} ฿</span>
                    <button onClick={() => handleDeleteItem(item.id)} className="text-slate-400 hover:text-red-400 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </section>
      )}
    </main>
  );
}
