import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential
} from 'firebase/auth'
import { auth } from '../config/firebase'

interface AuthContextType {
  currentUser: User | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loginWithGoogle: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const register = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password)
  }

  const logout = async () => {
    await signOut(auth)
  }

  const signInWithGoogle = async () => {
    try {
      // 检查是否在Electron环境中
      if (window.electronAPI) {
        // 使用Electron的外部浏览器登录
        const result = await window.electronAPI.signInWithGoogle()
        if (result.success && result.credential) {
          const credential = GoogleAuthProvider.credential(result.credential.idToken, result.credential.accessToken)
          await signInWithCredential(auth, credential)
        } else {
          throw new Error(result.error || 'Authentication failed')
        }
      } else {
        // 在Web环境中使用传统的popup方式
        const provider = new GoogleAuthProvider()
        await signInWithPopup(auth, provider)
      }
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value: AuthContextType = {
    currentUser,
    login,
    register,
    logout,
    loginWithGoogle: signInWithGoogle,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}