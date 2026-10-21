// Contact-file parsing tests: node --experimental-strip-types tests/contacts.test.mjs
import { rowsToContacts } from '../src/lib/contacts.ts';
import { parseVCard } from '../src/lib/vcard.ts';
let failed = 0;
const eq = (label, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) failed++; console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : `\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`}`); };
const brief = (l) => l.map((c) => [c.name, c.phone]);

eq('Google Contacts CSV', brief(rowsToContacts([
  ['First Name', 'Middle Name', 'Last Name', 'Phone 1 - Label', 'Phone 1 - Value', 'Phone 2 - Label', 'Phone 2 - Value'],
  ['משה', '', 'כהן', 'Home', '03-5551234', 'Mobile', '054-555-1234'],
  ['Sara', '', 'Levi', 'Mobile', '+972 52-111-2222 ::: 050-0000000', '', ''],
  ['בלי', '', 'טלפון', '', '', '', ''],
], 'g')), [['משה כהן', '972545551234'], ['Sara Levi', '972521112222']]);

eq('Hebrew header sheet', brief(rowsToContacts([['שם', 'טלפון'], ['דנה', '0501234567']], 'h')), [['דנה', '972501234567']]);
eq('Sheet without header (A=name, B=phone)', brief(rowsToContacts([['דנה', '050-1234567'], ['יוסי', '0529876543']], 'n')), [['דנה', '972501234567'], ['יוסי', '972529876543']]);

eq('iPhone vCard export', brief(parseVCard(
  'BEGIN:VCARD\r\nVERSION:3.0\r\nN:כהן;משה;;;\r\nFN:משה כהן\r\nitem1.TEL;type=pref:+972 54-555-1234\r\nPHOTO;ENCODING=b;TYPE=JPEG:/9j/4AAQSk\r\n ZJRgABAQ\r\nEND:VCARD\r\nBEGIN:VCARD\r\nVERSION:3.0\r\nN:;;;;\r\nORG:פיצה שמש;\r\nTEL;type=WORK:03-1234567\r\nEND:VCARD\r\n')),
  [['משה כהן', '972545551234'], ['פיצה שמש', '97231234567']]);

console.log(failed ? `\n${failed} FAILED` : '\nAll contact-file tests passed');
process.exit(failed ? 1 : 0);
