import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LoginPage } from './LoginPage'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return <LoginPage />
  }

  return <>{children}</>
}