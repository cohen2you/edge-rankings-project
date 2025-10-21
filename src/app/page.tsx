'use client';

import { useState } from 'react';
import { EdgeRankingData, ArticleData } from '@/types';
import { generateArticle } from '@/lib/ai';
import FileUpload from '@/components/FileUpload';
import ExcelPreview from '@/components/ExcelPreview';
import TechnicalDataTemplate from '@/components/TechnicalDataTemplate';
import ArticleGenerator from '@/components/ArticleGenerator';

type AppState = 'upload' | 'preview' | 'technical-data' | 'article';

export default function Home() {
  const [currentState, setCurrentState] = useState<AppState>('upload');
  const [excelData, setExcelData] = useState<EdgeRankingData[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<EdgeRankingData[]>([]);
  const [generatedArticle, setGeneratedArticle] = useState<ArticleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [technicalDataGenerated, setTechnicalDataGenerated] = useState(false);
  const [technicalData, setTechnicalData] = useState<{ [symbol: string]: any }>({});
  const [rankingCategory, setRankingCategory] = useState<string>('Momentum');

  const handleDataProcessed = async (data: EdgeRankingData[], rankingCategory: string, enhanceWithBenzinga: boolean = false) => {
    // Store the ranking category
    setRankingCategory(rankingCategory);
    
    // Enhance data with Benzinga API if requested and available
    if (enhanceWithBenzinga) {
      try {
        const { fetchEnhancedStockData } = await import('@/lib/benzinga');
        // Note: fetchEnhancedStockData requires API keys and symbol array
        // For now, just use the basic data
        setExcelData(data);
        // Don't auto-select stocks - let user choose
        setSelectedStocks([]);
      } catch (error) {
        setExcelData(data);
        // Don't auto-select stocks - let user choose
        setSelectedStocks([]);
      }
    } else {
      setExcelData(data);
      // Don't auto-select stocks - let user choose
      setSelectedStocks([]);
    }
    
    setCurrentState('preview');
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleGenerateTechnicalData = async (stocks: EdgeRankingData[]) => {
    if (stocks.length === 0) {
      setError('Please select at least one stock to generate technical data.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Call the API route to generate technical data
      const response = await fetch('/api/generate-technical-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stocks }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate technical data');
      }

      const { technicalData } = await response.json();
      
      setSelectedStocks(stocks);
      setTechnicalData(technicalData);
      setTechnicalDataGenerated(true);
      setCurrentState('technical-data');
    } catch (error) {
      console.error('Technical data generation error:', error);
      // If Benzinga API fails, still allow viewing Excel data
      setError('Benzinga API unavailable. Showing Excel data only.');
      setSelectedStocks(stocks);
      setTechnicalDataGenerated(true);
      setCurrentState('technical-data');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateArticle = async (stocks: EdgeRankingData[]) => {
    if (stocks.length === 0) {
      setError('Please select at least one stock to generate an article.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const article = await generateArticle(stocks, rankingCategory);
      setGeneratedArticle(article);
      setCurrentState('article');
    } catch (error) {
      console.error('Article generation error:', error);
      setError('Failed to generate article. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddSectorTickers = async (stocks: EdgeRankingData[]) => {
    if (stocks.length === 0) {
      setError('Please select at least one stock to add sector tickers.');
      return;
    }

    try {
      // This would fetch sector comparison data
      console.log('Adding sector tickers for:', stocks.map(s => s.symbol));
    } catch (error) {
      console.error('Sector tickers error:', error);
      setError('Failed to add sector tickers. Please try again.');
    }
  };

  const handleCreateMarketNarrative = async (stocks: EdgeRankingData[]) => {
    if (stocks.length === 0) {
      setError('Please select at least one stock to create market narrative.');
      return;
    }

    try {
      // This would integrate market narrative
      console.log('Creating market narrative for:', stocks.map(s => s.symbol));
    } catch (error) {
      console.error('Market narrative error:', error);
      setError('Failed to create market narrative. Please try again.');
    }
  };

  const handleViewExcelDataOnly = (stocks: EdgeRankingData[]) => {
    if (stocks.length === 0) {
      setError('Please select at least one stock to view.');
      return;
    }

    // Set selected stocks and go directly to technical data view
    setSelectedStocks(stocks);
    setTechnicalDataGenerated(true);
    setCurrentState('technical-data');
    setError(null);
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
    // Reset technical data state so users can regenerate if needed
    setTechnicalDataGenerated(false);
    setTechnicalData({});
  };

  const handleStockSelection = (stocks: EdgeRankingData[]) => {
    setSelectedStocks(stocks);
  };

  return (
    <div className="space-y-6">

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
            onGenerateTechnicalData={handleGenerateTechnicalData}
            onAddSectorTickers={handleAddSectorTickers}
            onCreateMarketNarrative={handleCreateMarketNarrative}
            onViewExcelDataOnly={handleViewExcelDataOnly}
            isGenerating={isGenerating}
            technicalDataGenerated={technicalDataGenerated}
            rankingCategory={rankingCategory}
          />
          
          {isGenerating && (
            <div className="card text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Generating technical data...</p>
            </div>
          )}
        </div>
      )}

      {currentState === 'technical-data' && (
        <div className="space-y-6">
          {selectedStocks.length === 0 ? (
            <div className="card text-center">
              <p className="text-gray-600">No stocks selected. Please go back and select stocks to view.</p>
              <button
                onClick={handleBackToPreview}
                className="btn-secondary mt-4"
              >
                Back to Preview
              </button>
            </div>
          ) : (
            <TechnicalDataTemplate
              stocks={selectedStocks}
              technicalData={technicalData}
              onGenerateArticle={handleGenerateArticle}
              onAddSectorTickers={handleAddSectorTickers}
              onCreateMarketNarrative={handleCreateMarketNarrative}
              isGenerating={isGenerating}
              rankingCategory={rankingCategory}
            />
          )}
          
          {isGenerating && (
            <div className="card text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Generating article...</p>
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
            onClick={handleBackToPreview}
            className="btn-secondary"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}
