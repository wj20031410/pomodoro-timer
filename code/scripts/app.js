/* ===================================
   Pomodoro - 主应用脚本
   =================================== */

const STORAGE_KEY = 'pomodoro-data-v1';

const state = {
  mode: 'focus',
  status: 'idle',
  focusDuration: 25,
  breakDuration: 5,
  dailyGoal: 6,
  remainingSeconds: 25 * 60,
  completedPomodoros: 0,
  todayDate: new Date().toDateString(),
  weekData: [0, 0, 0, 0, 0, 0, 0]
};

let timerInterval = null;

function saveData() {
  const data = {
    focusDuration: state.focusDuration,
    breakDuration: state.breakDuration,
    dailyGoal: state.dailyGoal,
    completedPomodoros: state.completedPomodoros,
    todayDate: new Date().toDateString(),
    weekData: state.weekData
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.todayDate === new Date().toDateString()) {
        return data;
      }
      return data;
    } catch (e) {
      console.error('Failed to parse saved data:', e);
    }
  }
  return null;
}

function initStateFromStorage() {
  const data = loadData();
  if (data) {
    state.focusDuration = data.focusDuration;
    state.breakDuration = data.breakDuration;
    state.dailyGoal = data.dailyGoal;

    if (data.todayDate === new Date().toDateString()) {
      state.completedPomodoros = data.completedPomodoros;
      state.todayDate = data.todayDate;
      state.weekData = data.weekData || [0, 0, 0, 0, 0, 0, 0];
    } else {
      state.completedPomodoros = 0;
      state.todayDate = new Date().toDateString();
      state.weekData = updateWeekData(data.weekData || [0, 0, 0, 0, 0, 0, 0]);
    }
  }
  state.remainingSeconds = state.mode === 'focus'
    ? state.focusDuration * 60
    : state.breakDuration * 60;
}

function updateWeekData(weekData) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const newWeekData = weekData.slice(0, 7);
  while (newWeekData.length < 7) {
    newWeekData.push(0);
  }

  const savedData = loadData();
  if (savedData && savedData.todayDate) {
    const savedDate = new Date(savedData.todayDate);
    if (savedDate.toDateString() === today.toDateString()) {
      return savedData.weekData || newWeekData;
    }
  }

  newWeekData[todayIndex] = 0;
  return newWeekData;
}

let audioContext = null;

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playBeep(frequency = 800, duration = 0.3) {
  if (!audioContext) initAudio();

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

function playCompletionSound() {
  playBeep(800, 0.2);
  setTimeout(() => playBeep(800, 0.2), 300);
  setTimeout(() => playBeep(1200, 0.4), 600);
}

function startTimer() {
  if (state.status === 'running') return;

  initAudio();

  state.status = 'running';
  timerInterval = setInterval(tick, 1000);
  updateUI();
}

function pauseTimer() {
  if (state.status !== 'running') return;

  state.status = 'paused';
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  updateUI();
}

function resetTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  state.status = 'idle';
  state.remainingSeconds = state.mode === 'focus'
    ? state.focusDuration * 60
    : state.breakDuration * 60;
  updateUI();
}

function switchMode(mode) {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  state.mode = mode;
  state.status = 'idle';
  state.remainingSeconds = mode === 'focus'
    ? state.focusDuration * 60
    : state.breakDuration * 60;
  updateUI();
}

function tick() {
  if (state.remainingSeconds > 0) {
    state.remainingSeconds--;
    updateTimerDisplay();
  } else {
    playCompletionSound();

    if (state.mode === 'focus') {
      state.completedPomodoros++;
      updateWeekPomodoros();
      saveData();
    }

    const newMode = state.mode === 'focus' ? 'break' : 'focus';
    switchMode(newMode);
  }
}

function updateWeekPomodoros() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  state.weekData[todayIndex] = state.completedPomodoros;
}

function updateUI() {
  updateTimerDisplay();
  updateProgressRing();
  updateButtonStates();
  updateCompletedInfo();
}

function updateTimerDisplay() {
  const minutes = Math.floor(state.remainingSeconds / 60);
  const seconds = state.remainingSeconds % 60;
  const timerText = document.getElementById('timer-text');

  if (timerText) {
    timerText.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}

function updateProgressRing() {
  const ringProgress = document.getElementById('ring-progress');
  if (!ringProgress) return;

  const totalSeconds = state.mode === 'focus'
    ? state.focusDuration * 60
    : state.breakDuration * 60;
  const progress = state.remainingSeconds / totalSeconds;

  const circumference = 2 * Math.PI * 90;
  const offset = circumference * progress;

  ringProgress.style.strokeDashoffset = offset;

  if (state.mode === 'break') {
    ringProgress.classList.add('break');
  } else {
    ringProgress.classList.remove('break');
  }
}

function updateButtonStates() {
  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');
  const modeLabel = document.getElementById('mode-label');

  if (btnStart && btnPause && modeLabel) {
    if (state.status === 'running') {
      btnStart.style.display = 'none';
      btnPause.style.display = 'inline-block';
    } else {
      btnStart.style.display = 'inline-block';
      btnPause.style.display = 'none';
    }

    modeLabel.textContent = state.mode === 'focus' ? '专注' : '休息';
  }
}

function updateCompletedInfo() {
  const completedInfo = document.getElementById('completed-info');
  const todayCount = document.getElementById('today-count');
  const progressFill = document.getElementById('progress-fill');
  const progressLabel = document.getElementById('progress-label');
  const todayBadge = document.getElementById('today-badge');

  if (completedInfo) {
    completedInfo.textContent = `已完成 ${state.completedPomodoros} 个番茄`;
  }

  if (todayCount) {
    todayCount.innerHTML = `${state.completedPomodoros} <span>个番茄钟</span>`;
  }

  if (progressFill) {
    const progress = Math.min((state.completedPomodoros / state.dailyGoal) * 100, 100);
    progressFill.style.width = `${progress}%`;
  }

  if (progressLabel) {
    progressLabel.textContent = `目标 ${state.dailyGoal} 个`;
  }

  if (todayBadge) {
    todayBadge.textContent = `${state.completedPomodoros}/${state.dailyGoal}`;
  }

  refreshWeekChart();
}

function switchView(viewName) {
  const timerView = document.getElementById('timer-view');
  const settingsView = document.getElementById('settings-view');
  const navBtns = document.querySelectorAll('.nav-item');

  if (timerView && settingsView) {
    if (viewName === 'timer') {
      timerView.classList.add('active');
      settingsView.classList.remove('active');
    } else {
      timerView.classList.remove('active');
      settingsView.classList.add('active');
      renderSettingsView();
    }
  }

  navBtns.forEach(btn => {
    if (btn.dataset.view === viewName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function renderSettingsView() {
  const focusInput = document.getElementById('focus-duration');
  const breakInput = document.getElementById('break-duration');
  const goalInput = document.getElementById('daily-goal');

  if (focusInput) focusInput.value = state.focusDuration;
  if (breakInput) breakInput.value = state.breakDuration;
  if (goalInput) goalInput.value = state.dailyGoal;
}

function saveSettings() {
  const focusInput = document.getElementById('focus-duration');
  const breakInput = document.getElementById('break-duration');
  const goalInput = document.getElementById('daily-goal');
  const statusEl = document.getElementById('save-status');

  const focusDuration = parseInt(focusInput.value);
  const breakDuration = parseInt(breakInput.value);
  const dailyGoal = parseInt(goalInput.value);

  if (isNaN(focusDuration) || focusDuration < 1 || focusDuration > 180) {
    showSaveStatus('专注时长需在 1-180 分钟之间', 'error');
    return;
  }

  if (isNaN(breakDuration) || breakDuration < 1 || breakDuration > 60) {
    showSaveStatus('休息时长需在 1-60 分钟之间', 'error');
    return;
  }

  if (isNaN(dailyGoal) || dailyGoal < 1 || dailyGoal > 24) {
    showSaveStatus('每日目标需在 1-24 个之间', 'error');
    return;
  }

  state.focusDuration = focusDuration;
  state.breakDuration = breakDuration;
  state.dailyGoal = dailyGoal;

  if (state.status === 'idle') {
    state.remainingSeconds = state.mode === 'focus'
      ? state.focusDuration * 60
      : state.breakDuration * 60;
    updateTimerDisplay();
    updateProgressRing();
  }

  saveData();
  showSaveStatus('已保存', 'success');
  updateCompletedInfo();
}

function showSaveStatus(message, type) {
  const statusEl = document.getElementById('save-status');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `save-status ${type}`;

    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'save-status';
    }, 2000);
  }
}

function exportData() {
  const data = {
    focusDuration: state.focusDuration,
    breakDuration: state.breakDuration,
    dailyGoal: state.dailyGoal,
    completedPomodoros: state.completedPomodoros,
    weekData: state.weekData,
    exportedAt: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `pomodoro-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();

  URL.revokeObjectURL(url);
  showSaveStatus('已导出', 'success');
}

function importData(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);

      if (!data.focusDuration || !data.breakDuration) {
        throw new Error('Invalid data format');
      }

      state.focusDuration = data.focusDuration;
      state.breakDuration = data.breakDuration;
      state.dailyGoal = data.dailyGoal || 6;
      state.completedPomodoros = data.completedPomodoros || 0;
      state.weekData = data.weekData || [0, 0, 0, 0, 0, 0, 0];

      if (state.status === 'idle') {
        state.remainingSeconds = state.mode === 'focus'
          ? state.focusDuration * 60
          : state.breakDuration * 60;
      }

      saveData();
      renderSettingsView();
      updateUI();
      showSaveStatus('已导入', 'success');
    } catch (err) {
      showSaveStatus('导入失败：文件格式错误', 'error');
    }
  };

  reader.onerror = () => {
    showSaveStatus('导入失败：无法读取文件', 'error');
  };

  reader.readAsText(file);
}

function bindEvents() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    });
  });

  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');
  const btnReset = document.getElementById('btn-reset');

  if (btnStart) btnStart.addEventListener('click', startTimer);
  if (btnPause) btnPause.addEventListener('click', pauseTimer);
  if (btnReset) btnReset.addEventListener('click', resetTimer);

  const btnSave = document.getElementById('btn-save');
  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');
  const importFile = document.getElementById('import-file');

  if (btnSave) btnSave.addEventListener('click', saveSettings);
  if (btnExport) btnExport.addEventListener('click', exportData);
  if (btnImport) btnImport.addEventListener('click', () => importFile.click());

  if (importFile) {
    importFile.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        importData(e.target.files[0]);
        e.target.value = '';
      }
    });
  }

  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('touchstart', () => btn.style.transform = 'scale(0.98)');
    btn.addEventListener('touchend', () => btn.style.transform = 'scale(1)');
  });
}

let weekChart = null;

function initWeekChart() {
  const canvas = document.getElementById('week-chart');
  if (!canvas) return;

  const container = canvas.parentElement;
  canvas.width = container.clientWidth || 300;
  canvas.height = 140;

  weekChart = { canvas, ctx: canvas.getContext('2d') };

  drawWeekChart();
  updateWeekTotal();
}

function drawWeekChart() {
  if (!weekChart) return;

  const { canvas, ctx } = weekChart;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const data = state.weekData;
  const barWidth = 28;
  const gap = 8;
  const startX = 20;
  const paddingBottom = 30;
  const maxHeight = canvas.height - paddingBottom - 20;

  const maxValue = Math.max(...data, 1);

  const today = new Date();
  const dayOfWeek = today.getDay();
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const labels = ['一', '二', '三', '四', '五', '六', '日'];

  data.forEach((value, index) => {
    const x = startX + index * (barWidth + gap);
    const height = (value / maxValue) * maxHeight;
    const y = maxHeight - height + 10;

    const isToday = index === todayIndex;

    ctx.fillStyle = isToday ? '#ff9500' : 'rgba(0, 0, 0, 0.1)';
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, height, 4);
    ctx.fill();

    ctx.fillStyle = isToday ? '#ff9500' : '#86868b';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(value, x + barWidth / 2, y - 5);

    ctx.fillStyle = isToday ? '#1d1d1f' : '#86868b';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText(labels[index], x + barWidth / 2, canvas.height - 8);
  });
}

function updateWeekTotal() {
  const totalEl = document.getElementById('week-total');
  if (totalEl) {
    const total = state.weekData.reduce((sum, val) => sum + val, 0);
    totalEl.textContent = `本周 ${total} 个`;
  }
}

function refreshWeekChart() {
  drawWeekChart();
  updateWeekTotal();
}

function init() {
  initStateFromStorage();
  bindEvents();
  updateUI();
  initWeekChart();
  switchView('timer');
}

document.addEventListener('DOMContentLoaded', init);