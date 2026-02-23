import React, { useState, useEffect } from 'react';
import { Save, Upload, Download, Trash2, Edit3, Check, X, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { ExportPreset, AudioFormat, MixSourceType } from '../types';
import { PresetManager, PaginatedPresets } from '../utils/presetManager';

interface PresetManagerProps {
  currentSettings: {
    file_format: AudioFormat;
    mix_source_name: string;
    mix_source_type: MixSourceType;
  };
  onApplyPreset: (preset: ExportPreset) => void;
  className?: string;
}

const PresetManagerComponent: React.FC<PresetManagerProps> = ({
  currentSettings,
  onApplyPreset,
  className = ''
}) => {
  const [paginatedData, setPaginatedData] = useState<PaginatedPresets>({
    presets: [],
    totalPages: 0,
    currentPage: 1,
    totalCount: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [editingPreset, setEditingPreset] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 加载预设
  const loadPresets = async (page: number = currentPage) => {
    const paginatedPresets = await PresetManager.getPaginatedPresets(page);
    setPaginatedData(paginatedPresets);
    setCurrentPage(page);
  };

  useEffect(() => {
    loadPresets();
    // 创建默认预设（如果没有预设的话）
    PresetManager.createDefaultPresets();
    loadPresets();
  }, []);

  // 清除消息
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // 保存当前设置为预设
  const handleSavePreset = async () => {
    clearMessages();
    
    if (!newPresetName.trim()) {
      setError('Please enter a preset name');
      return;
    }

    if (await PresetManager.isNameExists(newPresetName.trim())) {
      setError('A preset with this name already exists');
      return;
    }

    try {
      const newPreset = await PresetManager.savePreset({
        name: newPresetName.trim(),
        file_format: currentSettings.file_format,
        mix_source_name: currentSettings.mix_source_name,
        mix_source_type: currentSettings.mix_source_type,
      });

      // 重新加载当前页面的预设
      await loadPresets(currentPage);
      setNewPresetName('');
      setShowSaveDialog(false);
      setSuccess(`Preset "${newPreset.name}" saved successfully`);
    } catch (err) {
      setError('Failed to save preset');
    }
  };

  // 应用预设
  const handleApplyPreset = (preset: ExportPreset) => {
    onApplyPreset(preset);
    setSuccess(`Applied preset "${preset.name}"`);
  };

  // 删除预设
  const handleDeletePreset = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the preset "${name}"?`)) {
      if (await PresetManager.deletePreset(id)) {
        // 重新加载预设，如果当前页没有预设了，回到上一页
        const newPaginatedData = await PresetManager.getPaginatedPresets(currentPage);
        if (newPaginatedData.presets.length === 0 && currentPage > 1) {
          await loadPresets(currentPage - 1);
        } else {
          await loadPresets(currentPage);
        }
        setSuccess(`Preset "${name}" deleted successfully`);
      } else {
        setError('Failed to delete preset');
      }
    }
  };

  // 开始编辑预设名称
  const startEditingPreset = (preset: ExportPreset) => {
    setEditingPreset(preset.id);
    setEditingName(preset.name);
  };

  // 保存编辑的预设名称
  const saveEditingPreset = async (id: string) => {
    clearMessages();
    
    if (!editingName.trim()) {
      setError('Preset name cannot be empty');
      return;
    }

    if (await PresetManager.isNameExists(editingName.trim(), id)) {
      setError('A preset with this name already exists');
      return;
    }

    const updatedPreset = await PresetManager.updatePreset(id, { name: editingName.trim() });
    if (updatedPreset) {
      // 重新加载当前页面的预设
      await loadPresets(currentPage);
      setEditingPreset(null);
      setEditingName('');
      setSuccess('Preset name updated successfully');
    } else {
      setError('Failed to update preset name');
    }
  };

  // 取消编辑
  const cancelEditing = () => {
    setEditingPreset(null);
    setEditingName('');
  };

  // 导出预设
  const handleExportPresets = async () => {
    try {
      await PresetManager.exportPresetsToFile();
      // 延迟显示成功消息，模拟导出完成
      setTimeout(() => {
        setSuccess('Presets exported successfully');
      }, 500);
    } catch (err) {
      setError('Failed to export presets');
    }
  };

  // 导入预设
  const handleImportPresets = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await PresetManager.importPresetsFromFile(file);
      
      if (result.success) {
        // 导入后重新加载第一页
        await loadPresets(1);
        setSuccess(`Successfully imported ${result.imported} preset(s)`);
        if (result.errors.length > 0) {
          console.warn('Import warnings:', result.errors);
        }
      } else {
        setError(`Import failed: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      setError('Failed to import presets');
    }

    // 清除文件输入
    event.target.value = '';
    setShowImportDialog(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Settings Icon Button */}
      <button
        onClick={() => setShowPresetPanel(!showPresetPanel)}
        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center space-x-2"
        title="Export Presets"
      >
        <Settings className="w-4 h-4" />
        <span className="text-sm font-medium">Export Presets</span>
      </button>

      {/* Preset Panel Overlay */}
      {showPresetPanel && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => setShowPresetPanel(false)}
          />
          
          {/* Preset Panel */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Export Presets</h3>
              <div className="flex space-x-2">
          <button
            onClick={() => setShowSaveDialog(true)}
            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Save current settings as preset"
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportPresets}
            className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Export presets to file"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowImportDialog(true)}
            className="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
            title="Import presets from file"
          >
            <Upload className="w-4 h-4" />
          </button>

              </div>
            </div>

            {/* Messages */}
            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                {success}
              </div>
            )}

            {/* Presets List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {paginatedData.presets.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">
                  {paginatedData.totalCount === 0 ? 
                    'No presets available. Save your current settings to create a preset.' :
                    'No presets on this page.'
                  }
                </div>
              ) : (
                paginatedData.presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      {editingPreset === preset.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                saveEditingPreset(preset.id);
                              } else if (e.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => saveEditingPreset(preset.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="cursor-pointer" onClick={() => handleApplyPreset(preset)}>
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {preset.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {preset.file_format.toUpperCase()} • {preset.mix_source_name} • {preset.mix_source_type}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {editingPreset !== preset.id && (
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={() => startEditingPreset(preset)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit preset name"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeletePreset(preset.id, preset.name)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete preset"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {paginatedData.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Page {paginatedData.currentPage} of {paginatedData.totalPages} ({paginatedData.totalCount} total)
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={async () => await loadPresets(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-gray-600 px-2">
                    {currentPage} / {paginatedData.totalPages}
                  </span>
                  <button
                    onClick={async () => await loadPresets(currentPage + 1)}
                    disabled={currentPage >= paginatedData.totalPages}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Save Export Preset</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preset Name
                </label>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Enter preset name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSavePreset();
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="text-sm text-gray-600">
                <div><strong>File Format:</strong> {currentSettings.file_format.toUpperCase()}</div>
                <div><strong>Mix Source Name:</strong> {currentSettings.mix_source_name}</div>
                <div><strong>Mix Source Type:</strong> {currentSettings.mix_source_type}</div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setNewPresetName('');
                  clearMessages();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Import Export Presets</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select JSON file containing presets
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportPresets}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="text-sm text-gray-600">
                <p>Select a JSON file exported from Track2Do to import presets.</p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  clearMessages();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresetManagerComponent;