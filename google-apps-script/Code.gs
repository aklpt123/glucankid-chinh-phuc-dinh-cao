/**
 * Glucankid – Chinh Phục Đỉnh Cao
 * Backend lưu người chơi & bảng xếp hạng vào Google Sheet.
 *
 * Cách dùng: xem HUONG-DAN-GOOGLE-SHEET.md ở thư mục gốc repo.
 *  1. Mở Google Sheet → Tiện ích mở rộng → Apps Script, dán toàn bộ file này.
 *  2. Chạy hàm setup() một lần (bổ sung cột phụ cho Contact_Info, tạo bảng xếp hạng ở tab Point).
 *  3. Triển khai → Web app (Execute as: Me, Who has access: Anyone).
 *
 * Luật lượt chơi: mỗi SĐT chỉ được VỀ ĐÍCH 1 lần. SĐT đã đăng ký nhưng chưa về đích
 * (đóng tab giữa chừng, đổi máy…) được đăng ký lại và chơi lại từ đầu, dùng chung một dòng.
 */

const SHEET_PLAYERS = 'Contact_Info';
const SHEET_RANK = 'Point';

// Cột A–F giữ đúng như Sheet hiện có; G–K là cột phụ do script bổ sung.
const HEADERS = [
  'STT',                    // A
  'User-name',              // B
  'SĐT',                    // C
  'Độ tuổi con(Chọn)',      // D
  'Điểm game',              // E – số câu đúng, để trống khi chưa về đích
  'Thời gian chơi',         // F – giây
  'Thời gian đăng ký',      // G
  'Thời gian hoàn thành',   // H – để trống = chưa về đích
  'Chi tiết đáp án',        // I
  'Tổng số câu',            // J
  'Mã phiên (không sửa)'    // K – ẩn
];
const COL = { STT: 1, NAME: 2, PHONE: 3, AGE: 4, SCORE: 5, DURATION: 6, REG: 7, DONE_AT: 8, DETAIL: 9, TOTAL: 10, TOKEN: 11 };
const NUM_COLS = HEADERS.length;

const ALLOWED_AGES = ['Dưới 1 tuổi', 'Từ 1 đến dưới 3 tuổi', 'Từ 3 đến 6 tuổi', 'Trên 6 tuổi'];
const LEADERBOARD_SIZE = 10;
const LEADERBOARD_CACHE_KEY = 'leaderboard_v2';
const LEADERBOARD_CACHE_SEC = 30;

/* ------------------------------------------------------------------ */
/* SETUP – chạy tay một lần trong trình soạn Apps Script               */
/* ------------------------------------------------------------------ */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Contact_Info: giữ nguyên tiêu đề A–F có sẵn, chỉ điền những ô tiêu đề còn trống.
  let players = ss.getSheetByName(SHEET_PLAYERS);
  if (!players) players = ss.insertSheet(SHEET_PLAYERS);
  if (players.getMaxColumns() < NUM_COLS) {
    players.insertColumnsAfter(players.getMaxColumns(), NUM_COLS - players.getMaxColumns());
  }
  const headerRange = players.getRange(1, 1, 1, NUM_COLS);
  const current = headerRange.getValues()[0];
  headerRange.setValues([HEADERS.map(function (h, i) { return current[i] !== '' ? current[i] : h; })]);
  headerRange.setFontWeight('bold');
  players.setFrozenRows(1);
  players.getRange('C:C').setNumberFormat('@');                 // giữ số 0 đầu SĐT
  players.getRange('G:H').setNumberFormat('dd/MM/yyyy HH:mm:ss');
  players.hideColumns(COL.TOKEN);

  // Point: bảng xếp hạng tự động, cùng cột với bảng xếp hạng trong game
  // (Hạng · Nhà leo núi · SĐT · Điểm "5/6" · Thời gian "mm:ss"). Không ghi đè nếu tab đang có dữ liệu nhập tay.
  let rank = ss.getSheetByName(SHEET_RANK);
  if (!rank) rank = ss.insertSheet(SHEET_RANK);
  const hasManualData = rank.getLastRow() > 1 && !rank.getRange('A2').getFormula();
  if (hasManualData) {
    throw new Error('Tab ' + SHEET_RANK + ' đang có dữ liệu nhập tay. Hãy xoá dữ liệu từ dòng 2 trở xuống rồi chạy lại setup().');
  }
  rank.clear();
  rank.getRange(1, 1, 1, 5)
    .setValues([['Hạng', 'Nhà leo núi', 'SĐT', 'Điểm', 'Thời gian']])
    .setFontWeight('bold');
  rank.setFrozenRows(1);
  // Chỉ lấy người đã về đích (có Thời gian hoàn thành, cột H). Xếp giống game:
  // nhiều câu đúng hơn (E) đứng trước; cùng điểm thì chơi nhanh hơn (F); vẫn bằng thì về đích sớm hơn (H).
  const src = SHEET_PLAYERS + '!';
  rank.getRange('A2').setFormula(
    '=IFERROR(LET(s, SORT(FILTER(' + src + 'A2:K, ' + src + 'H2:H<>""), 5, FALSE, 6, TRUE, 8, TRUE), ' +
    'HSTACK(SEQUENCE(ROWS(s)), INDEX(s,,2), INDEX(s,,3), INDEX(s,,5)&"/"&INDEX(s,,10), TEXT(INDEX(s,,6)/86400, "[mm]:ss"))), "")'
  );
  rank.getRange('C:C').setNumberFormat('@');
}

/* ------------------------------------------------------------------ */
/* HTTP ENDPOINTS                                                     */
/* ------------------------------------------------------------------ */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  try {
    if (action === 'leaderboard') return json_({ ok: true, rows: getLeaderboard_() });
    return json_({ ok: true, service: 'glucankid-minigame' });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'SERVER_ERROR' });
  }
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'BAD_JSON' });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json_({ ok: false, error: 'BUSY' });
  }
  try {
    if (body.action === 'register') return json_(register_(body));
    if (body.action === 'finish') return json_(finish_(body));
    return json_({ ok: false, error: 'UNKNOWN_ACTION' });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'SERVER_ERROR' });
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ */
/* ACTIONS                                                            */
/* ------------------------------------------------------------------ */
function register_(body) {
  const name = cleanText_(body.name, 60);
  const phone = normPhone_(body.phone);
  const age = String(body.age || '');

  if (name.length < 2) return { ok: false, error: 'INVALID_NAME' };
  if (!/^0(3|5|7|8|9)\d{8}$/.test(phone)) return { ok: false, error: 'INVALID_PHONE' };
  if (ALLOWED_AGES.indexOf(age) === -1) return { ok: false, error: 'INVALID_AGE' };

  const sheet = playersSheet_();
  const token = Utilities.getUuid();
  const now = new Date();
  const row = findRowByPhone_(sheet, phone);

  if (row !== -1) {
    const values = sheet.getRange(row, 1, 1, NUM_COLS).getValues()[0];
    if (isFinished_(values)) return { ok: false, error: 'DUPLICATE' };
    // Chưa về đích: cho chơi lại trên cùng dòng, phiên cũ (nếu còn mở ở máy khác) hết hiệu lực.
    sheet.getRange(row, COL.NAME).setValue(safeCell_(name));
    sheet.getRange(row, COL.AGE).setValue(age);
    sheet.getRange(row, COL.SCORE, 1, NUM_COLS - COL.SCORE + 1)
      .setValues([['', '', now, '', '', '', token]]);
    return { ok: true, token: token, replay: true };
  }

  const newRow = sheet.getLastRow() + 1;
  sheet.appendRow([newRow - 1, safeCell_(name), phone, age, '', '', now, '', '', '', token]);
  sheet.getRange(newRow, COL.PHONE).setNumberFormat('@').setValue(phone);
  return { ok: true, token: token };
}

function finish_(body) {
  const phone = normPhone_(body.phone);
  const token = String(body.token || '');
  const sheet = playersSheet_();
  const row = findRowByPhone_(sheet, phone);
  if (row === -1) return { ok: false, error: 'NOT_FOUND' };

  const values = sheet.getRange(row, 1, 1, NUM_COLS).getValues()[0];
  if (isFinished_(values)) return { ok: true, alreadyFinished: true };
  if (!token || values[COL.TOKEN - 1] !== token) return { ok: false, error: 'BAD_TOKEN' };

  const answers = Array.isArray(body.answers) ? body.answers.slice(0, 50) : [];
  const total = toInt_(body.total);
  const score = answers.filter(function (a) { return a && a.isCorrect === true; }).length;
  if (total < 1 || total > 50 || answers.length !== total) return { ok: false, error: 'INVALID_RESULT' };

  // Thời gian chơi do trình duyệt đo; không cho vượt quá thời gian thực kể từ lúc đăng ký.
  const now = new Date();
  const regAt = values[COL.REG - 1] instanceof Date ? values[COL.REG - 1] : now;
  const wallSec = Math.max(1, Math.round((now.getTime() - regAt.getTime()) / 1000));
  const durationSec = Math.min(Math.max(1, toInt_(body.durationSec)), wallSec);

  const detail = answers.map(function (a, i) {
    return 'Câu ' + (i + 1) + ' (' + cleanText_(a.questionId, 20) + '): ' + (a.isCorrect ? 'Đúng' : 'Sai');
  }).join(' | ');

  sheet.getRange(row, COL.SCORE, 1, 2).setValues([[score, durationSec]]);
  sheet.getRange(row, COL.DONE_AT, 1, 3).setValues([[now, detail, total]]);
  CacheService.getScriptCache().remove(LEADERBOARD_CACHE_KEY);
  return { ok: true, score: score, total: total, durationSec: durationSec };
}

function getLeaderboard_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(LEADERBOARD_CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const sheet = playersSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const data = sheet.getRange(2, 1, last - 1, NUM_COLS).getValues();

  const rows = data
    .filter(isFinished_)
    .map(function (r) {
      return {
        name: String(r[COL.NAME - 1]).replace(/^'/, ''),
        phone: maskPhone_(normPhone_(r[COL.PHONE - 1])),
        score: toInt_(r[COL.SCORE - 1]),
        total: toInt_(r[COL.TOTAL - 1]) || 6,
        durationSec: toInt_(r[COL.DURATION - 1]),
        doneAt: r[COL.DONE_AT - 1].getTime()
      };
    })
    .sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (a.durationSec !== b.durationSec) return a.durationSec - b.durationSec;
      return a.doneAt - b.doneAt;
    })
    .slice(0, LEADERBOARD_SIZE)
    .map(function (r) { delete r.doneAt; return r; });

  cache.put(LEADERBOARD_CACHE_KEY, JSON.stringify(rows), LEADERBOARD_CACHE_SEC);
  return rows;
}

/* ------------------------------------------------------------------ */
/* HELPERS                                                            */
/* ------------------------------------------------------------------ */
function playersSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PLAYERS);
  if (!sheet) throw new Error('Không thấy tab ' + SHEET_PLAYERS + ' – hãy chạy hàm setup() trước.');
  return sheet;
}

// Đã về đích = có "Thời gian hoàn thành"
function isFinished_(rowValues) {
  return rowValues[COL.DONE_AT - 1] instanceof Date;
}

function findRowByPhone_(sheet, phone) {
  const last = sheet.getLastRow();
  if (last < 2) return -1;
  const phones = sheet.getRange(2, COL.PHONE, last - 1, 1).getValues();
  for (let i = 0; i < phones.length; i++) {
    if (normPhone_(phones[i][0]) === phone) return i + 2;
  }
  return -1;
}

function normPhone_(raw) {
  let p = String(raw == null ? '' : raw).replace(/[^\d+]/g, '');
  p = p.replace(/^\+?84/, '0');
  if (/^[35789]\d{8}$/.test(p)) p = '0' + p; // Sheet lỡ đổi thành số và mất số 0 đầu
  return p;
}

function maskPhone_(p) {
  return p.length < 7 ? p : p.slice(0, 3) + '***' + p.slice(-4);
}

function cleanText_(v, maxLen) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

// Chặn chèn công thức vào Sheet (tên bắt đầu bằng = + - @)
function safeCell_(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function toInt_(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
