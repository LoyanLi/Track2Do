import React, { useState, useEffect } from 'react';
import { Loader2, Download, CheckCircle, XCircle, FolderOpen } from 'lucide-react';
import {
  Snapshot,
  ExportSettings,
  ExportRequest,
  ExportProgress,
  AudioFormat,
  MixSourceType,
  ExportPreset,
} from '../types';
import { apiService } from '../services/api';
import PresetManagerComponent from './PresetManager';

interface ExportPanelProps {
  snapshots: Snapshot[];
}

const ExportPanel: React.FC<ExportPanelProps> = ({ snapshots }) => {
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
    file_prefix: '',
    output_path: '',
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pollTimeoutId, setPollTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Handle preset application
  const handleApplyPreset = (preset: ExportPreset) => {
    setExportSettings(prev => ({
      ...prev,
      file_format: preset.file_format,
      mix_source_name: preset.mix_source_name,
      mix_source_type: preset.mix_source_type,
    }));
  };

  // Get project name and set default file prefix
  useEffect(() => {
    const fetchSessionInfo = async () => {
      try {
        const connectionStatus = await apiService.checkStatus();
        if (connectionStatus.isConnected && connectionStatus.sessionName) {
          const sessionName = connectionStatus.sessionName;
          // Remove file extension if present
          const nameWithoutExtension = sessionName.replace(/\.[^/.]+$/, '');
          setExportSettings(prev => ({
            ...prev,
            file_prefix: nameWithoutExtension + '_'
          }));
        } else {
          // Use default value if not connected or no project name
          setExportSettings(prev => ({
            ...prev,
            file_prefix: 'Project_'
          }));
        }
      } catch (error) {
        console.error('Failed to get project info:', error);
        // Use default value if failed to get info
        setExportSettings(prev => ({
          ...prev,
          file_prefix: 'Project_'
        }));
      }
    };

    fetchSessionInfo();
  }, []);

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
    if (pollTimeoutId) {
      clearTimeout(pollTimeoutId);
      setPollTimeoutId(null);
    }
  };

  // Stop polling and export task
   const stopPolling = async () => {
     if (pollTimeoutId) {
       clearTimeout(pollTimeoutId);
       setPollTimeoutId(null);
     }
     
     // If there's a running task, call the backend API to stop it
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
    console.log('Starting export, selected snapshots count:', selectedSnapshots.length);
    console.log('Selected snapshots:', selectedSnapshots);
    console.log('Export settings:', exportSettings);
    
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
      setSuccess(false);
      
      // Set initial progress state
      setExportProgress({
        task_id: '',
        progress: 0,
        current_snapshot: 0,
        total_snapshots: selectedSnapshots.length,
        current_snapshot_name: '',
        status: 'Preparing export...',
        created_at: new Date().toISOString(),
        result: undefined
      });

      const exportRequest: ExportRequest = {
        snapshots: selectedSnapshots,
        export_settings: exportSettings,
      };

      console.log('Sending export request:', exportRequest);
      const response = await apiService.startExport(exportRequest);
      console.log('Export request response:', response);
      
      if (response.success && response.task_id) {
        console.log('Starting to poll task status, task_id:', response.task_id);
        // Update task_id in progress state
        setExportProgress(prev => prev ? { ...prev, task_id: response.task_id } : null);
        // Start polling task status
        pollExportStatus(response.task_id);
      } else {
        throw new Error(response.message || 'Failed to start export task');
      }
    } catch (error) {
      console.error('Export failed:', error);
      setError(error instanceof Error ? error.message : 'Export failed');
      setIsExporting(false);
      setExportProgress(null);
      if (pollTimeoutId) {
        clearTimeout(pollTimeoutId);
        setPollTimeoutId(null);
      }
    }
  };

  // Poll export status
  const pollExportStatus = async (taskId: string) => {
    const poll = async () => {
      try {
        console.log('Polling export status, task_id:', taskId);
        const response = await apiService.getExportStatus(taskId);
        console.log('Export status response:', response);
        
        if (response.success && response.data) {
          console.log('Updating progress:', response.data);
          setExportProgress(response.data);
          
          const status = response.data.status;
          console.log('Current status:', status);
          
          if (status === 'completed') {
            console.log('Export completed');
            setSuccess(true);
            setIsExporting(false);
            if (pollTimeoutId) {
              clearTimeout(pollTimeoutId);
              setPollTimeoutId(null);
            }
          } else if (status === 'failed' || status === 'completed_with_errors') {
            console.log('Export failed or partially failed:', response.data.result?.error_message);
            setError(response.data.result?.error_message || 'Error occurred during export');
            setIsExporting(false);
            if (pollTimeoutId) {
              clearTimeout(pollTimeoutId);
              setPollTimeoutId(null);
            }
          } else if (status === 'running' || status === 'pending') {
            console.log('Continue polling, check again in 1 second');
            // Continue polling
            const timeoutId = setTimeout(poll, 1000);
            setPollTimeoutId(timeoutId);
          } else if (status === 'cancelled') {
            console.log('Export was cancelled');
            setError('Export was cancelled');
            setIsExporting(false);
            if (pollTimeoutId) {
              clearTimeout(pollTimeoutId);
              setPollTimeoutId(null);
            }
          } else {
            console.log('Unknown status:', status, 'stopping polling');
            setError(`Unknown export status: ${status}`);
            setIsExporting(false);
          }
        } else {
          console.error('Failed to get status, invalid response:', response);
        }
      } catch (error) {
        console.error('Failed to get export status:', error);
        setError('Failed to get export status');
        setIsExporting(false);
        if (pollTimeoutId) {
          clearTimeout(pollTimeoutId);
          setPollTimeoutId(null);
        }
      }
    };

    poll();
  };

  console.log('ExportPanel rendering, received snapshots count:', snapshots.length);
  console.log('Received snapshots data:', snapshots);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      {/* Only show export settings when not exporting and not completed */}
      {!isExporting && !success && (
        <>
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
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-600 text-sm font-medium">⚠️ No snapshots available</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    Please create snapshots in "Step 2: Track Snapshots" first, then proceed with export.
                  </p>
                </div>
              )}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {selectedSnapshots.length} snapshots selected
            </div>
          </div>

          {/* Preset Manager */}
          <PresetManagerComponent
            currentSettings={{
              file_format: exportSettings.file_format,
              mix_source_name: exportSettings.mix_source_name,
              mix_source_type: exportSettings.mix_source_type,
            }}
            onApplyPreset={handleApplyPreset}
          />

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
        </>
      )}

      {/* Export Button */}
      {!success && (
        <div className="flex justify-center space-x-4">
          <button
            onClick={startExport}
            disabled={isExporting || selectedSnapshots.length === 0 || !exportSettings.output_path.trim() || !exportSettings.mix_source_name.trim()}
            className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
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
          
          {isExporting && (
            <button
              onClick={stopPolling}
              className="px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Stop Export
             </button>
           )}
           

         </div>
      )}

      {/* Export Progress */}
      {isExporting && exportProgress && (
        <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">Exporting...</span>
            <span className="text-sm font-semibold text-blue-600">
              {exportProgress.current_snapshot}/{exportProgress.total_snapshots} snapshots
            </span>
          </div>
          
          {/* Main Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Overall Progress</span>
              <span className="text-xs font-medium text-blue-600">
                {Math.round(exportProgress.progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm" 
                style={{ width: `${exportProgress.progress}%` }}
              ></div>
            </div>
          </div>
          
          {/* Current Status Info */}
          <div className="space-y-1">
            {exportProgress.current_snapshot_name && (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                <span className="text-xs text-gray-700">
                  Current Snapshot: <span className="font-medium">{exportProgress.current_snapshot_name}</span>
                </span>
              </div>
            )}
            <div className="text-xs text-gray-600">
              Status: <span className="font-medium">{exportProgress.status}</span>
            </div>
            
            {/* Detailed Status Info */}
            <div className="mt-2 p-2 bg-white rounded border border-blue-100">
              <div className="text-xs text-gray-500 space-y-1">
                <div>Task ID: <span className="font-mono">{exportProgress.task_id}</span></div>
                <div>Created: {new Date(exportProgress.created_at).toLocaleString()}</div>
                {exportProgress.result && (
                  <div className="mt-1">
                    <div>Exported: {exportProgress.result.exported_files?.length || 0} files</div>
                    <div>Failed: {exportProgress.result.failed_snapshots?.length || 0} snapshots</div>
                  </div>
                )}
              </div>
            </div>
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
        <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-800">🎉 Export Completed!</h3>
              <p className="text-sm text-green-600 mt-1">
                Successfully exported <span className="font-bold">{exportProgress.result.exported_files.length}</span> files
              </p>
            </div>
          </div>
          
          {/* Exported Files List */}
          {exportProgress.result.exported_files.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-green-700 mb-2">Exported Files:</h4>
              <div className="bg-white rounded-md p-3 border border-green-100 max-h-48 overflow-y-auto">
                {exportProgress.result.exported_files.map((file, index) => (
                  <div key={index} className="text-xs text-gray-600 py-1 border-b border-gray-100 last:border-b-0">
                    📁 {file}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Failed Information */}
          {exportProgress.result.failed_snapshots.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-600 text-sm font-medium">⚠️ Some snapshots failed to export:</span>
              </div>
              <div className="mt-1 text-sm text-yellow-700">
                {exportProgress.result.failed_snapshots.join(', ')}
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
           <div className="flex space-x-3 mt-4">
             <button
               onClick={async () => {
                 if (exportSettings.output_path) {
                   try {
                     if (window.electronAPI && (window.electronAPI as any).shell) {
                       await (window.electronAPI as any).shell.openPath(exportSettings.output_path);
                     } else {
                       console.log('Electron API not available');
                     }
                   } catch (error) {
                     console.error('Failed to open folder:', error);
                   }
                 } else {
                   console.log('No output path specified');
                 }
               }}
               className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
             >
               <FolderOpen className="h-4 w-4" />
               <span>Open Folder</span>
             </button>
             <button
               onClick={resetState}
               className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
             >
               Continue Export
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default ExportPanel;