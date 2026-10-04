'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const NotificationUser = createContext<string | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    const db = createClient()
    let mounted = true
    let authChanged = false
    let previousId: string | null = null
    const { data: { subscription } } = db.auth.onAuthStateChange((_event, session) => {
      authChanged = true
      if (!mounted) return
      const nextId = session?.user.id ?? null
      if (nextId !== previousId) {
        queryClient.removeQueries({ queryKey: ['notifications'] })
        previousId = nextId
      }
      setUserId(nextId)
    })
    void db.auth.getUser().then(({ data }) => {
      if (mounted && !authChanged) {
        previousId = data.user?.id ?? null
        setUserId(previousId)
      }
    })
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [queryClient])

  return <NotificationUser.Provider value={userId}>{children}</NotificationUser.Provider>
}

export function useNotificationUser() {
  return useContext(NotificationUser)
}
