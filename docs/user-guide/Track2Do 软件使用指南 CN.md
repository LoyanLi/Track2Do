# Track2Do 软件使用指南

## 首次登录

打开Track2Do软件后，首先进入登录页面：

- 输入您的邮箱地址
- 输入密码
- 点击蓝色的"Sign In"按钮登录
- 或者选择"Sign in with Google"使用Google账户登录

## Step 1: 检查工程信息

登录成功后进入主页面，首先检查当前Pro Tools工程的连接状态和基本信息：

### 工程基本信息

- **Project Name**
- **Sample Rate**
- **Bit Depth**

### 工程轨道信息

- 显示当前工程的所有轨道列表
- 轨道类型标注

确认信息无误后，点击绿色的"Next: Manage Snapshots"按钮进入下一步。

## Step 2: 快照管理

### 创建快照前的准备工作

**重要**: 在Track2Do中创建快照之前，必须先在Pro Tools工程中设置好想要的轨道状态（Solo/Mute状态）

### 创建快照步骤

1. 在Pro Tools中调整轨道的Solo/Mute状态到期望的混音状态
2. 回到Track2Do，点击蓝色的"+ Create Snapshot"按钮
3. 在弹出的对话框中输入快照名称（如："Drum"）
4. 系统会显示"Will save Solo/Mute status of current 29 tracks"
5. 点击绿色的"Create"按钮保存快照

### 重复创建多个快照

按照同样的步骤，为不同的混音状态创建多个快照：

完成所有快照设置后，点击"Next: Export Settings"进入导出设置。

### 修改已经创建了的快照

点击 Details 按钮，进入详细信息页面，点击 Edit 修改

完成修改后点击 Save 保存。

## Step 3: 导出设置

### 选择要导出的快照

在"Select snapshots to export"区域，选择需要导出的快照：

### 导出预设配置

点击"⚙️ Export Presets"可以选择/保存预设的导出配置：

### 详细导出参数设置

**File Format**: WAV/AIFF

**Output Mix Source Name**: 导出混音源名称（必须要一模一样）

**Output Mix Source Type**: 导出混音源类型

**File Prefix**: 名称前缀

**Output Path**: 选择导出文件的保存路径

**Online Export**: 可选择是否在线导出

### 开始导出

确认所有设置无误后，点击绿色的"⬇️ Start Export"按钮开始导出。

## 导出过程监控

导出过程中可以看到：

- 当前进度显示（如：4/5 snapshots）
- 整体进度百分比（如：60%）
- 当前正在处理的快照名称
- 任务ID和创建时间
- 可以随时点击红色的"🛑 Stop Export"按钮停止导出

## 导出完成

导出完成后显示：

- ✅ "Export Completed! Successfully exported 5 files"
- 显示所有导出文件的完整路径列表
- 点击"📁 Open Folder"可以直接打开导出文件所在文件夹
- 或点击"Continue Export"继续进行其他导出任务

## 重要注意事项

1. **确保Pro Tools连接正常**: 底部状态栏显示"✅ Pro Tools Connected"
2. **快照创建时机**: 必须在Pro Tools中先设置好轨道状态，再在Track2Do中创建快照
3. **导出参数准确性**: 所有Source相关设置必须与Pro Tools工程匹配，确保导出结果准确无误
4. **文件路径**: 确保选择的导出路径有足够的存储空间