'use client';

import { useState, useRef } from 'react';
import { CloudArrowUpIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { parseExcelFile, validateEdgeRankingsData } from '@/lib/excel';
import { EdgeRankingData } from '@/types';

interface FileUploadProps {
  onDataProcessed: (data: EdgeRankingData[], enhanceWithBenzinga?: boolean) => void;
  onError: (error: string) => void;
}

export default function FileUpload({ onDataProcessed, onError }: FileUploadProps) {
  console.log('=== FILE UPLOAD COMPONENT RENDERED ===');
  
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [enhanceWithBenzinga, setEnhanceWithBenzinga] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      onError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);

    try {
      console.log('=== FILE UPLOAD DEBUG START ===');
      console.log('Processing file:', file.name, 'Size:', file.size, 'bytes');
      console.log('File type:', file.type);
      
      const data = await parseExcelFile(file);
      console.log('=== PARSED DATA RESULT ===');
      console.log('Data length:', data.length);
      console.log('Data type:', typeof data);
      console.log('Full data:', data);
      
      const validation = validateEdgeRankingsData(data);
      console.log('=== VALIDATION RESULT ===');
      console.log('Is valid:', validation.isValid);
      console.log('Errors:', validation.errors);

      if (!validation.isValid) {
        console.log('Validation failed, showing error to user');
        onError(`Validation failed: ${validation.errors.join(', ')}`);
        return;
      }

      if (data.length === 0) {
        console.log('Data length is 0, showing error to user');
        onError('No valid stock data found in the Excel file. Please check that your file contains the required columns (Symbol, Company Name, Momentum Score).');
        return;
      }

      console.log('=== SUCCESS - CALLING onDataProcessed ===');
      onDataProcessed(data, enhanceWithBenzinga);
    } catch (error) {
      console.error('=== FILE PROCESSING ERROR ===');
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : error);
      console.error('Full error:', error);
      onError(`Failed to process Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      console.log('=== FILE UPLOAD DEBUG END ===');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    console.log('=== UPLOAD AREA CLICKED ===');
    fileInputRef.current?.click();
  };

  return (
    <div className="card">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Upload Benzinga Edge Rankings Excel File
        </h2>
        <p className="text-gray-600 mb-6">
          Drag and drop your Excel file here or click to browse
        </p>
        
        <div className="mb-6">
          <label className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={enhanceWithBenzinga}
              onChange={(e) => setEnhanceWithBenzinga(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-2"
            />
            <span className="text-sm text-gray-700">
              Enhance with Benzinga Edge API data (requires API key)
            </span>
          </label>
        </div>

        <div
          className={`upload-area ${isDragging ? 'dragover' : ''} ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={!isProcessing ? handleClick : undefined}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
              <p className="text-gray-600">Processing {fileName}...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">
                <span className="font-medium text-primary-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-gray-500">Excel files only (.xlsx, .xls)</p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileInput}
          className="hidden"
        />

        {fileName && !isProcessing && (
          <div className="mt-4 flex items-center justify-center text-sm text-gray-600">
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            {fileName}
          </div>
        )}
      </div>
    </div>
  );
}
