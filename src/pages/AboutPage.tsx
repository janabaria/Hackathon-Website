import { Link } from 'react-router-dom';
import { ArrowUpRight, Users, Lightbulb, Repeat2, Focus, Flame, CalendarDays } from 'lucide-react';
export function AboutPage() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <span className="eyebrow">BEYOND THE BOOK</span>
        <h1>
          Less scrolling past.
          <br />
          <em>More learning that lasts.</em>
        </h1>
        <p>
          A community equipped with tools to help you lock in, focus together, and turn curiosity
          into a daily habit.
        </p>
        <Link className="button primary" to="/">
          Find your next discovery <ArrowUpRight size={18} />
        </Link>
        <span className="about-orbit" aria-hidden="true">
          BTB
        </span>
      </section>
      <section>
        <span className="eyebrow">MODERN PROBLEMS</span>
        <h2>Sound familiar?</h2>
        <div className="about-grid">
          {[
            {
              Icon: Focus,
              title: 'No focus',
              text: 'So many tabs. So many distractions. So little space to think.',
            },
            {
              Icon: Flame,
              title: 'No motivation',
              text: 'Starting alone can feel harder than the learning itself.',
            },
            {
              Icon: CalendarDays,
              title: 'No daily practice',
              text: 'Good intentions fade when learning has no place in your routine.',
            },
          ].map(({ Icon, title, text }) => (
            <article className="card" key={title}>
              <Icon />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="about-solution">
        <span className="eyebrow">OUR MODERN SOLUTION</span>
        <h2>
          Your community. Your tools.
          <br />
          Your moment to lock in.
        </h2>
        <p>
          Beyond the Book brings people and ideas together. Study alongside others, explain what you
          know, and make practice fun through quizzes and learning games. Discover something new—or
          revisit an idea—while checking reels.
        </p>
      </section>
      <section>
        <span className="eyebrow">OUR RECIPE FOR TRUE LEARNING</span>
        <h2>Three small habits. One learning loop.</h2>
        <div className="about-grid recipe-grid">
          {[
            {
              Icon: Users,
              n: '01',
              title: 'Body doubling',
              text: 'Show up together. A shared focus session gives you company and a clear intention.',
              to: '/?tab=pods',
              cta: 'Find a pod',
            },
            {
              Icon: Lightbulb,
              n: '02',
              title: 'The Richard Feynman technique',
              text: 'Explain an idea simply. Notice the gaps, revisit them, and try teaching it again.',
              to: '/notebooks',
              cta: 'Make it your own',
            },
            {
              Icon: Repeat2,
              n: '03',
              title: 'Daily repetition',
              text: 'Make returning rewarding. Use short reels, quizzes, and games to keep practicing.',
              to: '/interact',
              cta: 'Practice through play',
            },
          ].map(({ Icon, n, title, text, to, cta }) => (
            <article className="card" key={n}>
              <div className="section-heading">
                <Icon />
                <span className="recipe-number">{n}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
              <Link to={to}>
                {cta} <ArrowUpRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
