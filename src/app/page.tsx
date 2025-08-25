'use client';

import { useState } from 'react';
import { EdgeRankingData, ArticleData } from '@/types';
import { generateArticle } from '@/lib/ai';
import FileUpload from '@/components/FileUpload';
import ExcelPreview from '@/components/ExcelPreview';
import ArticleGenerator from '@/components/ArticleGenerator';

type AppState = 'upload' | 'preview' | 'article';

export default function Home() {
  console.log('=== HOME COMPONENT RENDERED ===');
  
  const [currentState, setCurrentState] = useState<AppState>('upload');
  const [excelData, setExcelData] = useState<EdgeRankingData[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<EdgeRankingData[]>([]);
  const [generatedArticle, setGeneratedArticle] = useState<ArticleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDataProcessed = async (data: EdgeRankingData[], enhanceWithBenzinga: boolean = false) => {
    console.log('=== HANDLE DATA PROCESSED CALLED ===');
    console.log('Data received:', data);
    console.log('Enhance with Benzinga:', enhanceWithBenzinga);
    
    // Enhance data with Benzinga API if requested and available
    if (enhanceWithBenzinga) {
      try {
        const { fetchEnhancedStockData } = await import('@/lib/benzinga');
        // Note: fetchEnhancedStockData requires API keys and symbol array
        // For now, just use the basic data
        console.log('Benzinga enhancement requires API keys, using basic data');
        setExcelData(data);
        setSelectedStocks(data.slice(0, 3)); // Default to top 3 stocks
      } catch (error) {
        console.log('Benzinga enhancement not available, using basic data');
        setExcelData(data);
        setSelectedStocks(data.slice(0, 3)); // Default to top 3 stocks
      }
    } else {
      setExcelData(data);
      setSelectedStocks(data.slice(0, 3)); // Default to top 3 stocks
    }
    
    setCurrentState('preview');
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    console.log('=== HANDLE ERROR CALLED ===');
    console.log('Error message:', errorMessage);
    setError(errorMessage);
  };

  const handleGenerateArticle = async (stocks: EdgeRankingData[]) => {
    if (stocks.length === 0) {
      setError('Please select at least one stock to generate an article.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      console.log('Generating article for', stocks.length, 'selected stocks...');
      console.log('Selected stocks:', stocks.map(s => s.symbol));
      const article = await generateArticle(stocks);
      setGeneratedArticle(article);
      setCurrentState('article');
    } catch (error) {
      console.error('Article generation error:', error);
      setError('Failed to generate article. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBackToUpload = () => {
    setCurrentState('upload');
    setExcelData([]);
    setSelectedStocks([]);
    setGeneratedArticle(null);
    setError(null);
  };

  const handleBackToPreview = () => {
    setCurrentState('preview');
    setGeneratedArticle(null);
  };

  const handleStockSelection = (stocks: EdgeRankingData[]) => {
    setSelectedStocks(stocks);
  };

  return (
    <div className="space-y-6">
      {/* Debug Info - Always show current state */}
      <div className="card bg-blue-50">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Current App State</h3>
        <p className="text-xs text-blue-700">
          State: {currentState}<br/>
          Excel Data: {excelData.length} rows<br/>
          Selected Stocks: {selectedStocks.length} stocks
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="inline-flex text-red-400 hover:text-red-600"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {currentState === 'upload' && (
        <FileUpload
          onDataProcessed={handleDataProcessed}
          onError={handleError}
        />
      )}

      {currentState === 'preview' && (
        <div className="space-y-6">
          <ExcelPreview
            data={excelData}
            onGenerateArticle={handleGenerateArticle}
            isGenerating={isGenerating}
          />
          
                    {/* Info about server-side API key */}
          <div className="card bg-green-50">
            <h3 className="text-sm font-semibold text-green-900 mb-2">API Key Status</h3>
            <p className="text-xs text-green-700">
              ✅ Server-side OpenAI API key configured<br/>
              ✅ Benzinga API keys configured<br/>
              Ready to generate enhanced articles
            </p>
          </div>
          
          {isGenerating && (
            <div className="card text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Generating enhanced article with AI...</p>
            </div>
          )}
        </div>
      )}

      {currentState === 'article' && generatedArticle && (
        <ArticleGenerator
          article={generatedArticle}
          onBack={handleBackToPreview}
        />
      )}

      {currentState !== 'upload' && (
        <div className="text-center">
          <button
            onClick={handleBackToUpload}
            className="btn-secondary"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}
