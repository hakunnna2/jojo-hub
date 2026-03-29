import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SlidersHorizontal,
  Calendar, 
  Trash2,
  Plus,
  X,
  Bell,
  Activity,
  Cpu,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { SUBJECTS } from './constants';
import { TimerMode, Exam } from './types';
import { storage } from './storage';

const supportsBrowserNotifications = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

const sendBrowserNotification = (title: string, body: string) => {
  if (!supportsBrowserNotifications()) return;

  if (Notification.permission !== 'granted') return;
  const notification = new Notification(title, { body, tag: 'jojo-study-hub' });
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
};

const formatClock = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const PiPOverlay = () => {
  const [pipState, setPipState] = useState(() =>
    storage.getItem('timer-pip-state', {
      timeLeft: 25 * 60,
      mode: 'pomodoro',
      isActive: false,
      selectedSubject: 'Self Study',
      completedFocusCount: 0,
    }),
  );

  useEffect(() => {
    const sync = () => {
      setPipState(
        storage.getItem('timer-pip-state', {
          timeLeft: 25 * 60,
          mode: 'pomodoro',
          isActive: false,
          selectedSubject: 'Self Study',
          completedFocusCount: 0,
        }),
      );
    };

    sync();
    const interval = setInterval(sync, 1000);
    return () => clearInterval(interval);
  }, []);

  const modeLabel =
    pipState.mode === 'pomodoro' ? 'Focus' : pipState.mode === 'shortBreak' ? 'Short Break' : 'Long Break';
  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });

  const openMainAndClosePiP = async () => {
    if (window.opener && !window.opener.closed) {
      window.opener.focus();
    }
    window.close();
  };

  const sendPiPCommand = (action: 'start' | 'pause') => {
    storage.setItem('timer-pip-command', {
      id: Date.now(),
      action,
    });
  };

  return (
    <div
      onClick={openMainAndClosePiP}
      className="h-screen w-screen p-3 bg-[linear-gradient(180deg,rgba(32,32,34,0.92),rgba(15,15,16,0.95))] text-white border border-white/10 rounded-2xl flex flex-col justify-between cursor-pointer shadow-[0_20px_45px_rgba(0,0,0,0.45)]"
      style={{ fontFamily: 'Segoe UI, Inter, sans-serif' }}
    >
      <div className="flex items-center justify-between drag-region">
        <span className="text-[10px] uppercase tracking-[0.22em] text-white/65">Picture in Picture</span>
        <span className="text-[10px] text-white/65">{dateLabel}</span>
      </div>

      <div className="text-center mt-1">
        <p className="text-[11px] text-white/60 tracking-[0.12em] uppercase">{modeLabel}</p>
        <p className="text-[56px] leading-none mt-1 font-light tracking-wide">{formatClock(pipState.timeLeft)}</p>
        <p className="text-[11px] mt-1 text-white/65">{pipState.selectedSubject}</p>
      </div>

      <div className="flex items-center justify-between text-[10px] text-white/60">
        <span>{pipState.isActive ? 'Running' : 'Paused'}</span>
        <span>Cycles {pipState.completedFocusCount}</span>
      </div>

      <div className="mt-2 flex items-center justify-center gap-2 no-drag" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => sendPiPCommand('start')}
          className="px-3 py-1 rounded-full border border-white/25 text-white text-[10px] uppercase tracking-[0.12em] hover:bg-white/10 transition-colors"
        >
          Start
        </button>
        <button
          onClick={() => sendPiPCommand('pause')}
          className="px-3 py-1 rounded-full border border-white/25 text-white text-[10px] uppercase tracking-[0.12em] hover:bg-white/10 transition-colors"
        >
          Pause
        </button>
      </div>
    </div>
  );
};

// --- Components ---

const PomodoroTimer = ({ 
  subjects,
  selectedSubject,
  onSubjectChange
}: { 
  subjects: string[],
  selectedSubject: string,
  onSubjectChange: (subject: string) => void
}) => {
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [completedFocusCount, setCompletedFocusCount] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sentEncouragementMarks, setSentEncouragementMarks] = useState<number[]>([]);
  const [durations, setDurations] = useState({
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15,
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPiPCommandRef = useRef<number>(0);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  const settings = {
    pomodoro: durations.pomodoro * 60,
    shortBreak: durations.shortBreak * 60,
    longBreak: durations.longBreak * 60,
  };

  const updateDuration = (targetMode: TimerMode, value: string) => {
    const next = parseInt(value, 10);
    if (Number.isNaN(next)) return;

    const clamped = Math.max(1, Math.min(targetMode === 'longBreak' ? 90 : 60, next));
    setDurations((prev) => ({ ...prev, [targetMode]: clamped }));
  };

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(settings[newMode]);
    setIsActive(false);
  };

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(settings[mode]);
    }
  }, [durations, mode]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      let nextMode: TimerMode = mode;
      let shouldAutoStart = false;

      if (mode === 'pomodoro') {
        const nextFocusCount = completedFocusCount + 1;
        const shouldTakeLongBreak = nextFocusCount % 4 === 0;
        nextMode = shouldTakeLongBreak ? 'longBreak' : 'shortBreak';
        shouldAutoStart = true;
        setCompletedFocusCount(nextFocusCount);

        toast.success('Focus session complete!', {
          icon: <Bell className="text-[var(--accent)]" />,
          description: `NEXT: ${nextMode === 'longBreak' ? 'LONG BREAK' : 'SHORT BREAK'}`,
          duration: 5500,
        });
        sendBrowserNotification(
          'Focus session complete',
          `Next: ${nextMode === 'longBreak' ? 'Long Break' : 'Short Break'}`,
        );
      } else {
        nextMode = 'pomodoro';
        shouldAutoStart = false;
        toast.info('Break is over!', {
          icon: <Bell className="text-blue-500" />,
          description: 'CLICK START TO BEGIN FOCUS',
          duration: 5000,
        });
        sendBrowserNotification('Break is over', 'Click start to begin focus session');
      }
      
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play blocked', e));
      }
      
      setMode(nextMode);
      setTimeLeft(settings[nextMode]);
      setIsActive(shouldAutoStart);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode, settings, completedFocusCount]);

  useEffect(() => {
    if (mode === 'pomodoro') {
      setSentEncouragementMarks([]);
    }
  }, [mode]);

  useEffect(() => {
    if (!isActive || mode !== 'pomodoro' || timeLeft <= 0) return;

    const totalFocusSeconds = settings.pomodoro;
    const elapsedMinutes = Math.floor((totalFocusSeconds - timeLeft) / 60);
    const encouragementMilestones = [5, 10, 15, 20];
    const milestone = encouragementMilestones.find(
      (minute) => minute <= elapsedMinutes && !sentEncouragementMarks.includes(minute),
    );

    if (!milestone) return;

    const messages: Record<number, string> = {
      5: 'allez JoJo !!',
      10: 'JoJo, Keep focus, no phone!!',
      15: 'You are in deep work mode. Keep pushing.',
      20: 'Final 5 min, keep going!!',
    };

    const message = messages[milestone] || 'Keep going. You are doing great.';
    toast.success(`Focus encouragement (${milestone} min)`, {
      description: `${selectedSubject.toUpperCase()}: ${message}`,
      icon: <Bell className="text-[var(--accent)]" />,
      duration: 4500,
    });
    sendBrowserNotification('Focus encouragement', `${selectedSubject}: ${message}`);
    setSentEncouragementMarks((prev) => [...prev, milestone]);
  }, [isActive, mode, timeLeft, settings, sentEncouragementMarks, selectedSubject]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(settings[mode]);
  };

  const formatTime = (seconds: number) => {
    return formatClock(seconds);
  };

  const progress = (timeLeft / settings[mode]) * 100;

  useEffect(() => {
    storage.setItem('timer-pip-state', {
      timeLeft,
      mode,
      isActive,
      selectedSubject,
      completedFocusCount,
      updatedAt: Date.now(),
    });
  }, [timeLeft, mode, isActive, selectedSubject, completedFocusCount]);

  useEffect(() => {
    const pollPiPCommands = () => {
      const command = storage.getItem<{ id: number; action: 'start' | 'pause' } | null>('timer-pip-command', null);
      if (!command || !command.id || command.id <= lastPiPCommandRef.current) return;

      lastPiPCommandRef.current = command.id;

      if (command.action === 'start') {
        setIsActive(true);
      } else if (command.action === 'pause') {
        setIsActive(false);
      }
    };

    const interval = setInterval(pollPiPCommands, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hardware-panel p-5 lg:p-6 h-full flex flex-col items-center justify-between relative overflow-hidden">
      {/* Decorative hardware elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-[var(--accent)] opacity-50" />
      <motion.div
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-black/35 mb-2"
      >
        <Cpu size={14} className="text-[var(--accent)]" />
        <span className="hardware-label text-[9px]">efforts..concentration w apprentissage</span>
      </motion.div>

      <div className="w-full mb-3 mt-4">
        <div className="hardware-label mb-2">Target Subject</div>
        <select 
          className="w-full bg-black/40 border border-[var(--border)] rounded-lg px-4 py-2 text-xs font-mono text-white focus:outline-none focus:border-[var(--accent)] appearance-none cursor-pointer"
          value={selectedSubject}
          onChange={(e) => onSubjectChange(e.target.value)}
        >
          <option value="Self Study">GENERAL_STUDY</option>
          {subjects.map(s => <option key={s} value={s}>{s.toUpperCase().replace(/\s/g, '_')}</option>)}
        </select>
      </div>

      <div className="w-full mb-3 flex items-center justify-between bg-black/30 border border-[var(--border)] rounded-lg px-3 py-2">
        <span className="hardware-label">Focus Cycles</span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-[var(--accent)]">{completedFocusCount}</span>
          <button
            onClick={() => setShowAdvanced((prev) => !prev)}
            className={`h-7 px-2 rounded border text-[9px] font-mono uppercase tracking-widest inline-flex items-center gap-1 transition-colors ${showAdvanced ? 'border-[var(--accent)] text-white' : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-white'}`}
          >
            <SlidersHorizontal size={12} />
            {showAdvanced ? 'Hide' : 'Tune'}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full mb-3 overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2 mb-2">
              {([
                { key: 'pomodoro', label: 'FOCUS' },
                { key: 'shortBreak', label: 'S_BREAK' },
                { key: 'longBreak', label: 'L_BREAK' },
              ] as { key: TimerMode; label: string }[]).map((item) => (
                <div key={item.key} className="bg-black/35 border border-[var(--border)] rounded-lg px-2 py-2">
                  <p className="hardware-label text-[8px] opacity-80 mb-1">{item.label}</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={item.key === 'longBreak' ? 90 : 60}
                      value={durations[item.key]}
                      onChange={(e) => updateDuration(item.key, e.target.value)}
                      className="w-full bg-black/40 border border-[var(--border)] rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-[var(--accent)]"
                    />
                    <span className="text-[8px] font-mono text-[var(--text-secondary)]">MIN</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-3 py-2 rounded border border-[var(--accent)]/60 bg-black/30 text-[9px] font-mono uppercase tracking-widest text-white text-center">
              AUTO_FLOW ON (FOCUS-BREAK LOOP)
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-1 mb-3 bg-black/40 p-1 rounded-lg border border-[var(--border)]">
        {(['pomodoro', 'shortBreak', 'longBreak'] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-widest transition-all ${
              mode === m ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            {m === 'pomodoro' ? 'FOCUS' : m === 'shortBreak' ? 'S_BREAK' : 'L_BREAK'}
          </button>
        ))}
      </div>

      <div className="relative w-40 h-40 lg:w-48 lg:h-48 flex items-center justify-center mb-4">
        <svg viewBox="0 0 224 224" className="absolute w-full h-full -rotate-90">
          <circle
            cx="112"
            cy="112"
            r="96"
            fill="transparent"
            stroke="var(--border)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <motion.circle
            cx="112"
            cy="112"
            r="96"
            fill="transparent"
            stroke="var(--accent)"
            strokeWidth="4"
            strokeDasharray={2 * Math.PI * 96}
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: (2 * Math.PI * 96) * (1 - progress / 100) }}
            transition={{ duration: 0.5 }}
          />
        </svg>
        <div className="text-4xl lg:text-5xl font-mono tracking-tighter text-[var(--accent)] drop-shadow-[0_0_10px_rgba(255,99,33,0.3)]">
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="flex gap-4 w-full">
        <button
          onClick={toggleTimer}
          className="flex-1 h-12 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-mono text-xs uppercase tracking-widest hover:brightness-110 transition-all active:scale-95"
        >
          {isActive ? <><Pause size={16} className="mr-2" /> Stop</> : <><Play size={16} className="mr-2" /> Start</>}
        </button>
        <button
          onClick={resetTimer}
          className="w-12 h-12 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] flex items-center justify-center hover:text-white transition-colors active:scale-95"
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
};

const ExamCalendar = ({ exams, onAddExam, onDeleteExam, leadTime, onLeadTimeChange }: {
  exams: Exam[],
  onAddExam: (exam: Omit<Exam, 'id'>) => void,
  onDeleteExam: (id: string) => void,
  leadTime: number,
  onLeadTimeChange: (minutes: number) => void
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newExam, setNewExam] = useState({
    subject: '',
    date: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExam.subject || !newExam.date) return;
    onAddExam(newExam);
    setNewExam({ subject: '', date: '', notes: '' });
    setIsAdding(false);
    toast.success('Exam registered in database');
  };

  const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="hardware-panel p-5 lg:p-6 h-full flex flex-col min-h-0">
      <motion.div
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-black/35 mb-4"
      >
        <Cpu size={14} className="text-[var(--accent)]" />
        <span className="hardware-label text-[9px]">efforts..concentration w apprentissage</span>
      </motion.div>
      <div className="flex items-center justify-end mb-6">
        <div className="flex gap-2">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded transition-colors ${showSettings ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}
          >
            <Bell size={14} />
          </button>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-[var(--accent)] text-white p-2 rounded hover:brightness-110 transition-all"
          >
            {isAdding ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        <AnimatePresence mode="wait">
          {showSettings ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-black/40 p-4 rounded-lg border border-[var(--border)] space-y-3"
            >
              <div className="hardware-label opacity-60">Notification Lead Time</div>
              <select 
                className="w-full bg-black/40 border border-[var(--border)] rounded px-3 py-2 text-[10px] font-mono text-white focus:outline-none focus:border-[var(--accent)]"
                value={leadTime}
                onChange={(e) => onLeadTimeChange(parseInt(e.target.value))}
              >
                <option value={30}>30_MIN</option>
                <option value={60}>01_HOUR</option>
                <option value={180}>03_HOURS</option>
                <option value={1440}>24_HOURS</option>
              </select>
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full bg-[var(--accent)] text-white py-2 rounded text-[10px] font-mono uppercase tracking-widest hover:brightness-110"
              >
                CONFIRM_SETTINGS
              </button>
            </motion.div>
          ) : isAdding ? (
            <motion.form 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSubmit}
              className="bg-black/40 p-4 rounded-lg border border-[var(--border)] space-y-3"
            >
              <select
                className="w-full bg-black/40 border border-[var(--border)] rounded px-3 py-2 text-[10px] font-mono text-white focus:outline-none focus:border-[var(--accent)]"
                value={newExam.subject}
                onChange={e => setNewExam({...newExam, subject: e.target.value})}
                required
              >
                <option value="">SELECT_SUBJECT</option>
                {SUBJECTS.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject.toUpperCase()}
                  </option>
                ))}
              </select>
              <input 
                type="date" 
                className="w-full bg-black/40 border border-[var(--border)] rounded px-3 py-2 text-[10px] font-mono text-white focus:outline-none focus:border-[var(--accent)]"
                value={newExam.date}
                onChange={e => setNewExam({...newExam, date: e.target.value})}
                required
              />
              <button 
                type="submit"
                className="w-full bg-[var(--accent)] text-white py-2 rounded text-[10px] font-mono uppercase tracking-widest hover:brightness-110"
              >
                REGISTER_EXAM
              </button>
            </motion.form>
          ) : sortedExams.length > 0 ? (
            <div className="space-y-2">
              {sortedExams.map((exam) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={exam.id}
                  className="bg-black/20 p-4 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition-all group relative"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-[10px] text-[var(--accent)]">
                      [{new Date(exam.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}]
                    </span>
                    <button 
                      onClick={() => onDeleteExam(exam.id)}
                      className="opacity-0 group-hover:opacity-100 text-[var(--text-secondary)] hover:text-red-500 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <h3 className="font-mono text-xs uppercase tracking-wider mb-1">{exam.subject}</h3>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)] opacity-20 py-12">
              <Calendar size={48} strokeWidth={1} />
              <p className="mt-2 font-mono text-[10px] uppercase tracking-widest">No_Data_Found</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const IntroMotivation = ({ onFinish }: { onFinish: () => void }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const STEP_INTERVAL_MS = 120;
    const STEP_VALUE = 2;

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + STEP_VALUE, 100));
    }, STEP_INTERVAL_MS);

    return () => clearInterval(progressInterval);
  }, [onFinish]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg)] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,99,33,0.2),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(255,99,33,0.12),transparent_40%)]" />

      <motion.div
        className="absolute w-72 h-72 rounded-full border border-[var(--accent)]/30"
        animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 w-full max-w-xl px-6 text-center">
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-black/35 mb-5"
        >
          <Cpu size={14} className="text-[var(--accent)]" />
          <span className="hardware-label text-[9px]">efforts..concentration w apprentissage</span>
        </motion.div>

        <motion.h2
          initial={{ y: 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-mono text-3xl md:text-4xl tracking-tight text-white mb-3"
        >
          JoJo, you can achieve great things.
        </motion.h2>

        <motion.p
          initial={{ y: 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-sm md:text-base text-[var(--text-secondary)] mb-7"
        >
          One session at a time. Breathe, focus, and move forward with confidence.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full h-2 rounded-full bg-black/50 border border-[var(--border)] overflow-hidden"
        >
          <motion.div
            className="h-full bg-[var(--accent)]"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut' }}
          />
        </motion.div>

        <div className="mt-2 hardware-label">Loading your study space... {progress}%</div>

        {progress >= 100 && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            onClick={onFinish}
            className="mt-6 px-4 py-2 rounded border border-[var(--border)] text-[10px] font-mono uppercase tracking-widest text-[var(--text-secondary)] hover:text-white hover:border-[var(--accent)] transition-colors"
          >
            Passer
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const isPipMode = typeof window !== 'undefined' && window.location.hash === '#pip';

  if (isPipMode) {
    return <PiPOverlay />;
  }

  const [showIntro, setShowIntro] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (!supportsBrowserNotifications()) return 'denied';
    return Notification.permission;
  });

  const [exams, setExams] = useState<Exam[]>(() => storage.getItem('exams', []));

  useEffect(() => {
    storage.setItem('exams', exams);
  }, [exams]);

  const [notifiedExams, setNotifiedExams] = useState<string[]>(() => storage.getItem('notified-exams', []));

  useEffect(() => {
    storage.setItem('notified-exams', notifiedExams);
  }, [notifiedExams]);

  const [notificationLeadTime, setNotificationLeadTime] = useState<number>(() => storage.getItem('notification-lead-time', 60));

  useEffect(() => {
    storage.setItem('notification-lead-time', notificationLeadTime);
  }, [notificationLeadTime]);

  const [activeSubject, setActiveSubject] = useState<string>('Self Study');
  const [isPiPOpen, setIsPiPOpen] = useState(false);
  const pipWindowRef = useRef<Window | null>(null);

  const togglePiP = async () => {
    if (isPiPOpen) {
      pipWindowRef.current?.close();
      pipWindowRef.current = null;
      setIsPiPOpen(false);
      return;
    }

    const pipUrl = `${window.location.href.split('#')[0]}#pip`;
    const popup = window.open(
      pipUrl,
      'jojo-study-pip',
      'width=300,height=230,resizable=yes,scrollbars=no,menubar=no,toolbar=no,status=no,location=no',
    );

    if (!popup) {
      toast.error('Popup blocked. Allow popups for this website to use Picture in Picture.');
      return;
    }

    pipWindowRef.current = popup;
    popup.focus();
    setIsPiPOpen(true);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (pipWindowRef.current && pipWindowRef.current.closed) {
        pipWindowRef.current = null;
        setIsPiPOpen(false);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      pipWindowRef.current?.close();
      pipWindowRef.current = null;
    };
  }, []);

  // Install prompt handler
  useEffect(() => {
    let deferredPrompt: any;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;

      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold text-white">Install Study Hub</p>
              <p className="text-sm text-white/70">Access your studies anytime, anywhere</p>
            </div>
            <button
              onClick={async () => {
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                  const { outcome } = await deferredPrompt.userChoice;
                  if (outcome === 'accepted') {
                    toast.success('App installed successfully!');
                  }
                  deferredPrompt = null;
                  toast.dismiss(t);
                }
              }}
              className="px-3 py-1.5 rounded bg-[var(--accent)] text-white text-sm font-mono uppercase tracking-widest hover:brightness-110 transition-all whitespace-nowrap"
            >
              Install
            </button>
          </div>
        ),
        {
          duration: 10000,
          position: 'top-center',
        }
      );
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Service worker update handler
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        toast(
          (t) => (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold text-white">Update Available</p>
                <p className="text-sm text-white/70">A new version of Study Hub is ready</p>
              </div>
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="px-3 py-1.5 rounded bg-[var(--accent)] text-white text-sm font-mono uppercase tracking-widest hover:brightness-110 transition-all whitespace-nowrap"
              >
                Reload
              </button>
            </div>
          ),
          {
            duration: 0,
            position: 'top-center',
          }
        );
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  const requestNotificationPermission = async () => {
    if (!supportsBrowserNotifications()) {
      toast.error('Desktop notifications are not supported in this browser.');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === 'granted') {
      toast.success('Desktop notifications enabled.');
      sendBrowserNotification('Notifications enabled', 'You will receive study and exam alerts.');
      return;
    }

    if (permission === 'denied') {
      toast.error('Notifications blocked. Enable them in browser settings.');
      return;
    }

    toast.info('Notification permission was dismissed.');
  };

  // Exam Notification Logic
  useEffect(() => {
    const checkExams = () => {
      const now = new Date().getTime();
      const leadTimeMs = notificationLeadTime * 60 * 1000;

      exams.forEach(exam => {
        if (notifiedExams.includes(exam.id)) return;

        const examDateTime = new Date(`${exam.date}T00:00`).getTime();
        const timeUntilExam = examDateTime - now;

        if (timeUntilExam > 0 && timeUntilExam <= leadTimeMs) {
          toast.info(`UPCOMING_EXAM: ${exam.subject}`, {
            description: `T-MINUS ${Math.round(timeUntilExam / (60 * 1000))} MIN`,
            icon: <Bell className="text-[var(--accent)]" />,
            duration: 10000,
          });
          sendBrowserNotification(
            `Upcoming exam: ${exam.subject}`,
            `${Math.round(timeUntilExam / (60 * 1000))} min left`,
          );
          setNotifiedExams(prev => [...prev, exam.id]);
        }
      });
    };

    const interval = setInterval(checkExams, 30000); // Check every 30 seconds
    checkExams(); // Initial check

    return () => clearInterval(interval);
  }, [exams, notifiedExams, notificationLeadTime]);

  const addExam = (examData: Omit<Exam, 'id'>) => {
    const newExam: Exam = {
      ...examData,
      id: Date.now().toString(),
    };
    setExams([...exams, newExam]);
  };

  const deleteExam = (id: string) => {
    setExams(exams.filter(e => e.id !== id));
  };

  if (showIntro) {
    return <IntroMotivation onFinish={() => setShowIntro(false)} />;
  }

  return (
    <div className="h-screen overflow-hidden relative selection:bg-[var(--accent)] selection:text-white">
      <Toaster 
        position="top-right" 
        theme="dark"
        richColors
        expand
        pauseWhenPageIsHidden
      />

      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-[var(--accent)] rounded flex items-center justify-center">
              <Cpu size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xs font-mono font-bold tracking-widest uppercase">JoJo STUDY HUB</h1>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] text-[var(--text-secondary)] font-mono uppercase tracking-widest">Core_Systems_Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <button
              onClick={togglePiP}
              className={`hidden md:inline-flex h-8 items-center gap-2 px-3 rounded border text-[9px] font-mono uppercase tracking-widest transition-colors ${isPiPOpen ? 'border-[var(--accent)] text-white bg-[var(--accent)]/20' : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-white'}`}
              title="Open/close Picture in Picture"
            >
              <Zap size={12} />
              {isPiPOpen ? 'Close PiP' : 'Open PiP'}
            </button>
            <button
              onClick={requestNotificationPermission}
              className={`hidden md:inline-flex h-8 items-center gap-2 px-3 rounded border text-[9px] font-mono uppercase tracking-widest transition-colors ${notificationPermission === 'granted' ? 'border-green-500 text-green-400' : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-white'}`}
              title="Enable desktop notifications"
            >
              <Bell size={12} />
              {notificationPermission === 'granted' ? 'Alerts On' : 'Enable Alerts'}
            </button>
            <div className="hidden md:flex flex-col items-end">
              <p className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-widest">Current_Cycle</p>
              <p className="text-xs font-mono font-bold">{new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' }).toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-widest">System_Clock</p>
              <p className="text-xs font-mono font-bold text-[var(--accent)]">{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto h-[calc(100vh-3rem)] p-4 lg:p-6 grid grid-cols-2 gap-4 lg:gap-6 items-stretch overflow-hidden">
        {/* Left Column: Timer */}
        <div className="flex flex-col min-h-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="h-full min-h-0"
          >
            <PomodoroTimer 
              subjects={SUBJECTS}
              selectedSubject={activeSubject}
              onSubjectChange={setActiveSubject}
            />
          </motion.div>
        </div>

        {/* Right Column: Schedule */}
        <div className="flex flex-col min-h-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <ExamCalendar 
              exams={exams} 
              onAddExam={addExam} 
              onDeleteExam={deleteExam} 
              leadTime={notificationLeadTime}
              onLeadTimeChange={setNotificationLeadTime}
            />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
