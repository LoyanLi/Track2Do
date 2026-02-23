import React, { useState, useEffect } from 'react';
import { Loader2, Download, CheckCircle, XCircle, FolderOpen } from 'lucide-react';
import {
  Snapshot,
  ExportSettings,
  ExportRequest,
  ExportProgress,
  AudioFormat,
  MixSourceType,
} from '../types';
import { apiService } from '../services/api';

interface ExportDialogProps {
  snapshots: Snapshot[];
  onClose: () => void;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  snapshots,
  onClose,
}) => {
  const [selectedSnapshots, setSelectedSnapshots] = useState<Snapshot[]>([]);

  // Default select all snapshots when snapshots change
  useEffect(() => {
    setSelectedSnapshots(snapshots);
  }, [snapshots]);
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    file_format: AudioFormat.WAV,
    mix_source_name: '',
    mix_source_type: MixSourceType.PHYSICAL_OUT,
    online_export: false,
    file_prefix: '_Project',
    output_path: '',
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Select output path
  const selectOutputPath = async () => {
    try {
      const result = await window.electronAPI?.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Export Path'
      });
      
      if (result && !result.canceled && result.filePaths.length > 0) {
        setExportSettings(prev => ({ ...prev, output_path: result.filePaths[0] }));
      }
    } catch (error) {
      console.error('Failed to select path:', error);
      // If electron API is not available, let user input path manually
    }
  };

  // Reset state
  const resetState = () => {
    setIsExporting(false);
    setExportProgress(null);
    setError(null);
    setSuccess(false);
  };

  // Stop export
  const stopExport = async () => {
    if (exportProgress?.task_id) {
      try {
        await apiService.stopExportTask(exportProgress.task_id);
        console.log('Export task stopped successfully');
      } catch (error) {
        console.error('Failed to stop export task:', error);
      }
    }
    
    setIsExporting(false);
    setError('Export manually stopped');
  };



  // Start export
  const startExport = async () => {
    if (selectedSnapshots.length === 0) {
      setError('Please select snapshots to export');
      return;
    }

    // Validate required fields
    if (!exportSettings.output_path.trim()) {
      setError('Output Path is required');
      return;
    }

    if (!exportSettings.mix_source_name.trim()) {
      setError('Output Mix Source Name is required');
      return;
    }

    try {
      setIsExporting(true);
      setError(null);

      const exportRequest: ExportRequest = {
        snapshots: selectedSnapshots,
        export_settings: exportSettings,
      };

      const response = await apiService.startExport(exportRequest);
      
      if (response.success && response.task_id) {
        // Start polling task status
        pollExportStatus(response.task_id);
      } else {
        throw new Error(response.message || 'Failed to start export task');
      }
    } catch (error) {
      console.error('Export failed:', error);
      setError(error instanceof Error ? error.message : 'Export failed');
      setIsExporting(false);
    }
  };

  // Poll export status
  const pollExportStatus = async (taskId: string) => {
    const poll = async () => {
      try {
        const response = await apiService.getExportStatus(taskId);
        
        if (response.success && response.data) {
          setExportProgress(response.data);
          
          const status = response.data.status;
          if (status === 'completed') {
            setSuccess(true);
            setIsExporting(false);
          } else if (status === 'failed' || status === 'completed_with_errors') {
            setError(response.data.result?.error_message || 'Error occurred during export');
            setIsExporting(false);
          } else if (status === 'running' || status === 'pending') {
            // Continue polling
            setTimeout(poll, 1000);
          } else if (status === 'cancelled') {
            setError('Export was cancelled');
            setIsExporting(false);
          }
        }
      } catch (error) {
        console.error('Failed to get export status:', error);
        setError('Failed to get export status');
        setIsExporting(false);
      }
    };

    poll();
  };

  // Reset state when closing dialog
  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Dialog Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Export STEM Files</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Dialog Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
          {/* Snapshot Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select snapshots to export
            </label>
            <div className="mt-2 max-h-64 overflow-y-auto border rounded-md p-2 space-y-2">
              {snapshots.length > 0 ? (
                snapshots.map((snapshot) => {
                  const isSelected = selectedSnapshots.some(s => s.id === snapshot.id);
                  return (
                    <div 
                      key={snapshot.id} 
                      className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-blue-100 border border-blue-300' 
                          : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedSnapshots(prev => prev.filter(s => s.id !== snapshot.id));
                        } else {
                          setSelectedSnapshots(prev => [...prev, snapshot]);
                        }
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`text-sm font-medium ${
                          isSelected ? 'text-blue-800' : 'text-gray-700'
                        }`}>{snapshot.name}</span>
                        <span className={`text-xs ${
                          isSelected ? 'text-blue-600' : 'text-gray-500'
                        }`}>({snapshot.trackStates.length} tracks)</span>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-gray-500">No snapshots available</div>
              )}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {selectedSnapshots.length} snapshots selected
            </div>
          </div>

          {/* Export Settings */}
          <div className="grid grid-cols-2 gap-4">
            {/* File Format */}
            <div>
              <label htmlFor="file-format" className="block text-sm font-medium text-gray-700 mb-1">
                File Format
              </label>
              <select
                id="file-format"
                value={exportSettings.file_format}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  setExportSettings(prev => ({ ...prev, file_format: e.target.value as AudioFormat }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={AudioFormat.WAV}>WAV</option>
                <option value={AudioFormat.AIFF}>AIFF</option>
              </select>
            </div>

            {/* Output Mix Source Name */}
            <div>
              <label htmlFor="mix-source-name" className="block text-sm font-medium text-gray-700 mb-1">
                Output Mix Source Name
              </label>
              <input
                id="mix-source-name"
                type="text"
                value={exportSettings.mix_source_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setExportSettings(prev => ({ ...prev, mix_source_name: e.target.value }))
                }
                placeholder="Ref Print"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Output Mix Source Type */}
            <div>
              <label htmlFor="mix-source-type" className="block text-sm font-medium text-gray-700 mb-1">
                Output Mix Source Type
              </label>
              <select
                id="mix-source-type"
                value={exportSettings.mix_source_type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  setExportSettings(prev => ({ ...prev, mix_source_type: e.target.value as MixSourceType }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={MixSourceType.PHYSICAL_OUT}>PhysicalOut</option>
                <option value={MixSourceType.BUS}>Bus</option>
                <option value={MixSourceType.OUTPUT}>Output</option>
              </select>
            </div>

            {/* File Prefix */}
            <div>
              <label htmlFor="file-prefix" className="block text-sm font-medium text-gray-700 mb-1">
                File Prefix
              </label>
              <input
                id="file-prefix"
                type="text"
                value={exportSettings.file_prefix}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setExportSettings(prev => ({ ...prev, file_prefix: e.target.value }))
                }
                placeholder="_Project"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Output Path */}
            <div className="col-span-2">
              <label htmlFor="output-path" className="block text-sm font-medium text-gray-700 mb-1">
                Output Path
              </label>
              <div className="flex space-x-2">
                <input
                  id="output-path"
                  type="text"
                  value={exportSettings.output_path}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setExportSettings(prev => ({ ...prev, output_path: e.target.value }))
                  }
                  placeholder="Select export folder"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={selectOutputPath}
                  className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="col-span-2 space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  id="online-export"
                  type="checkbox"
                  checked={exportSettings.online_export}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setExportSettings(prev => ({ ...prev, online_export: e.target.checked }))
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="online-export" className="text-sm text-gray-700">Online Export</label>
              </div>
            </div>
          </div>

          {/* Export Progress */}
          {isExporting && exportProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Export Progress</span>
                <span className="text-sm text-gray-500">
                  {exportProgress.current_snapshot}/{exportProgress.total_snapshots}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${exportProgress.progress}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-600">
                {exportProgress.current_snapshot_name && (
                  <div>Current: {exportProgress.current_snapshot_name}</div>
                )}
                <div>Status: {exportProgress.status}</div>
              </div>
            </div>
          )}

          {/* Error Information */}
          {error && (
            <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-md">
              <XCircle className="h-4 w-4 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* Success Information */}
          {success && exportProgress?.result && (
            <div className="flex items-start p-4 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
              <div className="text-green-700">
                <div>Export completed! Successfully exported {exportProgress.result.exported_files.length} files</div>
                {exportProgress.result.failed_snapshots.length > 0 && (
                  <div className="mt-1 text-yellow-600">
                    Failed snapshots: {exportProgress.result.failed_snapshots.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {success ? 'Close' : 'Cancel'}
          </button>
          
          {isExporting && (
            <button
              onClick={stopExport}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Stop Export
            </button>
          )}
          
          <button
            onClick={startExport}
            disabled={isExporting || selectedSnapshots.length === 0 || !exportSettings.output_path.trim() || !exportSettings.mix_source_name.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Start Export
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;