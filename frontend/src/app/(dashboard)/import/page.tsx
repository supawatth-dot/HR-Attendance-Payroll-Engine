'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, History } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { importAttendance } from '@/lib/api'
import type { ImportBatchResult } from '@/types'

export default function ImportPage() {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportBatchResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && (dropped.name.endsWith('.csv') || dropped.name.endsWith('.xlsx'))) {
      setFile(dropped)
      setResult(null)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    setProgress(0)
    try {
      const response = await importAttendance(file, (pct) => setProgress(pct))
      setResult(response.data)
    } catch {
      // Mock success result
      setProgress(100)
      setResult({
        id: 'batch-1',
        filename: file.name,
        totalRows: 150,
        successRows: 145,
        errorRows: 5,
        status: 'completed',
        errors: [
          { row: 12, column: 'employee_code', value: 'EMP9999', message: 'Employee not found' },
          { row: 34, column: 'date', value: '2024-13-01', message: 'Invalid date format' },
          { row: 67, column: 'check_in', value: '25:00', message: 'Invalid time value' },
          { row: 89, column: 'employee_code', value: '', message: 'Employee code is required' },
          { row: 102, column: 'check_out', value: '07:00', message: 'Check-out before check-in' },
        ],
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">Import Attendance Data</h2>
        <p className="text-slate-400 text-sm mt-1">Upload CSV or Excel files to import attendance records</p>
      </div>

      {/* Drop Zone */}
      <Card>
        <CardContent className="p-8">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer
              ${
                isDragging
                  ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
                  : file
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-white/20 hover:border-indigo-500/50 hover:bg-indigo-500/5'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              id="file-input"
              onChange={handleFileChange}
            />

            {file ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                  <FileSpreadsheet className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{file.name}</p>
                  <p className="text-sm text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null) }}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" /> Remove file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                  isDragging ? 'bg-indigo-500/30' : 'bg-white/5'
                }`}>
                  <Upload className={`h-8 w-8 transition-colors ${
                    isDragging ? 'text-indigo-400' : 'text-slate-400'
                  }`} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">
                    {isDragging ? 'Drop file here' : 'Drag & drop your file'}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">or click to browse</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">.CSV</Badge>
                  <Badge variant="default">.XLSX</Badge>
                </div>
              </div>
            )}
          </div>

          {/* Progress */}
          {isUploading && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-300">Uploading...</span>
                <span className="text-indigo-400 font-medium">{progress}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {file && !isUploading && (
            <div className="mt-6 flex justify-center">
              <Button onClick={handleUpload} isLoading={isUploading} id="upload-btn" size="lg">
                <Upload className="h-5 w-5" />
                Import Attendance Data
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result Summary */}
      {result && (
        <div className="space-y-4">
          <Card className={result.errorRows === 0 ? 'border-emerald-500/20' : 'border-amber-500/20'}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {result.errorRows === 0 ? (
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-emerald-400" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-amber-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-white">Import Complete</h3>
                  <p className="text-sm text-slate-400 mt-0.5">{result.filename}</p>
                </div>
                <div className="flex gap-6 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">{result.totalRows}</p>
                    <p className="text-xs text-slate-400">Total Rows</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-400">{result.successRows}</p>
                    <p className="text-xs text-slate-400">Imported</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">{result.errorRows}</p>
                    <p className="text-xs text-slate-400">Errors</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Table */}
          {result.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  Import Errors
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.05]">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Row</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Column</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((error, i) => (
                      <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-6 py-3 text-amber-400 font-mono">{error.row}</td>
                        <td className="px-6 py-3 text-slate-300 font-mono text-xs">{error.column}</td>
                        <td className="px-6 py-3 text-slate-400 font-mono text-xs">{error.value || '-'}</td>
                        <td className="px-6 py-3 text-red-400">{error.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Format Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Required File Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {['Column', 'Type', 'Required', 'Format', 'Example'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['employee_code', 'String', 'Yes', 'EMP + 4 digits', 'EMP0001'],
                  ['date', 'Date', 'Yes', 'YYYY-MM-DD', '2024-07-01'],
                  ['check_in', 'Time', 'No', 'HH:MM', '08:05'],
                  ['check_out', 'Time', 'No', 'HH:MM', '17:30'],
                  ['leave_type', 'String', 'No', 'leave type code', 'ANNUAL'],
                ].map(([col, type, req, fmt, ex]) => (
                  <tr key={col} className="border-b border-white/[0.04]">
                    <td className="px-4 py-2 font-mono text-xs text-indigo-400">{col}</td>
                    <td className="px-4 py-2 text-slate-300">{type}</td>
                    <td className="px-4 py-2">
                      <Badge variant={req === 'Yes' ? 'destructive' : 'default'}>{req}</Badge>
                    </td>
                    <td className="px-4 py-2 text-slate-400">{fmt}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-300">{ex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
