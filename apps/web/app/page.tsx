'use client'

// Renders the frontend authored by Davi directly.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PersonalView from '@/davi/components/views/PersonalView'

const DaviPersonalView: any = PersonalView
import { students as initialStudents, workoutsById as initialWorkouts } from '@/davi/data/mockData'
import { createClient } from '@/lib/supabase/client'
import { ProductFooter } from '@/components/layout/product-footer'

export default function PersonalFrontendPage() {
  const router = useRouter()
  const [workouts, setWorkouts] = useState<any>(initialWorkouts)
  const [students, setStudents] = useState<any[]>(initialStudents)
  const [customExercises, setCustomExercises] = useState<any[]>([])

  async function sair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function atualizarTreino(templateId: string, updated: any) {
    setWorkouts((prev: any) => ({ ...prev, [templateId]: updated }))
  }

  return (
    <>
      <DaviPersonalView
        onLogout={sair}
        workouts={workouts}
        onUpdateWorkout={atualizarTreino}
        customExercises={customExercises}
        onAddCustomExercise={(exercise: any) => setCustomExercises((prev) => [exercise, ...prev])}
        students={students}
        setStudents={setStudents}
      />
      <div className="mx-auto max-w-6xl px-5 pb-8">
        <ProductFooter />
      </div>
    </>
  )
}
