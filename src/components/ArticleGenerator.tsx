'use client';

import { useState } from 'react';
import { ArticleData } from '@/types';
import { formatArticleForDisplay } from '@/lib/ai';
import { DocumentArrowDownIcon, ClipboardDocumentIcon, SparklesIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';

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

  const handleDownloadText = () => {
    const formattedArticle = formatArticleForDisplay(currentArticle);
    const blob = new Blob([formattedArticle], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edge-rankings-article.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        setShowNarrativeModal(false);
        
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
            className="btn-secondary flex items-center space-x-2"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
          </button>
          
          <button
            onClick={handleDownloadText}
            className="btn-primary flex items-center space-x-2"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            <span>Download as Text</span>
          </button>
        </div>
      </div>

      <div className="card">
        <div className="prose max-w-none">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {currentArticle.title}
          </h1>
          
          <p className="text-lg text-gray-700 mb-6">
            {currentArticle.introduction}
          </p>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Momentum Stocks To Add To Your Watchlist
          </h2>
          
          <p className="text-gray-700 mb-6">
            Benzinga's Edge Stock Rankings system assigns scores based on momentum, growth, value and quality. The momentum score is a valuable metric for short-term trading strategies that aim to capture continuation of price trends.
          </p>
          
          <p className="text-gray-700 mb-8">
            Identifying significant changes in momentum can help traders get ahead of potential changes in general stock direction. Benzinga's rankings system flagged {currentArticle.stocks.length} stocks that saw significant swings in bullish momentum over the past week.
          </p>
          
          <div className="space-y-6">
            {currentArticle.stocks.map((stock, index) => formatStockSection(stock, index))}
          </div>
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
