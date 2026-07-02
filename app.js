const STORAGE_KEY = 'vstavaiDimaData.v1';
const today = new Date();
const defaultPhrases = [
  'Рита сказала: сначала сядь, потом уже думай, как тяжело жить.',
  'Вставай, мой сонный инженер. Я в тебя верю.',
  'Ты не обязан быть бодрым. Просто встань.',
  'Рита уже мысленно смотрит строго, но с любовью.',
  'Не отключай звонок. Она правда старается тебя разбудить.',
  'Сегодня надо не победить жизнь, а просто подняться с кровати.',
  'Горжусь тобой заранее. Теперь ноги на пол.',
];

let state = loadState();
let viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = toDateKey(today);
let editingId = null;

const els = {
  todayLabel: document.getElementById('todayLabel'),
  heroTitle: document.getElementById('heroTitle'),
  heroText: document.getElementById('heroText'),
  awakeBtn: document.getElementById('awakeBtn'),
  fiveMinBtn: document.getElementById('fiveMinBtn'),
  hardBtn: document.getElementById('hardBtn'),
  callRitaLink: document.getElementById('callRitaLink'),
  writeRitaLink: document.getElementById('writeRitaLink'),
  nextWakeTitle: document.getElementById('nextWakeTitle'),
  nextWakeDetails: document.getElementById('nextWakeDetails'),
  markDoneBtn: document.getElementById('markDoneBtn'),
  streakCount: document.getElementById('streakCount'),
  wakeCount: document.getElementById('wakeCount'),
  monthTitle: document.getElementById('monthTitle'),
  calendarGrid: document.getElementById('calendarGrid'),
  selectedDateTitle: document.getElementById('selectedDateTitle'),
  eventsList: document.getElementById('eventsList'),
  prevMonth: document.getElementById('prevMonth'),
  nextMonth: document.getElementById('nextMonth'),
  addEventBtn: document.getElementById('addEventBtn'),
  eventDialog: document.getElementById('eventDialog'),
  eventForm: document.getElementById('eventForm'),
  closeDialog: document.getElementById('closeDialog'),
  dialogTitle: document.getElementById('dialogTitle'),
  deleteEventBtn: document.getElementById('deleteEventBtn'),
  eventId: document.getElementById('eventId'),
  eventTitle: document.getElementById('eventTitle'),
  eventDate: document.getElementById('eventDate'),
  eventTime: document.getElementById('eventTime'),
  wakeTime: document.getElementById('wakeTime'),
  repeatRule: document.getElementById('repeatRule'),
  eventNote: document.getElementById('eventNote'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsDialog: document.getElementById('settingsDialog'),
  closeSettings: document.getElementById('closeSettings'),
  settingsForm: document.getElementById('settingsForm'),
  ritaPhone: document.getElementById('ritaPhone'),
  ritaChat: document.getElementById('ritaChat'),
  ritaPhrases: document.getElementById('ritaPhrases'),
  exportBtn: document.getElementById('exportBtn'),
  importFile: document.getElementById('importFile'),
  eventTemplate: document.getElementById('eventTemplate'),
};

init();

function init() {
  registerServiceWorker();
  bindEvents();
  renderAll();
}

function bindEvents() {
  els.prevMonth.addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() - 1);
    renderCalendar();
  });

  els.nextMonth.addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() + 1);
    renderCalendar();
  });

  els.addEventBtn.addEventListener('click', () => openEventDialog());
  els.closeDialog.addEventListener('click', () => els.eventDialog.close());
  els.eventForm.addEventListener('submit', saveEventFromForm);
  els.deleteEventBtn.addEventListener('click', deleteEditingEvent);

  els.settingsBtn.addEventListener('click', openSettings);
  els.closeSettings.addEventListener('click', () => els.settingsDialog.close());
  els.settingsForm.addEventListener('submit', saveSettings);
  els.exportBtn.addEventListener('click', exportData);
  els.importFile.addEventListener('change', importData);

  els.awakeBtn.addEventListener('click', () => markAwake('awake'));
  els.markDoneBtn.addEventListener('click', () => markAwake('done'));
  els.fiveMinBtn.addEventListener('click', fiveMoreMinutes);
  els.hardBtn.addEventListener('click', hardWakeMode);

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.scroll) || document.querySelector('.' + btn.dataset.scroll);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderAll() {
  renderHero();
  renderNextWake();
  renderCalendar();
  renderEventsForSelectedDate();
  renderStats();
  renderContacts();
}

function renderHero() {
  const now = new Date();
  const phrases = state.settings.phrases?.length ? state.settings.phrases : defaultPhrases;
  const phrase = phrases[Math.abs(dayOfYear(now)) % phrases.length];
  els.todayLabel.textContent = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

  const next = getUpcomingEvents()[0];
  if (next && toDateKey(next.wakeDateTime) === toDateKey(now)) {
    els.heroTitle.textContent = 'Сегодня подъём';
    els.heroText.textContent = `${phrase} Подъём в ${next.wakeTime}, событие “${next.title}” в ${next.time}.`;
  } else {
    els.heroTitle.textContent = 'Доброе утро, Дима';
    els.heroText.textContent = phrase;
  }
}

function renderNextWake() {
  const next = getUpcomingEvents()[0];
  if (!next) {
    els.nextWakeTitle.textContent = 'Пока нет событий';
    els.nextWakeDetails.textContent = 'Добавь событие в календарь, и здесь появится время, когда нужно встать.';
    els.markDoneBtn.disabled = true;
    els.markDoneBtn.style.opacity = 0.4;
    return;
  }

  els.markDoneBtn.disabled = false;
  els.markDoneBtn.style.opacity = 1;
  const dateText = next.dateObj.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  els.nextWakeTitle.textContent = `${next.wakeTime} — ${next.title}`;
  els.nextWakeDetails.textContent = `${dateText}. Событие в ${next.time}. ${next.note || 'После звонка Риты главное — не лечь обратно.'}`;
}

function renderStats() {
  els.streakCount.textContent = getStreak();
  els.wakeCount.textContent = state.awakeLog.length;
}

function renderContacts() {
  const phone = state.settings.ritaPhone?.trim();
  const chat = state.settings.ritaChat?.trim();
  els.callRitaLink.href = phone ? `tel:${phone}` : '#';
  els.writeRitaLink.href = chat || (phone ? `sms:${phone}` : '#');
}

function renderCalendar() {
  els.calendarGrid.innerHTML = '';
  els.monthTitle.textContent = viewDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const start = new Date(firstDay);
  const mondayIndex = (firstDay.getDay() + 6) % 7;
  start.setDate(firstDay.getDate() - mondayIndex);

  for (let i = 0; i < 42; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = toDateKey(date);
    const dayEvents = getEventsForDate(date);
    const btn = document.createElement('button');
    btn.className = 'day-cell';
    if (date.getMonth() !== viewDate.getMonth()) btn.classList.add('outside');
    if (key === toDateKey(today)) btn.classList.add('today');
    if (key === selectedDate) btn.classList.add('selected');
    btn.innerHTML = `<span>${date.getDate()}</span><div class="dots">${dayEvents.slice(0, 3).map(() => '<span class="dot"></span>').join('')}</div>`;
    btn.addEventListener('click', () => {
      selectedDate = key;
      renderCalendar();
      renderEventsForSelectedDate();
    });
    els.calendarGrid.appendChild(btn);
  }
}

function renderEventsForSelectedDate() {
  const date = fromDateKey(selectedDate);
  els.selectedDateTitle.textContent = date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  const events = getEventsForDate(date).sort((a, b) => a.wakeTime.localeCompare(b.wakeTime));
  els.eventsList.innerHTML = '';

  if (!events.length) {
    els.eventsList.innerHTML = '<div class="empty-state">На этот день пока ничего нет. Добавь событие и время подъёма.</div>';
    return;
  }

  events.forEach(event => {
    const node = els.eventTemplate.content.cloneNode(true);
    node.querySelector('.wake-time').textContent = event.wakeTime;
    node.querySelector('.event-time').textContent = `событие ${event.time}`;
    node.querySelector('h3').textContent = event.title;
    node.querySelector('p').textContent = event.note || 'Рита позвонит, а приложение напомнит не лечь обратно.';
    node.querySelector('.edit-event').addEventListener('click', () => openEventDialog(event.id));
    els.eventsList.appendChild(node);
  });
}

function openEventDialog(id = null) {
  editingId = id;
  const event = id ? state.events.find(e => e.id === id) : null;
  els.dialogTitle.textContent = event ? 'Изменить событие' : 'Новое событие';
  els.deleteEventBtn.style.display = event ? 'inline-flex' : 'none';

  els.eventId.value = event?.id || '';
  els.eventTitle.value = event?.title || '';
  els.eventDate.value = event?.date || selectedDate;
  els.eventTime.value = event?.time || '09:00';
  els.wakeTime.value = event?.wakeTime || '07:30';
  els.repeatRule.value = event?.repeat || 'none';
  els.eventNote.value = event?.note || '';

  els.eventDialog.showModal();
}

function saveEventFromForm(event) {
  event.preventDefault();
  const payload = {
    id: els.eventId.value || crypto.randomUUID(),
    title: els.eventTitle.value.trim(),
    date: els.eventDate.value,
    time: els.eventTime.value,
    wakeTime: els.wakeTime.value,
    repeat: els.repeatRule.value,
    note: els.eventNote.value.trim(),
    createdAt: new Date().toISOString(),
  };

  if (!payload.title || !payload.date || !payload.time || !payload.wakeTime) return;

  const idx = state.events.findIndex(e => e.id === payload.id);
  if (idx >= 0) state.events[idx] = { ...state.events[idx], ...payload };
  else state.events.push(payload);

  saveState();
  els.eventDialog.close();
  renderAll();
}

function deleteEditingEvent() {
  if (!editingId) return;
  state.events = state.events.filter(e => e.id !== editingId);
  saveState();
  els.eventDialog.close();
  renderAll();
}

function openSettings() {
  els.ritaPhone.value = state.settings.ritaPhone || '';
  els.ritaChat.value = state.settings.ritaChat || '';
  els.ritaPhrases.value = (state.settings.phrases?.length ? state.settings.phrases : defaultPhrases).join('\n');
  els.settingsDialog.showModal();
}

function saveSettings(event) {
  event.preventDefault();
  state.settings.ritaPhone = els.ritaPhone.value.trim();
  state.settings.ritaChat = els.ritaChat.value.trim();
  state.settings.phrases = els.ritaPhrases.value.split('\n').map(x => x.trim()).filter(Boolean);
  saveState();
  els.settingsDialog.close();
  renderAll();
}

function markAwake(source) {
  const key = toDateKey(new Date());
  if (!state.awakeLog.includes(key)) state.awakeLog.push(key);
  state.lastAction = { source, at: new Date().toISOString() };
  saveState();
  els.heroTitle.textContent = 'Умница. Ты встал';
  els.heroText.textContent = 'Теперь вода → умыться → написать Рите. И не возвращаться под одеяло.';
  renderStats();
}

function fiveMoreMinutes() {
  state.snoozeCount = (state.snoozeCount || 0) + 1;
  saveState();
  if (state.snoozeCount >= 3) {
    els.heroTitle.textContent = 'Дима, пора вставать';
    els.heroText.textContent = 'Рита тебя любит, но сейчас ты реально можешь всё проспать. Сядь на кровати на 10 секунд.';
  } else {
    els.heroTitle.textContent = 'Ладно, 5 минут';
    els.heroText.textContent = 'Но только один маленький шаг: открой глаза и не переворачивайся лицом в подушку.';
  }
}

function hardWakeMode() {
  els.heroTitle.textContent = 'Не надо сразу весь день';
  els.heroText.textContent = 'Только 3 шага: сесть → ноги на пол → написать Рите “я жив”. Всё остальное потом.';
}

function getUpcomingEvents() {
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(now.getDate() + 60);
  const expanded = [];

  state.events.forEach(event => {
    const base = fromDateKey(event.date);
    if (event.repeat === 'none') {
      expanded.push(expandEvent(event, base));
      return;
    }

    const cursor = new Date(base);
    while (cursor <= horizon) {
      if (cursor >= startOfDay(now)) expanded.push(expandEvent(event, cursor));
      if (event.repeat === 'daily') cursor.setDate(cursor.getDate() + 1);
      else cursor.setDate(cursor.getDate() + 7);
    }
  });

  return expanded
    .filter(e => e.wakeDateTime >= new Date(now.getTime() - 1000 * 60 * 60 * 4))
    .sort((a, b) => a.wakeDateTime - b.wakeDateTime);
}

function getEventsForDate(date) {
  const key = toDateKey(date);
  return state.events.filter(event => {
    if (event.repeat === 'none') return event.date === key;
    const start = fromDateKey(event.date);
    if (date < startOfDay(start)) return false;
    if (event.repeat === 'daily') return true;
    if (event.repeat === 'weekly') return start.getDay() === date.getDay();
    return false;
  });
}

function expandEvent(event, dateObj) {
  const [wakeH, wakeM] = event.wakeTime.split(':').map(Number);
  const wakeDateTime = new Date(dateObj);
  wakeDateTime.setHours(wakeH, wakeM, 0, 0);
  return { ...event, dateObj: new Date(dateObj), wakeDateTime };
}

function getStreak() {
  const log = new Set(state.awakeLog);
  let streak = 0;
  const cursor = new Date();
  while (log.has(toDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vstavai-dima-data.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.events)) throw new Error('bad file');
      state = {
        events: data.events || [],
        awakeLog: data.awakeLog || [],
        snoozeCount: data.snoozeCount || 0,
        settings: { ...defaultState().settings, ...(data.settings || {}) },
      };
      saveState();
      renderAll();
      els.settingsDialog.close();
    } catch {
      alert('Не получилось импортировать файл. Проверь, что это экспорт из приложения.');
    }
  };
  reader.readAsText(file);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      events: parsed.events || [],
      awakeLog: parsed.awakeLog || [],
      snoozeCount: parsed.snoozeCount || 0,
      settings: { ...defaultState().settings, ...(parsed.settings || {}) },
    };
  } catch {
    return defaultState();
  }
}

function defaultState() {
  return {
    events: [],
    awakeLog: [],
    snoozeCount: 0,
    settings: {
      ritaPhone: '',
      ritaChat: '',
      phrases: defaultPhrases,
    },
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toDateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
