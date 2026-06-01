import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { BudgetItem } from '@/types';

interface CloudflareEnv {
  DB: any;
}

// ======================
// GET
// ======================

export async function GET(request: NextRequest) {
  try {
    const context = (request as any).context;
    const env = context?.env as CloudflareEnv;

    if (!env) {
      return NextResponse.json(
        {
          success: false,
          error: 'ENV_NOT_FOUND',
        },
        { status: 500 }
      );
    }

    if (!env.DB) {
      return NextResponse.json(
        {
          success: false,
          error: 'DB_NOT_FOUND',
        },
        { status: 500 }
      );
    }

    const incomeRow = await env.DB.prepare(
      "SELECT value FROM budget_settings WHERE key = 'weekly_income'"
    ).first() as { value: string } | null;

    const income = incomeRow
      ? parseFloat(incomeRow.value)
      : 500;

    const response = await env.DB.prepare(
      `
      SELECT
        id,
        name,
        amount,
        day_of_week as dayOfWeek,
        expiry_date as expiryDate,
        created_at as createdAt
      FROM budget_items
      ORDER BY created_at DESC
      `
    ).all();

    return NextResponse.json({
      success: true,
      income,
      items: (response.results as BudgetItem[]) || [],
    });

  } catch (error: any) {

    console.error('GET ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'D1_FETCH_FAILED',
        message: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ======================
// POST
// ======================

export async function POST(request: NextRequest) {
  try {
    const context = (request as any).context;
    const env = context?.env as CloudflareEnv;

    if (!env) {
      return NextResponse.json(
        {
          success: false,
          error: 'ENV_NOT_FOUND',
        },
        { status: 500 }
      );
    }

    if (!env.DB) {
      return NextResponse.json(
        {
          success: false,
          error: 'DB_NOT_FOUND',
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const { action, data } = body;

    switch (action) {

      case 'update_income':

        await env.DB.prepare(
          `
          INSERT OR REPLACE INTO budget_settings
          (key, value)
          VALUES ('weekly_income', ?)
          `
        )
          .bind(String(data.income))
          .run();

        break;

      case 'add_item':

        await env.DB.prepare(
          `
          INSERT INTO budget_items
          (
            id,
            name,
            amount,
            day_of_week,
            expiry_date,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
          `
        )
          .bind(
            data.id,
            data.name,
            data.amount,
            data.dayOfWeek,
            data.expiryDate,
            data.createdAt
          )
          .run();

        break;

      case 'delete_item':

        await env.DB.prepare(
          `
          DELETE FROM budget_items
          WHERE id = ?
          `
        )
          .bind(data.id)
          .run();

        break;

      default:

        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_ACTION',
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
    });

  } catch (error: any) {

    console.error('POST ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'D1_UPDATE_FAILED',
        message: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}