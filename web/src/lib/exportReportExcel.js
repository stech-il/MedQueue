import ExcelJS from 'exceljs';

const STATUS_LABEL = {
  waiting: 'ממתין',
  called: 'נקרא',
  serving: 'בטיפול',
  completed: 'הושלם',
};

const COLORS = {
  headerBg: 'FF0F766E',
  headerText: 'FFFFFFFF',
  title: 'FF0F172A',
  subtitle: 'FF64748B',
  zebra: 'FFF8FAFC',
  border: 'FFE2E8F0',
  waiting: 'FFFEF3C7',
  called: 'FFDBEAFE',
  serving: 'FFE0E7FF',
  completed: 'FFD1FAE5',
};

function thinBorder() {
  return {
    top: { style: 'thin', color: { argb: COLORS.border } },
    left: { style: 'thin', color: { argb: COLORS.border } },
    bottom: { style: 'thin', color: { argb: COLORS.border } },
    right: { style: 'thin', color: { argb: COLORS.border } },
  };
}

function styleHeaderRow(row) {
  row.height = 26;
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg },
    };
    cell.font = { bold: true, color: { argb: COLORS.headerText }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
    cell.border = thinBorder();
  });
}

function styleDataRow(row, index, { status } = {}) {
  const isZebra = index % 2 === 1;
  let fillArgb = isZebra ? COLORS.zebra : 'FFFFFFFF';
  if (status && COLORS[status]) fillArgb = COLORS[status];

  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: fillArgb },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
    cell.border = thinBorder();
    cell.font = { size: 10, color: { argb: 'FF334155' } };
  });
}

function formatMinCell(m, live) {
  if (m == null || m === '') return '—';
  return live ? `${m} (עכשיו)` : m;
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = iso.replace('T', ' ').slice(0, 16);
  return d;
}

function periodLabel(period) {
  if (!period) return '';
  if (period.from === period.to) return `תאריך: ${period.from}`;
  return `תקופה: ${period.from} — ${period.to}`;
}

function addSheetTitle(ws, title, subtitle, colCount) {
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16, color: { argb: COLORS.title } };
  titleCell.alignment = { horizontal: 'right', vertical: 'middle' };

  if (subtitle) {
    ws.mergeCells(2, 1, 2, colCount);
    const subCell = ws.getCell(2, 1);
    subCell.value = subtitle;
    subCell.font = { size: 11, color: { argb: COLORS.subtitle } };
    subCell.alignment = { horizontal: 'right', vertical: 'middle' };
    return 3;
  }
  return 2;
}

function buildSummarySheet(ws, data) {
  const { summary, period, clinic_name: clinic } = data;
  const startRow = addSheetTitle(
    ws,
    `דוח תורים — ${clinic || 'MedQueue'}`,
    periodLabel(period),
    2
  );

  const rows = [
    ['מדד', 'ערך'],
    ['נכנסו לתור', summary.total],
    ['ממתינים עכשיו', summary.waiting],
    ['בטיפול / נקראו', summary.in_progress],
    ['הושלמו', summary.completed],
    ['נקראו (סה״כ)', summary.called_count],
    ['המתנה ממוצעת (דק׳)', formatMinCell(summary.avg_wait_min)],
    ['המתנה מקסימלית (דק׳)', formatMinCell(summary.max_wait_min)],
    ['המתנה מינימלית (דק׳)', formatMinCell(summary.min_wait_min)],
    ['זמן טיפול ממוצע (דק׳)', formatMinCell(summary.avg_service_min)],
    ['זמן כולל ממוצע (דק׳)', formatMinCell(summary.avg_total_min)],
    ['סה״כ רשומות בפירוט', data.tickets?.length ?? 0],
  ];

  rows.forEach((rowData, i) => {
    const row = ws.getRow(startRow + i);
    row.values = rowData;
    if (i === 0) styleHeaderRow(row);
    else styleDataRow(row, i - 1);
    if (i > 0) {
      row.getCell(2).font = { bold: true, size: 11 };
    }
  });

  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 18;
}

function buildTableSheet(ws, title, subtitle, headers, dataRows, rowMapper) {
  const colCount = headers.length;
  const startRow = addSheetTitle(ws, title, subtitle, colCount);
  const headerRow = ws.getRow(startRow);
  headerRow.values = headers;
  styleHeaderRow(headerRow);

  dataRows.forEach((item, i) => {
    const row = ws.getRow(startRow + 1 + i);
    row.values = rowMapper(item);
    styleDataRow(row, i);
  });

  headers.forEach((_, i) => {
    ws.getColumn(i + 1).width = Math.max(12, Math.min(24, (headers[i]?.length || 8) * 1.4));
  });
}

function buildHourSheet(ws, data) {
  const subtitle = periodLabel(data.period);
  const startRow = addSheetTitle(ws, 'כניסות לפי שעה', subtitle, 2);
  const headerRow = ws.getRow(startRow);
  headerRow.values = ['שעה', 'כמות'];
  styleHeaderRow(headerRow);

  for (let h = 0; h < 24; h++) {
    const key = String(h).padStart(2, '0');
    const row = data.byHour.find((x) => x.hour === key);
    const count = row?.count || 0;
    const r = ws.getRow(startRow + 1 + h);
    r.values = [`${key}:00`, count];
    styleDataRow(r, h);
  }

  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 12;
}

function buildTicketsSheet(ws, data) {
  const headers = [
    'מספר תור',
    'שירות',
    'חדר',
    'סטטוס',
    'נכנס',
    'נקרא',
    'הושלם',
    'המתנה (דק)',
    'טיפול (דק)',
    'סה״כ (דק)',
    'עדיפות',
    'טלפון',
    'ת.ז.',
    'קופה',
  ];
  const subtitle = `${periodLabel(data.period)} · ${data.tickets.length} רשומות`;
  const startRow = addSheetTitle(ws, 'פירוט תורים', subtitle, headers.length);
  const headerRow = ws.getRow(startRow);
  headerRow.values = headers;
  styleHeaderRow(headerRow);

  data.tickets.forEach((t, i) => {
    const row = ws.getRow(startRow + 1 + i);
    row.values = [
      t.display_code,
      t.service_name,
      t.room_name || '—',
      STATUS_LABEL[t.status] || t.status,
      formatDateTime(t.created_at),
      formatDateTime(t.called_at),
      formatDateTime(t.completed_at),
      formatMinCell(t.wait_min, t.wait_min_live),
      formatMinCell(t.service_min),
      formatMinCell(t.total_min),
      t.priority > 0 ? 'כן' : '—',
      t.phone || '—',
      t.id_number || '—',
      t.health_fund || '—',
    ];
    styleDataRow(row, i, { status: t.status });
  });

  const widths = [12, 16, 14, 10, 18, 18, 18, 12, 12, 12, 8, 14, 12, 10];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  ws.autoFilter = {
    from: { row: startRow, column: 1 },
    to: { row: startRow + data.tickets.length, column: headers.length },
  };
  ws.views = [{ state: 'frozen', ySplit: startRow, rightToLeft: true }];
}

/** @param {object} data — תוצאת getReports */
export async function exportReportExcel(data) {
  if (!data?.summary) throw new Error('אין נתונים לייצוא');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'MedQueue';
  wb.created = new Date();
  wb.company = data.clinic_name || 'MedQueue';

  const periodSub = periodLabel(data.period);

  const wsSummary = wb.addWorksheet('סיכום', {
    views: [{ rightToLeft: true }],
    properties: { defaultRowHeight: 22 },
  });
  buildSummarySheet(wsSummary, data);

  const wsRoom = wb.addWorksheet('לפי חדר', {
    views: [{ rightToLeft: true }],
  });
  buildTableSheet(
    wsRoom,
    'פילוח לפי חדר',
    periodSub,
    ['חדר', 'נכנסו', 'הושלמו', 'ממתינים', 'המתנה ממוצעת (דק)'],
    data.byRoom || [],
    (r) => [
      r.room_name,
      r.total,
      r.completed,
      r.waiting,
      formatMinCell(r.avg_wait_min),
    ]
  );

  const wsSvc = wb.addWorksheet('לפי שירות', {
    views: [{ rightToLeft: true }],
  });
  buildTableSheet(
    wsSvc,
    'פילוח לפי שירות',
    periodSub,
    ['שירות', 'קידומת', 'נכנסו', 'הושלמו', 'המתנה ממוצעת (דק)'],
    data.byService || [],
    (r) => [
      r.service_name,
      r.prefix,
      r.total,
      r.completed,
      formatMinCell(r.avg_wait_min),
    ]
  );

  const wsFund = wb.addWorksheet('לפי קופה', {
    views: [{ rightToLeft: true }],
  });
  buildTableSheet(
    wsFund,
    'פילוח לפי קופת חולים',
    periodSub,
    ['קופה', 'נכנסו', 'הושלמו', 'ממתינים', 'המתנה ממוצעת (דק)'],
    data.byHealthFund || [],
    (r) => [
      r.health_fund,
      r.total,
      r.completed,
      r.waiting,
      formatMinCell(r.avg_wait_min),
    ]
  );

  const wsHour = wb.addWorksheet('לפי שעה', {
    views: [{ rightToLeft: true }],
  });
  buildHourSheet(wsHour, data);

  const wsTickets = wb.addWorksheet('פירוט תורים', {
    views: [{ rightToLeft: true }],
  });
  buildTicketsSheet(wsTickets, data);

  const from = data.period?.from || 'report';
  const to = data.period?.to || from;
  const suffix = from === to ? from : `${from}_${to}`;
  const filename = `medqueue-report-${suffix}.xlsx`;

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
