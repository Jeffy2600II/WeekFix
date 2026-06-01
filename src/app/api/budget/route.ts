import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { BudgetItem } from '@/types';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const context = (request as any).context;
    const env = context?.env as CloudflareEnv;
    
    if (!env || !env.DB) {
      return NextResponse.json({ income: 500, items: [] });
    }

    // 1. ดึงงบประมาณรวมสัปดาห์นี้
    const incomeRow = await env.DB.prepare(
      "SELECT value FROM budget_settings WHERE key = 'weekly_income'"
    ).first<{ value: string }>();
    const income = incomeRow ? parseFloat(incomeRow.value) : 500;

    // 2. ดึงรายการสิ่งของทั้งหมด
    const { results } = await env.DB.prepare(
      "SELECT id, name, amount, day_of_week as dayOfWeek, expiry_date as expiryDate, created_at as createdAt FROM budget_items ORDER BY created_at DESC"
    ).all<BudgetItem>();

    return NextResponse.json({ income, items: results || [] });
  } catch (error) {
    return NextResponse.json({ error: 'D1 Fetch Failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = (request as any).context;
    const env = context?.env as CloudflareEnv;
    
    if (!env || !env.DB) {
      return NextResponse.json({ error: 'D1 Database not found' }, { status: 500 });
    }

    const body = await request.json();
    const { action, data } = body;

    if (action === 'update_income') {
      await env.DB.prepare(
        "INSERT OR REPLACE INTO budget_settings (key, value) VALUES ('weekly_income', ?)"
      ).bind(data.income.toString()).run();
      
    } else if (action === 'add_item') {
      await env.DB.prepare(
        "INSERT INTO budget_items (id, name, amount, day_of_week, expiry_date, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(data.id, data.name, data.amount, data.dayOfWeek, data.expiryDate, data.createdAt).run();

    } else if (action === 'delete_item') {
      await env.DB.prepare(
        "DELETE FROM budget_items WHERE id = ?"
      ).bind(data.id).run();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'D1 Update Failed' }, { status: 500 });
  }
}
