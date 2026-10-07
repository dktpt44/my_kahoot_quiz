import { listQuizCategories, listQuizzes } from '@/lib/quizzes'
import DashboardClient from './dashboard-client'

export default async function Dashboard() {
  const [quizzes, categories] = await Promise.all([listQuizzes(), listQuizCategories()])
  return <DashboardClient quizzes={quizzes} categories={categories} />
}
