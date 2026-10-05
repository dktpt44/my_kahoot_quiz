import Link from 'next/link'
import { ArrowIcon, Delay, SparkIcon } from '@/components/ui'

const steps = [
  { title: 'Pick your quiz', body: 'Choose a set from your library and create a room in one click.' },
  { title: 'Bring everyone in', body: 'Share the QR code or join link. Players pick a nickname and appear in your lobby.' },
  { title: 'Start the round', body: 'Each question appears first. Choices arrive five seconds later, then players have 20 seconds to answer.' },
  { title: 'See the results', body: 'Reveal each answer, move to the next question, and finish on a live leaderboard.' },
]

export default function HowTo() {
  return <>
    <section className="glass relative overflow-hidden px-6 py-10 sm:px-12 sm:py-14 animate-in">
      <div className="hero-aura" aria-hidden="true" />
      <div className="relative z-10 max-w-2xl">
        <p className="eyebrow flex items-center gap-2"><SparkIcon className="h-4 w-4" /> Session workflow</p>
        <h1 className="mt-5 text-4xl font-extrabold tracking-[-.055em] sm:text-6xl">A clear process in <span className="gradient-text">four steps.</span></h1>
        <p className="text-muted mt-5 text-lg leading-relaxed">Prepare a session, invite participants, and review results together.</p>
      </div>
    </section>
    <section className="mt-10 grid gap-5 md:grid-cols-2" aria-label="How to play">
      {steps.map((step, index) => <Delay key={step.title} index={index}>
        <div className="glass glass-hover h-full p-7 sm:p-8">
          <span className="text-4xl font-extrabold tracking-tight text-[#a58bff]">0{index + 1}</span>
          <h2 className="mt-6 text-xl font-bold">{step.title}</h2>
          <p className="text-muted mt-3 leading-relaxed">{step.body}</p>
        </div>
      </Delay>)}
    </section>
    <div className="mt-9 text-center animate-in">
      <Link className="btn-primary" href="/host/dashboard">Explore quizzes <ArrowIcon /></Link>
    </div>
  </>
}
