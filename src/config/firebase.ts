import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

// Firebase配置 - 从环境变量读取
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAjTFEfWlkq1anMw3Ydn-ySCUZytLvPOU0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "track2do.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "track2do",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "track2do.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "697847626439",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:697847626439:web:a7982954681c78dc69dce2",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-1Q0YS8J137"
}



// 初始化Firebase
const app = initializeApp(firebaseConfig)

// 初始化Firebase Authentication并获取auth服务的引用
export const auth = getAuth(app)
export default app