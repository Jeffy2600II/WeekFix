import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { BudgetItem } from '@/types';

export const runtime = 'edge';

// กำหนด Interface สำหรับ Cloudflare Env ภายในไฟล์เพื่อให้ใช้งานได้ทันที
interface CloudflareEnv {
  DB: any; // รองรับ D1Database ผ่าน binding ของ Cloudflare
}

// GET: ดึงค่าเงินงบประมาณ และรายการทั้งหมดจากฐานข้อมูล D1
export async function GET(request: NextRequest) {
  try {
    const context = (request as any).context;
    const env = context?.env as CloudflareEnv;
    
    if (!env || !env.DB) {
      // ถ้ายังไม่ได้ผูกดีบี ให้ส่งค่าเริ่มต้นกลับไปก่อนเพื่อไม่ให้แอปพัง
      return NextResponse.json({ income: 500, items: [] });
    }

    // 1. ดึงงบประมาณรวมสัปดาห์นี้
    const incomeRow = await env.DB.prepare(
      "SELECT value FROM budget_settings WHERE key = 'weekly_income'"
    ).first<{ value: string }>();
    const income = incomeRow ? parseFloat(incomeRow.value) : 500;

    // 2. ดึงรายการสิ่งของทั้งหมด เรียงจากใหม่ไปเก่า
    const { results } = await env.DB.prepare(
      "SELECT id, name, amount, day_of_week as dayOfWeek, expiry_date as expiryDate, created_at as createdAt FROM budget_items ORDER BY created_at DESC"
    ).all<BudgetItem>();

    return NextResponse.json({ income, items: results || [] });
  } catch (error) {
    return NextResponse.json({ error: 'D1 Fetch Failed' }, { status: 500 });
  }
}

// POST: รับคำสั่งแก้ไขเงินงบประมาณ / เพิ่มรายการใหม่ / ลบรายการ
export async function POST(request: NextRequest) {
  try {
    const context = (request as any).context;
    const env = context?.env as CloudflareEnv;
    
    if (!env || !env.DB) {
      return NextResponse.json({ error: 'D1 Database not found' }, { status: 500 });
    }

    const body = await request.json();
    const { action, data } = body;

    // เคสที่ 1: อัปเดตจำนวนเงินงบประมาณรายสัปดาห์
    if (action === 'update_income') {
      await env.DB.prepare(
        "INSERT OR REPLACE INTO budget_settings (key, value) VALUES ('weekly_income', ?)"
      ).bind(data.income.toString()).run();
      
    // เคสที่ 2: เพิ่มรายการสิ่งของใหม่เข้าตาราง
    } else if (action === 'add_item') {
      await env.DB.prepare(
        "INSERT INTO budget_items (id, name, amount, day_of_week, expiry_date, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(data.id, data.name, data.amount, data.dayOfWeek, data.expiryDate, data.createdAt).run();

    // เคสที่ 3: ลบรายการสิ่งของออกจากฐานข้อมูลถาวร
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
