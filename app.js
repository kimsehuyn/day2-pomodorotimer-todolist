const SESSIONS_BEFORE_LONG_BREAK = 4;
const DIAL_CX = 140;
const DIAL_CY = 140;
const DIAL_R = 118;
const WEDGE_R = 108;
const MINI_CIRCUMFERENCE = 2 * Math.PI * 18;

const I18N = {
  ko: {
    tagline: "집중하고, 완료하세요",
    focus: "집중",
    shortBreak: "짧은 휴식",
    longBreak: "긴 휴식",
    breakLabel: "휴식",
    start: "시작",
    pause: "일시정지",
    reset: "초기화",
    session: "세션",
    currentTask: "현재 작업",
    selectTask: "할 일을 선택하세요",
    todayTodos: "오늘의 할 일",
    all: "전체",
    active: "진행중",
    completed: "완료",
    addTodo: "할 일을 추가하세요...",
    add: "추가",
    clearCompleted: "완료 항목 삭제",
    footer: "25분 집중 · 5분 휴식 · 4세션 후 15분 긴 휴식",
    emptyTodos: "할 일이 없습니다 ✨",
    catWork: "업무",
    catStudy: "공부",
    catLife: "생활",
    catPersonal: "개인",
    changeCategory: "카테고리 변경",
    starTodo: "중요 표시",
    selectAsCurrent: "현재 작업으로 선택",
    deleteTodo: "삭제",
    toggleComplete: "완료 토글",
    timerSection: "포모도로 타이머",
    todoSection: "할 일 목록",
    startTimer: "타이머 시작",
    resetTimer: "타이머 초기화",
    newTodo: "새 할 일",
    addTodoBtn: "할 일 추가",
    switchLang: "Switch to English",
    toggleTheme: "테마 전환",
    themeToLight: "라이트 모드로 전환",
    themeToDark: "다크 모드로 전환",
  },
  en: {
    tagline: "Focus deeply, finish fully",
    focus: "Focus",
    shortBreak: "Short Break",
    longBreak: "Long Break",
    breakLabel: "Break",
    start: "Start",
    pause: "Pause",
    reset: "Reset",
    session: "Session",
    currentTask: "Current task",
    selectTask: "Select a task",
    todayTodos: "Today's tasks",
    all: "All",
    active: "Active",
    completed: "Done",
    addTodo: "Add a new task...",
    add: "Add",
    clearCompleted: "Clear completed",
    footer: "25m focus · 5m break · 15m long break after 4 sessions",
    emptyTodos: "No tasks yet ✨",
    catWork: "Work",
    catStudy: "Study",
    catLife: "Life",
    catPersonal: "Personal",
    changeCategory: "Change category",
    starTodo: "Star task",
    selectAsCurrent: "Select as current task",
    deleteTodo: "Delete",
    toggleComplete: "Toggle complete",
    timerSection: "Pomodoro timer",
    todoSection: "Todo list",
    startTimer: "Start timer",
    resetTimer: "Reset timer",
    newTodo: "New task",
    addTodoBtn: "Add task",
    switchLang: "한국어로 전환",
    toggleTheme: "Toggle theme",
    themeToLight: "Switch to light mode",
    themeToDark: "Switch to dark mode",
  },
};

const MODE_KEYS = {
  work: "focus",
  shortBreak: "breakLabel",
  longBreak: "longBreak",
};

const CATEGORY_KEYS = {
  work: "catWork",
  study: "catStudy",
  life: "catLife",
  personal: "catPersonal",
};

const CATEGORIES = [
  { id: "work", color: "#9aa8d4" },
  { id: "study", color: "#c4a8d4" },
  { id: "life", color: "#a8c9b5" },
  { id: "personal", color: "#e8c4a0" },
];

const MODES = {
  work: { duration: 25 * 60 },
  shortBreak: { duration: 5 * 60 },
  longBreak: { duration: 15 * 60 },
};

const state = {
  mode: "work",
  timeLeft: MODES.work.duration,
  isRunning: false,
  sessionsCompleted: 0,
  selectedTodoId: null,
  todos: [],
  filter: "all",
  intervalId: null,
  lang: "ko",
  theme: "light",
};

const els = {
  html: document.documentElement,
  body: document.body,
  headerDate: document.getElementById("headerDate"),
  todoDate: document.getElementById("todoDate"),
  timerDisplay: document.getElementById("timerDisplay"),
  timerLabel: document.getElementById("timerLabel"),
  sessionCount: document.getElementById("sessionCount"),
  timeWedge: document.getElementById("timeWedge"),
  analogFrame: document.querySelector(".analog-frame"),
  startBtn: document.getElementById("startBtn"),
  startBtnText: document.getElementById("startBtnText"),
  resetBtn: document.getElementById("resetBtn"),
  modeTabs: document.querySelectorAll(".mode-tab"),
  currentTask: document.getElementById("currentTask"),
  currentTaskText: document.getElementById("currentTaskText"),
  todoForm: document.getElementById("todoForm"),
  todoInput: document.getElementById("todoInput"),
  todoList: document.getElementById("todoList"),
  todoFooter: document.getElementById("todoFooter"),
  clearCompletedBtn: document.getElementById("clearCompletedBtn"),
  filterTabs: document.querySelectorAll(".filter-tab"),
  progressMiniFill: document.getElementById("progressMiniFill"),
  progressMiniText: document.getElementById("progressMiniText"),
  dialTicks: document.getElementById("dialTicks"),
  dialNumbers: document.getElementById("dialNumbers"),
  langBtn: document.getElementById("langBtn"),
  langBtnText: document.getElementById("langBtnText"),
  themeBtn: document.getElementById("themeBtn"),
  themeBtnIcon: document.getElementById("themeBtnIcon"),
};

function t(key) {
  return I18N[state.lang][key] ?? I18N.ko[key] ?? key;
}

function localeTag() {
  return state.lang === "en" ? "en-US" : "ko-KR";
}

function loadPrefs() {
  const savedLang = localStorage.getItem("focusflow-lang");
  state.lang = savedLang === "en" ? "en" : "ko";

  const savedTheme = localStorage.getItem("focusflow-theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    state.theme = savedTheme;
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    state.theme = "dark";
  } else {
    state.theme = "light";
  }
}

function applyTheme() {
  els.html.dataset.theme = state.theme;
  localStorage.setItem("focusflow-theme", state.theme);
  els.themeBtnIcon.textContent = state.theme === "dark" ? "☀️" : "🌙";
  els.themeBtn.setAttribute(
    "aria-label",
    state.theme === "dark" ? t("themeToLight") : t("themeToDark")
  );
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
}

function applyLanguage() {
  els.html.lang = state.lang;
  localStorage.setItem("focusflow-lang", state.lang);

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });

  els.todoList.dataset.empty = t("emptyTodos");
  els.langBtnText.textContent = state.lang === "ko" ? "EN" : "KO";
  els.langBtn.setAttribute("aria-label", t("switchLang"));
  els.themeBtn.setAttribute(
    "aria-label",
    state.theme === "dark" ? t("themeToLight") : t("themeToDark")
  );

  updateDates();
  updateTimerUI();
  renderTodos();
}

function toggleLanguage() {
  state.lang = state.lang === "ko" ? "en" : "ko";
  applyLanguage();
}

function loadTodos() {
  try {
    const saved = localStorage.getItem("focusflow-todos");
    if (saved) {
      state.todos = JSON.parse(saved).map((item) => ({
        starred: false,
        category: "work",
        ...item,
      }));
    }
  } catch {
    state.todos = [];
  }

  const savedSelected = localStorage.getItem("focusflow-selected");
  if (savedSelected && state.todos.some((item) => item.id === savedSelected)) {
    state.selectedTodoId = savedSelected;
  }
}

function saveTodos() {
  localStorage.setItem("focusflow-todos", JSON.stringify(state.todos));
  if (state.selectedTodoId) {
    localStorage.setItem("focusflow-selected", state.selectedTodoId);
  } else {
    localStorage.removeItem("focusflow-selected");
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDate(date) {
  return date.toLocaleDateString(localeTag(), {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function updateDates() {
  const today = new Date();
  els.headerDate.textContent = formatDate(today);
  els.todoDate.textContent = today.toLocaleDateString(localeTag(), {
    month: "long",
    day: "numeric",
  });
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeWedge(cx, cy, r, minutes) {
  if (minutes <= 0) return "";
  const sweep = Math.min((minutes / 60) * 360, 359.99);
  const start = polarToCartesian(cx, cy, r, 0);
  const end = polarToCartesian(cx, cy, r, sweep);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function buildDial() {
  els.dialTicks.innerHTML = "";
  els.dialNumbers.innerHTML = "";

  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * 360;
    const isMajor = i % 5 === 0;
    const innerR = isMajor ? DIAL_R - 14 : DIAL_R - 8;
    const outerR = DIAL_R - 2;
    const p1 = polarToCartesian(DIAL_CX, DIAL_CY, innerR, angle);
    const p2 = polarToCartesian(DIAL_CX, DIAL_CY, outerR, angle);

    const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
    tick.setAttribute("x1", p1.x);
    tick.setAttribute("y1", p1.y);
    tick.setAttribute("x2", p2.x);
    tick.setAttribute("y2", p2.y);
    tick.setAttribute("class", `dial-tick ${isMajor ? "major" : "minor"}`);
    els.dialTicks.appendChild(tick);
  }

  for (let m = 0; m <= 55; m += 5) {
    const angle = (m / 60) * 360;
    const numR = DIAL_R - 28;
    const pos = polarToCartesian(DIAL_CX, DIAL_CY, numR, angle);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", pos.x);
    text.setAttribute("y", pos.y);
    text.setAttribute("class", "dial-number");
    text.textContent = m;
    els.dialNumbers.appendChild(text);
  }
}

function updateWedge() {
  const minutesLeft = state.timeLeft / 60;
  els.timeWedge.setAttribute("d", describeWedge(DIAL_CX, DIAL_CY, WEDGE_R, minutesLeft));
}

function updateTimerUI() {
  els.timerDisplay.textContent = formatTime(state.timeLeft);
  els.timerDisplay.setAttribute("datetime", `PT${state.timeLeft}S`);
  els.timerLabel.textContent = t(MODE_KEYS[state.mode]);
  els.sessionCount.textContent = `${t("session")} ${state.sessionsCompleted} / ${SESSIONS_BEFORE_LONG_BREAK}`;
  updateWedge();

  els.body.className = `mode-${state.mode}`;

  if (state.isRunning) {
    els.startBtn.classList.add("running");
    els.startBtnText.textContent = t("pause");
  } else {
    els.startBtn.classList.remove("running");
    els.startBtnText.textContent = t("start");
  }

  updateCurrentTaskDisplay();
}

function updateCurrentTaskDisplay() {
  const selected = state.todos.find((item) => item.id === state.selectedTodoId);
  if (selected && !selected.completed) {
    els.currentTaskText.textContent = selected.text;
    els.currentTask.classList.add("active");
  } else {
    els.currentTaskText.textContent = t("selectTask");
    els.currentTask.classList.remove("active");
    if (selected?.completed) state.selectedTodoId = null;
  }
}

function updateProgressMini() {
  const total = state.todos.length;
  const done = state.todos.filter((item) => item.completed).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const offset = MINI_CIRCUMFERENCE * (1 - pct / 100);

  els.progressMiniFill.style.strokeDasharray = MINI_CIRCUMFERENCE;
  els.progressMiniFill.style.strokeDashoffset = offset;
  els.progressMiniText.textContent = `${pct}%`;
}

function setMode(mode) {
  if (state.isRunning) return;
  state.mode = mode;
  state.timeLeft = MODES[mode].duration;

  els.modeTabs.forEach((tab) => {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", isActive);
  });

  updateTimerUI();
}

function startTimer() {
  if (state.isRunning) {
    pauseTimer();
    return;
  }

  state.isRunning = true;
  updateTimerUI();

  state.intervalId = setInterval(() => {
    state.timeLeft--;
    if (state.timeLeft <= 0) onTimerComplete();
    updateTimerUI();
  }, 1000);
}

function pauseTimer() {
  state.isRunning = false;
  clearInterval(state.intervalId);
  state.intervalId = null;
  updateTimerUI();
}

function resetTimer() {
  pauseTimer();
  state.timeLeft = MODES[state.mode].duration;
  els.analogFrame.classList.remove("complete");
  updateTimerUI();
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
      osc.start(start);
      osc.stop(start + duration);
    };
    playTone(523.25, ctx.currentTime, 0.15);
    playTone(659.25, ctx.currentTime + 0.2, 0.15);
    playTone(783.99, ctx.currentTime + 0.4, 0.3);
  } catch {
    /* audio not available */
  }
}

function onTimerComplete() {
  pauseTimer();
  playNotificationSound();
  els.analogFrame.classList.add("complete");

  if (state.mode === "work") {
    if (state.selectedTodoId) {
      const todo = state.todos.find((item) => item.id === state.selectedTodoId);
      if (todo) {
        todo.pomodoros = (todo.pomodoros || 0) + 1;
        saveTodos();
        renderTodos();
      }
    }

    state.sessionsCompleted++;
    if (state.sessionsCompleted >= SESSIONS_BEFORE_LONG_BREAK) {
      setMode("longBreak");
      state.sessionsCompleted = 0;
    } else {
      setMode("shortBreak");
    }
  } else {
    setMode("work");
  }

  state.timeLeft = MODES[state.mode].duration;
  updateTimerUI();
}

function getCategoryLabel(id) {
  return t(CATEGORY_KEYS[id] || "catWork");
}

function cycleCategory(id) {
  const todo = state.todos.find((item) => item.id === id);
  if (!todo) return;
  const idx = CATEGORIES.findIndex((c) => c.id === (todo.category || "work"));
  todo.category = CATEGORIES[(idx + 1) % CATEGORIES.length].id;
  saveTodos();
  renderTodos();
}

function addTodo(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  state.todos.unshift({
    id: generateId(),
    text: trimmed,
    completed: false,
    starred: false,
    category: "work",
    pomodoros: 0,
    createdAt: Date.now(),
  });

  saveTodos();
  renderTodos();
}

function toggleTodo(id) {
  const todo = state.todos.find((item) => item.id === id);
  if (!todo) return;

  todo.completed = !todo.completed;
  if (todo.completed && state.selectedTodoId === id) {
    state.selectedTodoId = null;
  }

  saveTodos();
  renderTodos();
  updateCurrentTaskDisplay();
}

function toggleStar(id) {
  const todo = state.todos.find((item) => item.id === id);
  if (!todo) return;
  todo.starred = !todo.starred;
  saveTodos();
  renderTodos();
}

function deleteTodo(id) {
  state.todos = state.todos.filter((item) => item.id !== id);
  if (state.selectedTodoId === id) state.selectedTodoId = null;
  saveTodos();
  renderTodos();
  updateCurrentTaskDisplay();
}

function selectTodo(id) {
  const todo = state.todos.find((item) => item.id === id);
  if (!todo || todo.completed) return;

  state.selectedTodoId = state.selectedTodoId === id ? null : id;
  saveTodos();
  renderTodos();
  updateCurrentTaskDisplay();
}

function clearCompleted() {
  state.todos = state.todos.filter((item) => !item.completed);
  saveTodos();
  renderTodos();
}

function getFilteredTodos() {
  if (state.filter === "active") return state.todos.filter((item) => !item.completed);
  if (state.filter === "completed") return state.todos.filter((item) => item.completed);
  return state.todos;
}

function renderTodos() {
  const filtered = getFilteredTodos();
  els.todoList.innerHTML = "";
  els.todoList.dataset.empty = t("emptyTodos");

  filtered.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.dataset.category = todo.category || "work";
    if (todo.completed) li.classList.add("completed");
    if (todo.starred) li.classList.add("starred");
    if (todo.id === state.selectedTodoId) li.classList.add("selected");

    const check = document.createElement("button");
    check.className = `todo-check${todo.completed ? " checked" : ""}`;
    check.setAttribute("aria-label", `${todo.text} ${t("toggleComplete")}`);
    check.addEventListener("click", () => toggleTodo(todo.id));

    const content = document.createElement("div");
    content.className = "todo-content";

    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = todo.text;
    text.addEventListener("click", () => {
      if (!todo.completed) selectTodo(todo.id);
    });

    const meta = document.createElement("div");
    meta.className = "todo-meta";

    const category = document.createElement("button");
    category.className = "todo-category";
    category.textContent = getCategoryLabel(todo.category);
    category.title = t("changeCategory");
    category.addEventListener("click", (e) => {
      e.stopPropagation();
      cycleCategory(todo.id);
    });

    const pomodoros = document.createElement("span");
    pomodoros.className = "todo-pomodoros";
    pomodoros.textContent = `🍅 ${todo.pomodoros || 0}`;

    meta.append(category, pomodoros);
    content.append(text, meta);

    const actions = document.createElement("div");
    actions.className = "todo-actions";

    const starBtn = document.createElement("button");
    starBtn.className = `todo-btn star-btn${todo.starred ? " active" : ""}`;
    starBtn.setAttribute("aria-label", t("starTodo"));
    starBtn.textContent = todo.starred ? "★" : "☆";
    starBtn.addEventListener("click", () => toggleStar(todo.id));

    if (!todo.completed) {
      const selectBtn = document.createElement("button");
      selectBtn.className = `todo-btn select-btn${todo.id === state.selectedTodoId ? " active" : ""}`;
      selectBtn.setAttribute("aria-label", t("selectAsCurrent"));
      selectBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`;
      selectBtn.addEventListener("click", () => selectTodo(todo.id));
      actions.appendChild(selectBtn);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "todo-btn delete-btn";
    deleteBtn.setAttribute("aria-label", t("deleteTodo"));
    deleteBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
    deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

    actions.prepend(starBtn);
    actions.appendChild(deleteBtn);

    li.append(check, content, actions);
    els.todoList.appendChild(li);
  });

  const completed = state.todos.filter((item) => item.completed).length;
  els.todoFooter.hidden = completed === 0;

  updateProgressMini();
}

function setFilter(filter) {
  state.filter = filter;
  els.filterTabs.forEach((tab) => {
    const isActive = tab.dataset.filter === filter;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", isActive);
  });
  renderTodos();
}

function init() {
  loadPrefs();
  applyTheme();
  buildDial();
  loadTodos();
  applyLanguage();

  els.modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => setMode(tab.dataset.mode));
  });

  els.filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => setFilter(tab.dataset.filter));
  });

  els.startBtn.addEventListener("click", startTimer);
  els.resetBtn.addEventListener("click", resetTimer);
  els.langBtn.addEventListener("click", toggleLanguage);
  els.themeBtn.addEventListener("click", toggleTheme);

  els.todoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addTodo(els.todoInput.value);
    els.todoInput.value = "";
    els.todoInput.focus();
  });

  els.clearCompletedBtn.addEventListener("click", clearCompleted);
}

init();
