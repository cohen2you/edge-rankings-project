'use client';

import { useState } from 'react';
import { ArticleData } from '@/types';
import { formatArticleForDisplay } from '@/lib/ai';
import { ClipboardDocumentIcon, SparklesIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';

interface ArticleGeneratorProps {
  article: ArticleData;
  onBack: () => void;
}

interface NarrativeStory {
  id: string;
  title: string;
  summary: string;
  published: string;
  url: string;
  author: string;
}

export default function ArticleGenerator({ article, onBack }: ArticleGeneratorProps) {
  const [copied, setCopied] = useState(false);
  const [showNarrativeModal, setShowNarrativeModal] = useState(false);
  const [narrativeStories, setNarrativeStories] = useState<NarrativeStory[]>([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [selectedStory, setSelectedStory] = useState<NarrativeStory | null>(null);
  const [generatingNarrative, setGeneratingNarrative] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<ArticleData>(article);
  const [articleHistory, setArticleHistory] = useState<ArticleData[]>([article]);
  const [sectorTickers, setSectorTickers] = useState<any[]>([]);
  const [loadingSectorTickers, setLoadingSectorTickers] = useState(false);
  const [showSectorTickers, setShowSectorTickers] = useState(false);
  const [selectedSectorTickers, setSelectedSectorTickers] = useState<Set<string>>(new Set());
  const [addingTickersToArticle, setAddingTickersToArticle] = useState(false);

  const handleCopyToClipboard = async () => {
    const formattedArticle = formatArticleForDisplay(currentArticle);
    try {
      await navigator.clipboard.writeText(formattedArticle);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };



  const handleCreateNarrative = async () => {
    console.log('Create Market Narrative button clicked!');
    setLoadingStories(true);
    try {
      const response = await fetch('/api/fetch-narrative-stories');
      if (response.ok) {
        const data = await response.json();
        console.log('Narrative stories fetched:', data.stories);
        console.log('API response:', data.message);
        setNarrativeStories(data.stories);
        setShowNarrativeModal(true);
      } else {
        console.error('Failed to fetch narrative stories');
      }
    } catch (error) {
      console.error('Error fetching narrative stories:', error);
    } finally {
      setLoadingStories(false);
    }
  };

  const handleStorySelect = async (story: NarrativeStory) => {
    console.log('=== HANDLE STORY SELECT CALLED ===');
    console.log('Story selected:', story.title);
    console.log('Story object:', story);
    
    // Close the modal immediately when button is clicked
    setShowNarrativeModal(false);
    
    setSelectedStory(story);
    setGeneratingNarrative(true);
    try {
      console.log('Calling generate-narrative-article API...');
      console.log('Original article:', currentArticle);
      console.log('Selected story:', story);
      
      const response = await fetch('/api/generate-narrative-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalArticle: currentArticle,
          selectedStory: story
        }),
      });

      console.log('API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Narrative article generated:', data);
        const newArticle = data.article;
        
        // Add to history and update current article
        setArticleHistory(prev => [...prev, newArticle]);
        setCurrentArticle(newArticle);
        
        console.log('Article updated successfully');
      } else {
        const errorText = await response.text();
        console.error('Failed to generate narrative article:', errorText);
        alert('Failed to generate narrative article. Please try again.');
      }
    } catch (error) {
      console.error('Error generating narrative article:', error);
      alert('Error generating narrative article. Please try again.');
    } finally {
      setGeneratingNarrative(false);
    }
  };

  const handleUndo = () => {
    if (articleHistory.length > 1) {
      const newHistory = articleHistory.slice(0, -1);
      setArticleHistory(newHistory);
      setCurrentArticle(newHistory[newHistory.length - 1]);
    }
  };

  const handleFetchSectorTickers = async () => {
    setLoadingSectorTickers(true);
    try {
      console.log('Fetching sector tickers...');
      const response = await fetch('/api/fetch-sector-tickers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stocks: currentArticle.stocks
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Sector tickers fetched:', data);
        setSectorTickers(data.sectorTickers);
        setShowSectorTickers(true);
        setSelectedSectorTickers(new Set()); // Reset selection
      } else {
        console.error('Failed to fetch sector tickers');
      }
    } catch (error) {
      console.error('Error fetching sector tickers:', error);
    } finally {
      setLoadingSectorTickers(false);
    }
  };

  const handleAddTickersToArticle = async () => {
    if (selectedSectorTickers.size === 0) {
      alert('Please select at least one ticker to add to the article.');
      return;
    }

    if (selectedSectorTickers.size > 4) {
      alert('Maximum 4 tickers allowed.');
      return;
    }

    setAddingTickersToArticle(true);
    try {
      const selectedTickers = sectorTickers.filter(ticker => 
        selectedSectorTickers.has(ticker.symbol)
      );

      console.log('Adding tickers to article...');
      const response = await fetch('/api/add-tickers-to-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          article: currentArticle,
          selectedTickers
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Tickers added to article:', data);
        
        // Update the article with the new version
        setCurrentArticle(data.article);
        setArticleHistory([...articleHistory, data.article]);
        
        // Hide the sector tickers section
        setShowSectorTickers(false);
        setSelectedSectorTickers(new Set());
      } else {
        console.error('Failed to add tickers to article');
      }
    } catch (error) {
      console.error('Error adding tickers to article:', error);
    } finally {
      setAddingTickersToArticle(false);
    }
  };

  const handleSelectSectorTicker = (symbol: string) => {
    const newSelected = new Set(selectedSectorTickers);
    if (newSelected.has(symbol)) {
      newSelected.delete(symbol);
    } else {
      if (newSelected.size < 4) {
        newSelected.add(symbol);
      } else {
        alert('Maximum 4 tickers allowed.');
      }
    }
    setSelectedSectorTickers(newSelected);
  };

  const formatStockSection = (stock: any, index: number) => {
    // Use proper ranking language based on position
    let rankingText;
    if (index === 0) {
      rankingText = `experienced the largest week-over-week increase in momentum score`;
    } else if (index === 1) {
      rankingText = `saw the second-largest week-over-week increase in momentum score`;
    } else if (index === 2) {
      rankingText = `recorded the third-largest week-over-week increase in momentum score`;
    } else {
      rankingText = `showed a significant week-over-week increase in momentum score`;
    }

    return (
      <div key={stock.symbol} className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {stock.companyName} Inc
        </h3>
        <p className="text-sm text-gray-600 mb-3">({stock.symbol})</p>
        
        <p className="text-gray-700 mb-4">
          {rankingText}, moving from a score of {stock.previousMomentum.toFixed(2)} to a current score of {stock.currentMomentum.toFixed(2)}. {stock.companyName} shares are up about {Math.abs(stock.priceChangePercent).toFixed(0)}% over the past week, according to Benzinga Pro.
        </p>
        
        <p className="text-gray-700 mb-4">{stock.technicalAnalysis}</p>
        
        {stock.fundamentalAnalysis && (
          <p className="text-gray-700 mb-4">{stock.fundamentalAnalysis}</p>
        )}
        
        {stock.analystInsights && (
          <p className="text-gray-700 mb-4">{stock.analystInsights}</p>
        )}
        
        {index < currentArticle.stocks.length - 1 && <hr className="my-6 border-gray-200" />}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <button
          onClick={onBack}
          className="btn-secondary"
        >
          ← Back to Data
        </button>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCreateNarrative}
            disabled={loadingStories || generatingNarrative}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SparklesIcon className="h-4 w-4" />
            <span>
              {loadingStories ? 'Loading...' : 
               generatingNarrative ? 'Generating...' : 
               'Create Market Narrative'}
            </span>
          </button>

          <button
            onClick={handleFetchSectorTickers}
            disabled={loadingSectorTickers}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingSectorTickers ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <SparklesIcon className="h-4 w-4" />
            )}
            <span>{loadingSectorTickers ? 'Fetching...' : 'Fetch Sector Tickers'}</span>
          </button>

          {articleHistory.length > 1 && (
            <button
              onClick={handleUndo}
              className="btn-secondary flex items-center space-x-2"
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
              <span>Undo</span>
            </button>
          )}

          <button
            onClick={handleCopyToClipboard}
            className="btn-primary flex items-center space-x-2"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            <span>{copied ? 'Copied!' : 'Copy Article'}</span>
          </button>
        </div>
      </div>

      <div className="card">
        <div className="prose max-w-none">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {currentArticle.title}
          </h1>
          
          <div className="text-lg text-gray-700 leading-relaxed">
            {currentArticle.introduction.split('\n\n').map((paragraph, index) => (
              <p key={index} className="mb-4">
                {paragraph.trim().split('**').map((part, partIndex) => 
                  partIndex % 2 === 1 ? (
                    <strong key={partIndex}>{part}</strong>
                  ) : (
                    part
                  )
                )}
              </p>
            ))}
          </div>
          
          {/* Stock sections are now integrated into the narrative, so we don't display them separately */}

          {/* Sector Tickers Selection Section */}
          {showSectorTickers && sectorTickers.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Sector Tickers for Comparison
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddTickersToArticle}
                    disabled={selectedSectorTickers.size === 0 || addingTickersToArticle}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingTickersToArticle ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <SparklesIcon className="h-4 w-4" />
                    )}
                    <span>
                      {addingTickersToArticle ? 'Adding...' : 
                       `Add ${selectedSectorTickers.size} Ticker${selectedSectorTickers.size !== 1 ? 's' : ''} To Article`}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setShowSectorTickers(false);
                      setSelectedSectorTickers(new Set());
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 mb-4">
                Select up to 4 sector tickers to add peer comparison to your article:
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectorTickers.map((ticker) => (
                  <div 
                    key={ticker.symbol}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedSectorTickers.has(ticker.symbol)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleSelectSectorTicker(ticker.symbol)}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedSectorTickers.has(ticker.symbol)}
                        onChange={() => handleSelectSectorTicker(ticker.symbol)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {ticker.symbol}
                        </h3>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs auto-rows-auto">
                          <div>
                            <span className="text-gray-500">Price:</span>
                            <span className="ml-1 font-medium">${ticker.price}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Market Cap:</span>
                            <span className="ml-1 font-medium">${ticker.marketCap}B</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Edge Score:</span>
                            <span className="ml-1 font-medium">{ticker.edgeScore}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">{currentArticle.rankingCategory || 'Momentum'}:</span>
                            <span className="ml-1 font-medium">
                              {(() => {
                                const category = currentArticle.rankingCategory || 'Momentum';
                                if (category === 'Value') return ticker.valueScore || 'N/A';
                                if (category === 'Growth') return ticker.growthScore || 'N/A';
                                if (category === 'Quality') return ticker.qualityScore || 'N/A';
                                return ticker.momentumScore || 'N/A';
                              })()}
                            </span>
                          </div>
                          {/* Show all other Edge scores */}
                          {ticker.momentumScore && currentArticle.rankingCategory !== 'Momentum' && (
                            <div>
                              <span className="text-gray-500">Momentum:</span>
                              <span className="ml-1 font-medium">{ticker.momentumScore}</span>
                            </div>
                          )}
                          {ticker.valueScore && currentArticle.rankingCategory !== 'Value' && (
                            <div>
                              <span className="text-gray-500">Value:</span>
                              <span className="ml-1 font-medium">{ticker.valueScore}</span>
                            </div>
                          )}
                          {ticker.growthScore && currentArticle.rankingCategory !== 'Growth' && (
                            <div>
                              <span className="text-gray-500">Growth:</span>
                              <span className="ml-1 font-medium">{ticker.growthScore}</span>
                            </div>
                          )}
                          {ticker.qualityScore && currentArticle.rankingCategory !== 'Quality' && (
                            <div>
                              <span className="text-gray-500">Quality:</span>
                              <span className="ml-1 font-medium">{ticker.qualityScore}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Narrative Stories Modal */}
      {showNarrativeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Select a Market Narrative Story
              </h2>
              <button
                onClick={() => setShowNarrativeModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
                             {narrativeStories.map((story) => (
                 <div
                   key={story.id}
                   className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                   onClick={(e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     console.log('Story clicked:', story.title);
                     console.log('Story data:', story);
                     handleStorySelect(story);
                   }}
                   onMouseDown={(e) => {
                     e.preventDefault();
                     console.log('Mouse down on story:', story.title);
                   }}
                 >
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {story.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-2">
                    {story.summary}
                  </p>
                  <p className="text-gray-500 text-xs">
                    Published: {new Date(story.published).toLocaleDateString()}
                  </p>
                                     <p className="text-blue-600 text-xs mt-2">
                     Click to integrate this narrative into your article
                   </p>
                   <button
                     className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                     onClick={(e) => {
                       e.preventDefault();
                       e.stopPropagation();
                       console.log('Button clicked for story:', story.title);
                       handleStorySelect(story);
                     }}
                   >
                     Integrate This Story
                   </button>
                 </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
