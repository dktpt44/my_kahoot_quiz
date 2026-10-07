import { QuizTemplate } from './quiz-template'

export default function Instructions() {
  return <div className="mx-auto max-w-4xl pb-12 animate-in">
    <header className="mb-8">
      <p className="eyebrow">Create a category</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Add your own quizzes</h1>
      <p className="text-muted mt-3 max-w-2xl leading-relaxed">Each folder in <code>data</code> becomes a category. Each JSON file inside that folder becomes a quiz.</p>
    </header>
    <ol className="mb-8 grid gap-4 sm:grid-cols-3">
      <li className="glass-soft p-5"><span className="eyebrow">01 · Category</span><p className="mt-3 font-semibold">Create a new folder inside <code>data</code>.</p></li>
      <li className="glass-soft p-5"><span className="eyebrow">02 · Quiz file</span><p className="mt-3 font-semibold">Create <code>quiz1.json</code> inside your new folder.</p></li>
      <li className="glass-soft p-5"><span className="eyebrow">03 · Add questions</span><p className="mt-3 font-semibold">Paste the format below, edit the values, and refresh Home.</p></li>
    </ol>
    <QuizTemplate />
    <p className="text-muted mt-5 text-sm">Each question needs 2–4 choices and exactly one <code>is_correct: true</code>. Add more questions to the array as needed.</p>
    <section className="glass-soft mt-8 p-5 sm:p-6" aria-labelledby="session-limits-title">
      <h2 id="session-limits-title" className="text-lg font-bold">Room time limit</h2>
      <p className="text-muted mt-2 leading-relaxed">Quizzes and polls close automatically one hour after they are created. A quiz room stops accepting answers and shows a closure message. A poll stops accepting votes and shows its final results. Start a new room to continue after the limit.</p>
    </section>
  </div>
}
