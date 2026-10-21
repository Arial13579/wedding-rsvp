'use client';

import { normalizePhone } from './phone';
import { parseVCard, pickPhone, type ContactCandidate } from './vcard';

export interface Device {
  ios: boolean;
  android: boolean;
  /** Safari itself (not Chrome/Firefox/Edge/Google app on iOS) */
  iosSafari: boolean;
  /** The browser can open the system contact picker */
  picker: boolean;
}

export function detectDevice(): Device {
  if (typeof navigator === 'undefined') return { ios: false, android: false, iosSafari: false, picker: false };
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const iosSafari = ios && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|YaBrowser|DuckDuckGo/.test(ua);
  const picker = 'contacts' in navigator && 'ContactsManager' in window;
  return { ios, android, iosSafari, picker };
}

// ---------- CSV / Excel ----------

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  const sep = (text.split('\n')[0].match(/;/g)?.length || 0) > (text.split('\n')[0].match(/,/g)?.length || 0) ? ';' : ',';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const NAME_FULL = /^(name|full name|display name|שם|שם מלא|איש קשר)$/i;
const NAME_FIRST = /^(first name|given name|שם פרטי)$/i;
const NAME_LAST = /^(last name|family name|surname|שם משפחה)$/i;
const PHONE = /(phone|mobile|tel|טלפון|נייד|פלאפון|סלולרי)/i;

/** Turns spreadsheet rows (Google Contacts CSV, Outlook CSV, or a simple name/phone sheet) into contacts. */
export function rowsToContacts(rows: string[][], prefix: string): ContactCandidate[] {
  if (!rows.length) return [];
  const header = rows[0].map((h) => String(h ?? '').trim());
  const find = (re: RegExp) => header.findIndex((h) => re.test(h));
  let full = find(NAME_FULL), first = find(NAME_FIRST), last = find(NAME_LAST);
  // Google CSV labels phone columns "Phone 1 - Value"; skip the "- Label"/"- Type" columns
  let phones = header.map((h, i) => (PHONE.test(h) && !/label|type|סוג/i.test(h) ? i : -1)).filter((i) => i >= 0);
  let body = rows.slice(1);
  if (full < 0 && first < 0 && !phones.length) {
    // No header: assume column A = name, column B = phone (like the original site's Excel import)
    full = 0; first = -1; last = -1; phones = [1]; body = rows;
  }
  const out: ContactCandidate[] = [];
  body.forEach((r, idx) => {
    const cell = (i: number) => (i >= 0 ? String(r[i] ?? '').trim() : '');
    const name = cell(full) || [cell(first), cell(last)].filter(Boolean).join(' ');
    const nums = Array.from(new Set(phones.flatMap((i) => cell(i).split(/:::|,|;|\//)).map((p) => normalizePhone(p)).filter(Boolean)));
    if (!name || !nums.length) return;
    out.push({ key: `${prefix}${idx}`, name, phone: pickPhone(nums), phones: nums });
  });
  return out;
}

let xlsxPromise: Promise<unknown> | null = null;
function loadXlsx(): Promise<{ read: (d: ArrayBuffer, o: object) => { SheetNames: string[]; Sheets: Record<string, unknown> }; utils: { sheet_to_json: (s: unknown, o: object) => string[][] } }> {
  xlsxPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => resolve((window as unknown as { XLSX: unknown }).XLSX);
    s.onerror = () => { xlsxPromise = null; reject(new Error('לא הצלחנו לטעון את קורא האקסל. בדקו את החיבור לאינטרנט.')); };
    document.head.appendChild(s);
  });
  return xlsxPromise as ReturnType<typeof loadXlsx>;
}

/** Reads any supported contacts file: vCard (.vcf), CSV, or Excel. */
export async function parseContactsFile(file: File, index = 0): Promise<ContactCandidate[]> {
  const name = file.name.toLowerCase();
  const prefix = `f${index}-`;
  if (/\.(xlsx|xls|numbers)$/.test(name) || /spreadsheet|excel/.test(file.type)) {
    const XLSX = await loadXlsx();
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, blankrows: false, raw: false });
    return rowsToContacts(rows, prefix);
  }
  const text = await file.text();
  if (/BEGIN:VCARD/i.test(text)) return parseVCard(text).map((c) => ({ ...c, key: prefix + c.key }));
  return rowsToContacts(parseCsv(text.replace(/^﻿/, '')), prefix);
}
