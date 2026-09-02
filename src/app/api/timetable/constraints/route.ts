import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import baseConstraintsDefault from '@/lib/timetable/constraints.base.json';

export const dynamic = 'force-dynamic';

const CONSTRAINTS_FILE_PATH = path.join(process.cwd(), 'src/lib/timetable/constraints.base.json');

function readBaseConstraints() {
  try {
    if (fs.existsSync(CONSTRAINTS_FILE_PATH)) {
      const raw = fs.readFileSync(CONSTRAINTS_FILE_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading constraints.base.json:', err);
  }
  return baseConstraintsDefault;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const semester = searchParams.get('semester');

  const raw = readBaseConstraints();
  const semKey = semester ? String(semester) : null;
  const semSpecific = semKey && raw.semester_constraints?.[semKey] ? raw.semester_constraints[semKey] : null;

  const universalHard = raw.hard_constraints || [];
  const universalSoft = raw.soft_constraints || [];

  const semHard = semSpecific?.hard_constraints || [];
  const semSoft = semSpecific?.soft_constraints || [];

  const responsePayload = {
    schedule: raw.schedule,
    universal_hard_constraints: universalHard,
    universal_soft_constraints: universalSoft,
    semester_constraints: raw.semester_constraints || {},
    // Consolidated constraints for the requested semester
    hard_constraints: [...universalHard, ...semHard],
    soft_constraints: [...universalSoft, ...semSoft],
    selected_semester_hard: semHard,
    selected_semester_soft: semSoft,
  };

  return NextResponse.json(responsePayload);
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    if (body.reset) {
      fs.writeFileSync(CONSTRAINTS_FILE_PATH, JSON.stringify(baseConstraintsDefault, null, 2), 'utf8');
      return NextResponse.json({ success: true, constraints: baseConstraintsDefault });
    }

    const current = readBaseConstraints();
    const updated = {
      schedule: body.schedule || current.schedule,
      hard_constraints: Array.isArray(body.universal_hard_constraints)
        ? body.universal_hard_constraints
        : Array.isArray(body.hard_constraints)
        ? body.hard_constraints
        : current.hard_constraints,
      soft_constraints: Array.isArray(body.universal_soft_constraints)
        ? body.universal_soft_constraints
        : Array.isArray(body.soft_constraints)
        ? body.soft_constraints
        : current.soft_constraints,
      semester_constraints: body.semester_constraints || current.semester_constraints || {},
    };

    fs.writeFileSync(CONSTRAINTS_FILE_PATH, JSON.stringify(updated, null, 2), 'utf8');
    return NextResponse.json({ success: true, constraints: updated });
  } catch (err: any) {
    console.error('Error updating base constraints:', err);
    return NextResponse.json({ error: err.message || 'Failed to update constraints' }, { status: 500 });
  }
}
