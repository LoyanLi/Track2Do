import { ExportPreset, AudioFormat, MixSourceType } from '../types';

const PRESETS_STORAGE_KEY = 'track2do_export_presets';
const PRESETS_PER_PAGE = 3;
const PRESETS_FILE_NAME = 'presets.json';
const PRESETS_FOLDER_NAME = 'Tracktodo';

export interface PaginatedPresets {
  presets: ExportPreset[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

export class PresetManager {
  /**
   * 获取所有预设
   */
  static async getPresets(): Promise<ExportPreset[]> {
    try {
      // 尝试从文件系统读取
      if (this.isElectronEnvironment()) {
        const fileData = await this.readPresetsFromFile();
        if (fileData) {
          return fileData;
        }
      }
      
      // 回退到 localStorage
      const presetsJson = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (!presetsJson) {
        return [];
      }
      return JSON.parse(presetsJson) as ExportPreset[];
    } catch (error) {
      console.error('Failed to load presets:', error);
      return [];
    }
  }

  /**
   * 获取分页预设
   */
  static async getPaginatedPresets(page: number = 1): Promise<PaginatedPresets> {
    const allPresets = await this.getPresets();
    const totalCount = allPresets.length;
    const totalPages = Math.ceil(totalCount / PRESETS_PER_PAGE);
    const startIndex = (page - 1) * PRESETS_PER_PAGE;
    const endIndex = startIndex + PRESETS_PER_PAGE;
    const presets = allPresets.slice(startIndex, endIndex);

    return {
      presets,
      totalPages,
      currentPage: page,
      totalCount
    };
  }

  /**
   * 保存预设
   */
  static async savePreset(preset: Omit<ExportPreset, 'id' | 'createdAt'>): Promise<ExportPreset> {
    const presets = await this.getPresets();
    const newPreset: ExportPreset = {
      ...preset,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
    };
    
    presets.push(newPreset);
    await this.savePresets(presets);
    return newPreset;
  }

  /**
   * 更新预设
   */
  static async updatePreset(id: string, updates: Partial<Omit<ExportPreset, 'id' | 'createdAt'>>): Promise<ExportPreset | null> {
    const presets = await this.getPresets();
    const index = presets.findIndex(p => p.id === id);
    
    if (index === -1) {
      return null;
    }
    
    presets[index] = {
      ...presets[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    await this.savePresets(presets);
    return presets[index];
  }

  /**
   * 删除预设
   */
  static async deletePreset(id: string): Promise<boolean> {
    const presets = await this.getPresets();
    const filteredPresets = presets.filter(p => p.id !== id);
    
    if (filteredPresets.length === presets.length) {
      return false; // 没有找到要删除的预设
    }
    
    await this.savePresets(filteredPresets);
    return true;
  }

  /**
   * 根据ID获取预设
   */
  static async getPresetById(id: string): Promise<ExportPreset | null> {
    const presets = await this.getPresets();
    return presets.find(p => p.id === id) || null;
  }

  /**
   * 检查预设名称是否已存在
   */
  static async isNameExists(name: string, excludeId?: string): Promise<boolean> {
    const presets = await this.getPresets();
    return presets.some(p => p.name === name && p.id !== excludeId);
  }

  /**
   * 导出预设到JSON文件
   */
  static async exportPresetsToFile(): Promise<void> {
    const presets = await this.getPresets();
    const dataStr = JSON.stringify(presets, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `track2do_export_presets_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  /**
   * 从JSON文件导入预设
   */
  static async importPresetsFromFile(file: File): Promise<{ success: boolean; imported: number; errors: string[] }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const importedPresets = JSON.parse(content) as ExportPreset[];
          
          if (!Array.isArray(importedPresets)) {
            resolve({ success: false, imported: 0, errors: ['Invalid file format: expected array of presets'] });
            return;
          }
          
          const errors: string[] = [];
          const validPresets: ExportPreset[] = [];
          
          importedPresets.forEach((preset, index) => {
            if (this.validatePreset(preset)) {
              // 生成新的ID以避免冲突
              const newPreset: ExportPreset = {
                ...preset,
                id: this.generateId(),
                createdAt: new Date().toISOString(),
              };
              validPresets.push(newPreset);
            } else {
              errors.push(`Invalid preset at index ${index}`);
            }
          });
          
          if (validPresets.length > 0) {
            const existingPresets = await this.getPresets();
            await this.savePresets([...existingPresets, ...validPresets]);
          }
          
          resolve({
            success: validPresets.length > 0,
            imported: validPresets.length,
            errors
          });
        } catch (error) {
          resolve({
            success: false,
            imported: 0,
            errors: [`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`]
          });
        }
      };
      
      reader.onerror = () => {
        resolve({
          success: false,
          imported: 0,
          errors: ['Failed to read file']
        });
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * 验证预设格式
   */
  private static validatePreset(preset: any): preset is ExportPreset {
    return (
      typeof preset === 'object' &&
      typeof preset.name === 'string' &&
      Object.values(AudioFormat).includes(preset.file_format) &&
      typeof preset.mix_source_name === 'string' &&
      Object.values(MixSourceType).includes(preset.mix_source_type)
    );
  }

  /**
   * 保存预设列表到localStorage
   * TODO: 在Electron环境中添加Documents/Track2Do文件夹支持
   */
  private static async savePresets(presets: ExportPreset[]): Promise<void> {
    try {
      // 尝试保存到文件系统
      if (this.isElectronEnvironment()) {
        const success = await this.savePresetsToFile(presets);
        if (success) {
          // 同时保存到 localStorage 作为备份
          localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
          return;
        }
      }
      
      // 回退到 localStorage
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
      console.error('Failed to save presets:', error);
      throw new Error('Failed to save presets');
    }
  }

  /**
   * 检查是否在 Electron 环境中
   */
  private static isElectronEnvironment(): boolean {
    return typeof window !== 'undefined' && window.electronAPI !== undefined;
  }

  /**
   * 从文件系统读取预设
   */
  private static async readPresetsFromFile(): Promise<ExportPreset[] | null> {
    try {
      if (!window.electronAPI?.fs?.readFile) {
        return null;
      }
      
      const userHome = await window.electronAPI.fs.getHomePath();
      const presetsPath = `${userHome}/Documents/${PRESETS_FOLDER_NAME}/${PRESETS_FILE_NAME}`;
      
      const fileContent = await window.electronAPI.fs.readFile(presetsPath);
      if (!fileContent) {
        return null;
      }
      
      return JSON.parse(fileContent) as ExportPreset[];
    } catch (error) {
      console.error('Failed to read presets from file:', error);
      return null;
    }
  }

  /**
   * 保存预设到文件系统
   */
  private static async savePresetsToFile(presets: ExportPreset[]): Promise<boolean> {
    try {
      if (!window.electronAPI?.fs?.writeFile || !window.electronAPI?.fs?.ensureDir) {
        return false;
      }
      
      const userHome = await window.electronAPI.fs.getHomePath();
      const presetsDir = `${userHome}/Documents/${PRESETS_FOLDER_NAME}`;
      const presetsPath = `${presetsDir}/${PRESETS_FILE_NAME}`;
      
      // 确保目录存在
      await window.electronAPI.fs.ensureDir(presetsDir);
      
      // 写入文件
      const success = await window.electronAPI.fs.writeFile(presetsPath, JSON.stringify(presets, null, 2));
      return success;
    } catch (error) {
      console.error('Failed to save presets to file:', error);
      return false;
    }
  }

  /**
   * 生成唯一ID
   */
  private static generateId(): string {
    return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清除所有预设（仅用于测试）
   */
  static async clearAllPresets(): Promise<void> {
    try {
      // 清除文件系统中的预设
      if (this.isElectronEnvironment()) {
        try {
          if (window.electronAPI?.fs?.deleteFile) {
            const userHome = await window.electronAPI.fs.getHomePath();
            const presetsPath = `${userHome}/Documents/${PRESETS_FOLDER_NAME}/${PRESETS_FILE_NAME}`;
            await window.electronAPI.fs.deleteFile(presetsPath);
          }
        } catch (error) {
          console.warn('Failed to delete presets file:', error);
        }
      }
      
      // 清除 localStorage
      localStorage.removeItem(PRESETS_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear presets:', error);
    }
  }

  /**
   * 创建默认预设
   */
  static createDefaultPresets(): void {
    // 不再创建默认预设，让用户从空白状态开始
  }
}