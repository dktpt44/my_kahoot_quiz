import { countQuizCategories, listQuizzes } from '@/lib/quizzes'
import DashboardClient from './dashboard-client'

export default async function Dashboard() {
  const [quizzes, categoryCount] = await Promise.all([listQuizzes(), countQuizCategories()])
  return <DashboardClient quizzes={quizzes} categoryCount={categoryCount} />
}
