const MODES = {
  work: { duration: 25 * 60, label: "집중" },
  shortBreak: { duration: 5 * 60, label: "휴식" },
  longBreak: { duration: 15 * 60, label: "긴 휴식" },
};

const SESSIONS_BEFORE_LONG_BREAK = 4;
const DIAL_CX = 140;
const DIAL_CY = 140;
const DIAL_R = 118;
const WEDGE_R = 108;
const MINI_CIRCUMFERENCE = 2 * Math.PI * 18;

const CATEGORIES = [
  { id: "work", label: "업무", color: "#3b82f6" },
  { id: "study", label: "공부", color: "#8b5cf6" },
  { id: "life", label: "생활", color: "#22c55e" },
  { id: "personal", label: "개인", color: "#f59e0b" },
];

const state = {
  mode: "work",
  timeLeft: MODES.work.duration,
  isRunning: false,
  sessionsCompleted: 0,
  selectedTodoId: null,
  todos: [],
  filter: "all",
  intervalId: null,
};

const els = {
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
};

function loadTodos() {
  try {
    const saved = localStorage.getItem("focusflow-todos");
    if (saved) {
      state.todos = JSON.parse(saved).map((t) => ({
        starred: false,
        category: "work",
        ...t,
      }));
    }
  } catch {
    state.todos = [];
  }

  const savedSelected = localStorage.getItem("focusflow-selected");
  if (savedSelected && state.todos.some((t) => t.id === savedSelected)) {
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
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
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
  els.timerLabel.textContent = MODES[state.mode].label;
  els.sessionCount.textContent = `세션 ${state.sessionsCompleted} / ${SESSIONS_BEFORE_LONG_BREAK}`;
  updateWedge();

  els.body.className = `mode-${state.mode}`;

  if (state.isRunning) {
    els.startBtn.classList.add("running");
    els.startBtnText.textContent = "일시정지";
  } else {
    els.startBtn.classList.remove("running");
    els.startBtnText.textContent = "시작";
  }

  updateCurrentTaskDisplay();
}

function updateCurrentTaskDisplay() {
  const selected = state.todos.find((t) => t.id === state.selectedTodoId);
  if (selected && !selected.completed) {
    els.currentTaskText.textContent = selected.text;
    els.currentTask.classList.add("active");
  } else {
    els.currentTaskText.textContent = "할 일을 선택하세요";
    els.currentTask.classList.remove("active");
    if (selected?.completed) state.selectedTodoId = null;
  }
}

function updateProgressMini() {
  const total = state.todos.length;
  const done = state.todos.filter((t) => t.completed).length;
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
      const todo = state.todos.find((t) => t.id === state.selectedTodoId);
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
  return CATEGORIES.find((c) => c.id === id)?.label || "업무";
}

function cycleCategory(id) {
  const todo = state.todos.find((t) => t.id === id);
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
  const todo = state.todos.find((t) => t.id === id);
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
  const todo = state.todos.find((t) => t.id === id);
  if (!todo) return;
  todo.starred = !todo.starred;
  saveTodos();
  renderTodos();
}

function deleteTodo(id) {
  state.todos = state.todos.filter((t) => t.id !== id);
  if (state.selectedTodoId === id) state.selectedTodoId = null;
  saveTodos();
  renderTodos();
  updateCurrentTaskDisplay();
}

function selectTodo(id) {
  const todo = state.todos.find((t) => t.id === id);
  if (!todo || todo.completed) return;

  state.selectedTodoId = state.selectedTodoId === id ? null : id;
  saveTodos();
  renderTodos();
  updateCurrentTaskDisplay();
}

function clearCompleted() {
  state.todos = state.todos.filter((t) => !t.completed);
  saveTodos();
  renderTodos();
}

function getFilteredTodos() {
  if (state.filter === "active") return state.todos.filter((t) => !t.completed);
  if (state.filter === "completed") return state.todos.filter((t) => t.completed);
  return state.todos;
}

function renderTodos() {
  const filtered = getFilteredTodos();
  els.todoList.innerHTML = "";

  filtered.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.dataset.category = todo.category || "work";
    if (todo.completed) li.classList.add("completed");
    if (todo.starred) li.classList.add("starred");
    if (todo.id === state.selectedTodoId) li.classList.add("selected");

    const check = document.createElement("button");
    check.className = `todo-check${todo.completed ? " checked" : ""}`;
    check.setAttribute("aria-label", `${todo.text} 완료 토글`);
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
    category.title = "카테고리 변경";
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
    starBtn.setAttribute("aria-label", "중요 표시");
    starBtn.textContent = todo.starred ? "★" : "☆";
    starBtn.addEventListener("click", () => toggleStar(todo.id));

    if (!todo.completed) {
      const selectBtn = document.createElement("button");
      selectBtn.className = `todo-btn select-btn${todo.id === state.selectedTodoId ? " active" : ""}`;
      selectBtn.setAttribute("aria-label", "현재 작업으로 선택");
      selectBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`;
      selectBtn.addEventListener("click", () => selectTodo(todo.id));
      actions.appendChild(selectBtn);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "todo-btn delete-btn";
    deleteBtn.setAttribute("aria-label", "삭제");
    deleteBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
    deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

    actions.prepend(starBtn);
    actions.appendChild(deleteBtn);

    li.append(check, content, actions);
    els.todoList.appendChild(li);
  });

  const remaining = state.todos.filter((t) => !t.completed).length;
  const completed = state.todos.filter((t) => t.completed).length;
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
  const today = new Date();
  const dateStr = formatDate(today);
  els.headerDate.textContent = dateStr;
  els.todoDate.textContent = today.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });

  buildDial();
  loadTodos();
  renderTodos();
  updateTimerUI();

  els.modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => setMode(tab.dataset.mode));
  });

  els.filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => setFilter(tab.dataset.filter));
  });

  els.startBtn.addEventListener("click", startTimer);
  els.resetBtn.addEventListener("click", resetTimer);

  els.todoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addTodo(els.todoInput.value);
    els.todoInput.value = "";
    els.todoInput.focus();
  });

  els.clearCompletedBtn.addEventListener("click", clearCompleted);
}

init();
