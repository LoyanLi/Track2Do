import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'
import axios from 'axios'
import { writeFileSync, appendFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs'
import { homedir } from 'os'

class App {
  private mainWindow: BrowserWindow | null = null
  private backendProcess: ChildProcess | null = null
  private readonly isDev = process.env.NODE_ENV === 'development'
  private logFile: string
  private isAlwaysOnTop: boolean = false

  constructor() {
    // Initialize log file - use user data directory for packaged app
    const logDir = this.isDev 
      ? join(__dirname, '..', 'logs')
      : join(app.getPath('userData'), 'logs')
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true })
    }
    
    // Clean old log files, keep only the latest 5
    this.cleanOldLogFiles(logDir)
    
    this.logFile = join(logDir, `app-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.log`)
    this.log('Application started')
    this.init()
  }

  private cleanOldLogFiles(logDir: string): void {
    try {
      const files = readdirSync(logDir)
      const logFiles = files
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: join(logDir, file),
          mtime: statSync(join(logDir, file)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      
      // Keep only the latest 5 log files
      if (logFiles.length > 4) {
        const filesToDelete = logFiles.slice(4)
        filesToDelete.forEach(file => {
          try {
            unlinkSync(file.path)
            console.log(`Deleted old log file: ${file.name}`)
          } catch (error) {
            console.error(`Failed to delete log file ${file.name}:`, error)
          }
        })
      }
    } catch (error) {
      console.error('Failed to clean old log files:', error)
    }
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}\n`
    console.log(message)
    try {
      appendFileSync(this.logFile, logMessage)
    } catch (error) {
      console.error('Failed to write log:', error)
    }
  }

  private init(): void {
    // Create window when Electron is ready
    app.whenReady().then(() => {
      this.createWindow()
      this.startBackend()
    })

    // Quit app when all windows are closed (except on macOS)
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.cleanup()
        app.quit()
      }
    })

    // Recreate window when dock icon is clicked on macOS
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow()
      }
    })

    // Clean up resources before app quits
    app.on('before-quit', () => {
      this.cleanup()
    })

    // Register IPC handlers
    this.registerIpcHandlers()
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 600,
      height: 1200,
      resizable: false,
      icon: join(__dirname, '../assets/icons/icon.png'), // Add icon
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js'),
        webSecurity: true, // Enable web security for Firebase auth
        allowRunningInsecureContent: false, // Disable insecure content
        experimentalFeatures: true, // Enable experimental features
      },
      titleBarStyle: 'hiddenInset',
      show: false, // Hide initially, show after loading
    })

    // Load application
    if (this.isDev || !app.isPackaged) {
      this.mainWindow.loadURL('http://localhost:3000')
      // this.mainWindow.webContents.openDevTools() // Don't open dev tools by default
    } else {
      this.mainWindow.loadFile(join(__dirname, '../dist/renderer/index.html'))
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show()
    })

    // Clean up reference when window is closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })
  }

  private startBackend(): void {
    try {
      this.log('Starting backend service...')
      this.log(`Current environment: ${this.isDev ? 'Development' : 'Production'}`)
      this.log(`Is packaged: ${app.isPackaged}`)
      
      // Try different Python commands
      const pythonCommands = ['python3', 'python']
      let backendPath: string
      
      if (this.isDev || !app.isPackaged) {
        // Development environment: run Python script directly
        backendPath = join(__dirname, '..', 'backend')
        this.log(`Development environment: Starting Python backend service, path: ${backendPath}`)
      } else {
        // Production environment: start from unpacked resources
        backendPath = join(process.resourcesPath, 'app.asar.unpacked', 'backend')
        this.log(`Production environment: Starting packaged backend service, path: ${backendPath}`)
      }
      
      // Check if backend path exists
      if (!existsSync(backendPath)) {
        this.log(`Error: Backend path does not exist: ${backendPath}`)
        return
      }
      
      // Install dependencies first, then start backend
      this.installDependencies(pythonCommands, backendPath, 0)
    } catch (error) {
      this.log(`Backend startup failed: ${error}`)
    }
  }

  private installDependencies(pythonCommands: string[], backendPath: string, index: number): void {
    if (index >= pythonCommands.length) {
      this.log('All Python commands failed, unable to install dependencies')
      return
    }

    const pythonCmd = pythonCommands[index]
    this.log(`Installing backend dependencies using ${pythonCmd}...`)
    
    try {
      const installProcess = spawn(pythonCmd, ['-m', 'pip', 'install', '-r', 'requirements.txt'], {
        cwd: backendPath,
        stdio: 'pipe',
        detached: false,
      })

      if (installProcess) {
        installProcess.stdout?.on('data', (data) => {
          this.log(`Dependency installation output: ${data.toString().trim()}`)
        })

        installProcess.stderr?.on('data', (data) => {
          this.log(`Dependency installation error: ${data.toString().trim()}`)
        })

        installProcess.on('close', async (code) => {
          if (code === 0) {
            this.log(`Dependencies installed successfully (${pythonCmd})`)
            // Start backend after successful dependency installation
            await this.tryStartBackend(pythonCommands, backendPath, 0)
          } else {
            this.log(`Dependency installation failed, exit code: ${code}`)
            // Try next Python command
            this.installDependencies(pythonCommands, backendPath, index + 1)
          }
        })

        installProcess.on('error', (error) => {
          this.log(`Dependency installation process failed to start (${pythonCmd}): ${error}`)
          // Try next Python command
          this.installDependencies(pythonCommands, backendPath, index + 1)
        })
      }
    } catch (error) {
      this.log(`Dependency installation failed (${pythonCmd}): ${error}`)
      // Try next Python command
      this.installDependencies(pythonCommands, backendPath, index + 1)
    }
  }

  private async killPortProcess(port: number): Promise<void> {
    try {
      this.log(`Checking for processes using port ${port}...`)
      
      // Use lsof to find processes using the port
      const lsofProcess = spawn('lsof', ['-ti', `:${port}`], {
        stdio: 'pipe'
      })
      
      let pids = ''
      lsofProcess.stdout?.on('data', (data) => {
        pids += data.toString()
      })
      
      return new Promise((resolve) => {
        lsofProcess.on('close', (code) => {
          if (code === 0 && pids.trim()) {
            const pidList = pids.trim().split('\n').filter(pid => pid.trim())
            this.log(`Found processes using port ${port}: ${pidList.join(', ')}`)
            
            // Kill each process
            pidList.forEach(pid => {
              try {
                this.log(`Killing process ${pid}...`)
                process.kill(parseInt(pid), 'SIGTERM')
                
                // Force kill after 2 seconds if still running
                setTimeout(() => {
                  try {
                    process.kill(parseInt(pid), 'SIGKILL')
                    this.log(`Force killed process ${pid}`)
                  } catch (e) {
                    // Process already dead, ignore
                  }
                }, 2000)
              } catch (error) {
                this.log(`Failed to kill process ${pid}: ${error}`)
              }
            })
            
            // Wait a bit for processes to be killed
            setTimeout(() => {
              this.log(`Port ${port} cleanup completed`)
              resolve()
            }, 3000)
          } else {
            this.log(`No processes found using port ${port}`)
            resolve()
          }
        })
      })
    } catch (error) {
      this.log(`Error checking port ${port}: ${error}`)
    }
  }

  private async tryStartBackend(pythonCommands: string[], backendPath: string, index: number): Promise<void> {
    if (index >= pythonCommands.length) {
      this.log('All Python commands failed')
      this.log('Please ensure Python is installed and backend dependencies are installed')
      this.log('Manual installation command: cd backend && pip install -r requirements.txt')
      return
    }

    const pythonCmd = pythonCommands[index]
    this.log(`Trying to start backend using ${pythonCmd}...`)
    
    // Kill any processes using port 8000 before starting
    await this.killPortProcess(8000)
    
    try {
      this.backendProcess = spawn(pythonCmd, ['main.py'], {
        cwd: backendPath,
        stdio: 'pipe',
        detached: false,
      })

      if (this.backendProcess) {
        this.backendProcess.stdout?.on('data', (data) => {
          this.log(`Backend output: ${data.toString().trim()}`)
        })

        this.backendProcess.stderr?.on('data', (data) => {
          this.log(`Backend error: ${data.toString().trim()}`)
        })

        this.backendProcess.on('close', (code) => {
          this.log(`Backend process exited, code: ${code}`)
          this.backendProcess = null
        })

        this.backendProcess.on('error', async (error) => {
          this.log(`Backend process failed to start (${pythonCmd}): ${error}`)
          this.backendProcess = null
          // Try next Python command
          await this.tryStartBackend(pythonCommands, backendPath, index + 1)
        })

        this.log(`Backend process started (${pythonCmd})`)
      }
    } catch (error) {
      this.log(`Backend startup failed (${pythonCmd}): ${error}`)
      // Try next Python command
      await this.tryStartBackend(pythonCommands, backendPath, index + 1)
    }
  }

  private cleanup(): void {
    if (this.backendProcess) {
      console.log('Terminating backend process...')
      this.backendProcess.kill('SIGTERM')
      
      // Force kill if process doesn't exit within 5 seconds
      setTimeout(() => {
        if (this.backendProcess && !this.backendProcess.killed) {
          console.log('Force killing backend process')
          this.backendProcess.kill('SIGKILL')
        }
      }, 5000)
      
      this.backendProcess = null
    }
  }

  private registerIpcHandlers(): void {
    // Get application version
    ipcMain.handle('app:getVersion', () => {
      return app.getVersion()
    })

    // Get backend status
    ipcMain.handle('backend:getStatus', () => {
      return {
        running: this.backendProcess !== null && !this.backendProcess.killed,
        pid: this.backendProcess?.pid || null,
      }
    })

    // Restart backend
    ipcMain.handle('backend:restart', () => {
      this.cleanup()
      setTimeout(() => {
        this.startBackend()
      }, 1000)
    })

    // Show folder selection dialog
    ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
      if (!this.mainWindow) {
        return { canceled: true, filePaths: [] }
      }
      
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: options.properties as any,
        title: options.title,
        defaultPath: options.defaultPath
      })
      
      return result
    })

    // HTTP request handlers
    ipcMain.handle('http:get', async (event, url: string) => {
      try {
        const response = await axios.get(url, { timeout: 30000 })
        return response.data
      } catch (error: any) {
        throw new Error(`HTTP GET request failed: ${error.message}`)
      }
    })

    ipcMain.handle('http:post', async (event, url: string, data?: any) => {
      try {
        const response = await axios.post(url, data, { 
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' }
        })
        return response.data
      } catch (error: any) {
        throw new Error(`HTTP POST request failed: ${error.message}`)
      }
    })

    ipcMain.handle('http:delete', async (event, url: string) => {
      try {
        const response = await axios.delete(url, { timeout: 30000 })
        return response.data
      } catch (error: any) {
        throw new Error(`HTTP DELETE request failed: ${error.message}`)
      }
    })

    // Window always-on-top functionality
    ipcMain.handle('window:toggleAlwaysOnTop', () => {
      if (!this.mainWindow) return false
      
      this.isAlwaysOnTop = !this.isAlwaysOnTop
      this.mainWindow.setAlwaysOnTop(this.isAlwaysOnTop)
      this.log(`Window always-on-top status: ${this.isAlwaysOnTop ? 'Enabled' : 'Disabled'}`)
      
      return this.isAlwaysOnTop
    })

    // Get window always-on-top status
    ipcMain.handle('window:getAlwaysOnTop', () => {
      return this.isAlwaysOnTop
    })

    // Open path in system file manager
    ipcMain.handle('shell:openPath', async (event, path: string) => {
      try {
        const result = await shell.openPath(path)
        this.log(`Opened path: ${path}, result: ${result || 'success'}`)
        return result
      } catch (error: any) {
        this.log(`Failed to open path: ${path}, error: ${error.message}`)
        throw new Error(`Failed to open path: ${error.message}`)
      }
    })

    // File system operations
    ipcMain.handle('fs:readFile', async (event, filePath: string) => {
      try {
        const fs = require('fs')
        if (!fs.existsSync(filePath)) {
          return null
        }
        const content = fs.readFileSync(filePath, 'utf8')
        this.log(`Read file: ${filePath}`)
        return content
      } catch (error: any) {
        this.log(`Failed to read file: ${filePath}, error: ${error.message}`)
        return null
      }
    })

    ipcMain.handle('fs:writeFile', async (event, filePath: string, content: string) => {
      try {
        const fs = require('fs')
        fs.writeFileSync(filePath, content, 'utf8')
        this.log(`Wrote file: ${filePath}`)
        return true
      } catch (error: any) {
        this.log(`Failed to write file: ${filePath}, error: ${error.message}`)
        return false
      }
    })

    ipcMain.handle('fs:ensureDir', async (event, dirPath: string) => {
      try {
        const fs = require('fs')
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true })
          this.log(`Created directory: ${dirPath}`)
        }
        return true
      } catch (error: any) {
        this.log(`Failed to create directory: ${dirPath}, error: ${error.message}`)
        return false
      }
    })

    ipcMain.handle('fs:getHomePath', async () => {
      try {
        const os = require('os')
        const homePath = os.homedir()
        return homePath
      } catch (error: any) {
        this.log(`Failed to get home path, error: ${error.message}`)
        return ''
      }
    })

    // Google OAuth authentication in external browser
    ipcMain.handle('auth:signInWithGoogle', async () => {
      try {
        this.log('Starting Google OAuth authentication in external browser')
        
        // Firebase OAuth配置 - 使用隐式流程
        // 从环境变量读取客户端ID，如果没有则使用默认值
        const clientId = process.env.VITE_GOOGLE_CLIENT_ID || '697847626439-a7982954681c78dc69dce2.apps.googleusercontent.com'
        const redirectUri = 'http://localhost:8080/auth/callback'
        const scope = 'openid email profile'
        const responseType = 'id_token token'
        const nonce = Math.random().toString(36).substring(2, 15)
        const state = Math.random().toString(36).substring(2, 15)
        
        // 构建OAuth URL (隐式流程)
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${encodeURIComponent(clientId)}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=${encodeURIComponent(responseType)}&` +
          `scope=${encodeURIComponent(scope)}&` +
          `nonce=${encodeURIComponent(nonce)}&` +
          `state=${encodeURIComponent(state)}`
        
        // 在系统默认浏览器中打开认证URL
        await shell.openExternal(authUrl)
        
        // 创建临时HTTP服务器监听回调
        const http = require('http')
        const url = require('url')
        
        return new Promise((resolve) => {
          const server = http.createServer(async (req: any, res: any) => {
            const parsedUrl = url.parse(req.url, true)
            
            if (parsedUrl.pathname === '/auth/callback') {
              // 隐式流程的令牌在URL片段中，需要通过JavaScript获取
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
              res.end(`
                <html>
                  <head>
                    <title>OAuth Callback</title>
                  </head>
                  <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                    <h2>处理认证结果...</h2>
                    <p id="status">正在验证您的登录信息...</p>
                    
                    <script>
                      function parseFragment() {
                        const fragment = window.location.hash.substring(1);
                        const params = new URLSearchParams(fragment);
                        
                        const accessToken = params.get('access_token');
                        const idToken = params.get('id_token');
                        const error = params.get('error');
                        const state = params.get('state');
                        
                        if (error) {
                          document.getElementById('status').innerHTML = 
                            '<h2 style="color: #d32f2f;">认证失败</h2><p>错误: ' + error + '</p><p>您可以关闭此页面并返回应用。</p>';
                          
                          // 通知服务器认证失败
                          fetch('/auth/result', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ success: false, error: error })
                          });
                        } else if (accessToken && idToken) {
                          document.getElementById('status').innerHTML = 
                            '<h2 style="color: #4caf50;">认证成功!</h2><p>您已成功登录，可以关闭此页面并返回应用。</p>';
                          
                          // 通知服务器认证成功
                          fetch('/auth/result', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              success: true, 
                              credential: { 
                                accessToken: accessToken, 
                                idToken: idToken 
                              } 
                            })
                          });
                        } else {
                          document.getElementById('status').innerHTML = 
                            '<h2 style="color: #ff9800;">认证取消</h2><p>您可以关闭此页面并返回应用。</p>';
                          
                          // 通知服务器认证取消
                          fetch('/auth/result', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ success: false, error: 'Authentication cancelled' })
                          });
                        }
                      }
                      
                      // 页面加载后解析片段
                      window.onload = parseFragment;
                    </script>
                  </body>
                </html>
              `)
            } else if (parsedUrl.pathname === '/auth/result' && req.method === 'POST') {
              // 接收认证结果
              let body = ''
              req.on('data', (chunk: any) => {
                body += chunk.toString()
              })
              
              req.on('end', () => {
                try {
                  const result = JSON.parse(body)
                  res.writeHead(200, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ status: 'received' }))
                  
                  // 关闭服务器并返回结果
                  server.close()
                  resolve(result)
                } catch (parseError) {
                  res.writeHead(400, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: 'Invalid JSON' }))
                  server.close()
                  resolve({ success: false, error: 'Invalid response format' })
                }
              })
            } else {
              res.writeHead(404)
              res.end('Not Found')
            }
          })
          
          server.listen(8080, () => {
            this.log('OAuth callback server started on port 8080')
          })
          
          // 60秒超时
          setTimeout(() => {
            server.close()
            resolve({ success: false, error: 'Authentication timeout' })
          }, 60000)
        })
        
      } catch (error: any) {
        this.log(`Google OAuth authentication failed: ${error.message}`)
        return { success: false, error: error.message }
      }
    })
  }
}

// 创建应用实例
new App()