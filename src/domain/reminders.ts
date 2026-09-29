import type { AppData } from './schema';
export function learningReminders(data: AppData, now = new Date()) {
  const arabic = data.settings.language === 'ar';
  const result: { id: string; title: string; text: string; to: string; action: string }[] = [];
  for (const n of data.notebooks)
    if (now.getTime() >= Date.parse(n.createdAt) + 4 * 86400000)
      result.push({
        id: `notebook-${n.id}`,
        title: arabic ? `هل أنت مستعد لمراجعة ${n.subject}؟` : `Ready to revisit ${n.subject}?`,
        text: arabic
          ? `حان وقت مراجعة ${n.title} بعد أربعة أيام. أنشئ اختبارًا وادرسه وتحدّ صديقًا!`
          : `Time for a four-day review of ${n.title}. Make a quiz, study it, and challenge a friend!`,
        to: `/interact?notebook=${n.id}`,
        action: 'Create a quiz',
      });
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  for (const e of data.exams) {
    const days = Math.round((Date.parse(e.date + 'T00:00:00Z') - today) / 86400000);
    if (days >= 0 && days <= e.reminderDays)
      result.push({
        id: `exam-${e.id}-${e.date}`,
        title: arabic
          ? days === 0
            ? `${e.title} اليوم. أنت لها!`
            : `${e.title} بعد ${days} يوم.`
          : days === 0
            ? `${e.title} is today. You've got this!`
            : `${e.title} is in ${days} day${days === 1 ? '' : 's'}.`,
        text: arabic
          ? `القليل من التدريب في ${e.subject} يصنع فرقًا. استكشف الأفكار وادعُ صديقًا للدراسة.`
          : `A little ${e.subject} practice goes a long way. Explore ideas and invite a friend to study.`,
        to: `/search?q=${encodeURIComponent(e.subject)}`,
        action: 'Explore exam subject',
      });
  }
  return result.filter((r) => !data.dismissedReminders.includes(r.id));
}
