import { useEffect, useRef, useState } from 'react';

/** Wall-clock deadlines keep the timer accurate when a browser tab is throttled. */
export function useFocusTimer(duration: number) {
  const [remaining, setRemaining] = useState(duration);
  const [running, setRunning] = useState(false);
  const deadline = useRef(0);
  useEffect(() => {
    if (!running) return;
    const update = () => {
      const next = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0) setRunning(false);
    };
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [running]);
  const toggle = () => {
    if (running) setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
    else deadline.current = Date.now() + remaining * 1000;
    setRunning((value) => !value);
  };
  const reset = () => {
    setRunning(false);
    setRemaining(duration);
  };
  return { remaining, running, toggle, reset, complete: remaining === 0 };
}
