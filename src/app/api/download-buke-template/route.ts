
import {NextResponse} from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  const filePath = path.resolve('.', 'public/buke-template.csv');
  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="buke-template.csv"',
    },
  });
}
