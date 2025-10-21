'use client';

import { useState } from 'react';
import { EdgeRankingData } from '@/types';
import { BenzingaStockData, BenzingaEdgeData } from '@/lib/benzinga';

interface TechnicalDataTemplateProps {
  stocks: EdgeRankingData[];
  technicalData: { [symbol: string]: { stockData: BenzingaStockData; edgeData: BenzingaEdgeData } };
  onGenerateArticle: (stocks: EdgeRankingData[]) => void;
  onAddSectorTickers: (stocks: EdgeRankingData[]) => void;
  onCreateMarketNarrative: (stocks: EdgeRankingData[]) => void;
  isGenerating?: boolean;
  rankingCategory?: string;
}

export default function TechnicalDataTemplate({ 
  stocks, 
  technicalData, 
  onGenerateArticle, 
  onAddSectorTickers, 
  onCreateMarketNarrative,
  isGenerating = false,
  rankingCategory = 'Momentum'
}: TechnicalDataTemplateProps) {
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set(stocks.map(s => s.symbol)));

  const handleSelectAll = () => {
    if (selectedStocks.size === stocks.length) {
      setSelectedStocks(new Set());
    } else {
      setSelectedStocks(new Set(stocks.map(stock => stock.symbol)));
    }
  };

  const handleSelectStock = (symbol: string) => {
    const newSelected = new Set(selectedStocks);
    if (newSelected.has(symbol)) {
      newSelected.delete(symbol);
    } else {
      newSelected.add(symbol);
    }
    setSelectedStocks(newSelected);
  };

  const getSelectedStocksData = () => {
    return stocks.filter(stock => selectedStocks.has(stock.symbol));
  };

  return (
    <div className="space-y-6">
      {/* Header with action buttons */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Technical Data Analysis ({stocks.length} stocks)
        </h2>
        
        <div className="flex space-x-3">
          <button
            onClick={() => onGenerateArticle(getSelectedStocksData())}
            disabled={selectedStocks.size === 0 || isGenerating}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating Article...
              </>
            ) : (
              `Generate Article (${selectedStocks.size} selected)`
            )}
          </button>
          
          <button
            onClick={() => onAddSectorTickers(getSelectedStocksData())}
            disabled={selectedStocks.size === 0}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Sector Tickers
          </button>
          
          <button
            onClick={() => onCreateMarketNarrative(getSelectedStocksData())}
            disabled={selectedStocks.size === 0}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Market Narrative
          </button>
        </div>
      </div>

      {/* Select All Checkbox */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={selectedStocks.size === stocks.length}
          onChange={handleSelectAll}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <label className="text-sm text-gray-700">Select All Stocks</label>
      </div>

      {/* Technical Data Cards */}
      <div className="grid gap-6">
        {stocks.map((stock) => {
          const techData = technicalData[stock.symbol];
          const hasTechData = !!techData;
          const { stockData, edgeData } = techData || {};

          // If no technical data, show a simplified view with just Excel data
          if (!hasTechData) {
            return (
              <div key={stock.symbol} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedStocks.has(stock.symbol)}
                      onChange={() => handleSelectStock(stock.symbol)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {stock.companyName} ({stock.symbol})
                    </h3>
                  </div>
                  <div className="text-sm text-gray-500">
                    {stock.sector} • {stock.industry}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Excel Data Only */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Excel Data</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current {rankingCategory} Score:</span>
                        <span className="font-medium">{stock.momentumScore.toFixed(2)}</span>
                      </div>
                      {stock.previousMomentumScore !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{rankingCategory} Score 7 days ago:</span>
                          <span className="font-medium">{stock.previousMomentumScore.toFixed(2)}</span>
                        </div>
                      )}
                      {stock.priceChangePercent !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Delta:</span>
                          <span className={`font-medium ${stock.priceChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stock.priceChangePercent >= 0 ? '+' : ''}{stock.priceChangePercent.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {stock.valueScore !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Value Score:</span>
                          <span className="font-medium">{stock.valueScore.toFixed(2)}</span>
                        </div>
                      )}
                      {stock.growthScore !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Growth Score:</span>
                          <span className="font-medium">{stock.growthScore.toFixed(2)}</span>
                        </div>
                      )}
                      {stock.qualityScore !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Quality Score:</span>
                          <span className="font-medium">{stock.qualityScore.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Company Info */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Company Info</h4>
                    <div className="space-y-2 text-sm">
                      {stock.sector && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sector:</span>
                          <span className="font-medium">{stock.sector}</span>
                        </div>
                      )}
                      {stock.industry && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Industry:</span>
                          <span className="font-medium">{stock.industry}</span>
                        </div>
                      )}
                      {stock.marketCap && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Market Cap:</span>
                          <span className="font-medium">${(stock.marketCap / 1000000000).toFixed(2)}B</span>
                        </div>
                      )}
                      {stock.price && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Price:</span>
                          <span className="font-medium">${stock.price.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          
                      return (
              <div key={stock.symbol} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedStocks.has(stock.symbol)}
                      onChange={() => handleSelectStock(stock.symbol)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {stock.companyName} ({stock.symbol})
                    </h3>
                  </div>
                  <div className="text-sm text-gray-500">
                    {stock.sector} • {stock.industry}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Price & Market Data */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Price & Market Data</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Price:</span>
                        <span className="font-medium">
                          ${stock.price ? stock.price.toFixed(2) : (stockData?.price || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Change:</span>
                        <span className={`font-medium ${(stockData?.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(stockData?.change || 0) >= 0 ? '+' : ''}{(stockData?.change || 0).toFixed(2)} ({(stockData?.changePercent || 0).toFixed(2)}%)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Market Cap:</span>
                        <span className="font-medium">
                          ${stock.marketCap ? (stock.marketCap / 1000000000).toFixed(2) : ((stockData?.marketCap || 0) / 1000000000).toFixed(2)}B
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Volume:</span>
                        <span className="font-medium">{(stockData?.volume || 0).toLocaleString()}</span>
                      </div>
                      {stockData?.dividendYield && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dividend Yield:</span>
                          <span className="font-medium">{stockData.dividendYield.toFixed(2)}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                                  {/* Technical Indicators */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Technical Indicators</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">RSI:</span>
                        <span className="font-medium">{(stockData?.technicalIndicators?.rsi || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">MACD:</span>
                        <span className={`font-medium ${
                          (stockData?.technicalIndicators?.macd || 'Neutral') === 'Bullish' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stockData?.technicalIndicators?.macd || 'Neutral'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">20-Day MA:</span>
                        <span className="font-medium">${(stockData?.technicalIndicators?.movingAverages?.sma20 || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">50-Day MA:</span>
                        <span className="font-medium">${(stockData?.technicalIndicators?.movingAverages?.sma50 || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">200-Day MA:</span>
                        <span className="font-medium">${(stockData?.technicalIndicators?.movingAverages?.sma200 || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Edge Scores */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Edge Scores</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{rankingCategory} Score (Excel):</span>
                        <span className="font-medium">
                          {stock.momentumScore.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Overall Edge (API):</span>
                        <span className="font-medium">
                          {edgeData?.edgeScore ? edgeData.edgeScore.toFixed(2) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Momentum (API):</span>
                        <span className="font-medium">
                          {edgeData?.momentumScore && edgeData.momentumScore > 0 ? edgeData.momentumScore.toFixed(2) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Value (API):</span>
                        <span className="font-medium">
                          {edgeData?.valueScore && edgeData.valueScore > 0 ? edgeData.valueScore.toFixed(2) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Growth (API):</span>
                        <span className="font-medium">
                          {edgeData?.growthScore && edgeData.growthScore > 0 ? edgeData.growthScore.toFixed(2) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Quality (API):</span>
                        <span className="font-medium">
                          {edgeData?.qualityScore && edgeData.qualityScore > 0 ? edgeData.qualityScore.toFixed(2) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Analyst Ratings */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Analyst Ratings</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Buy:</span>
                        <span className="font-medium text-green-600">{stockData?.analystRatings?.buy || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hold:</span>
                        <span className="font-medium text-yellow-600">{stockData?.analystRatings?.hold || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sell:</span>
                        <span className="font-medium text-red-600">{stockData?.analystRatings?.sell || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Target:</span>
                        <span className="font-medium">${(stockData?.analystRatings?.averageTarget || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">High Target:</span>
                        <span className="font-medium">${(stockData?.analystRatings?.highTarget || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Low Target:</span>
                        <span className="font-medium">${(stockData?.analystRatings?.lowTarget || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* News Sentiment */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">News Sentiment</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bullish:</span>
                        <span className="font-medium text-green-600">{stockData?.newsSentiment?.bullish || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bearish:</span>
                        <span className="font-medium text-red-600">{stockData?.newsSentiment?.bearish || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Neutral:</span>
                        <span className="font-medium text-gray-600">{stockData?.newsSentiment?.neutral || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Articles:</span>
                        <span className="font-medium">{stockData?.newsSentiment?.totalArticles || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Support & Resistance */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Support & Resistance</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Support:</span>
                        <span className="font-medium">${(stockData?.technicalIndicators?.support || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Resistance:</span>
                        <span className="font-medium">${(stockData?.technicalIndicators?.resistance || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                {/* Excel Data Summary */}
                {(stock.previousMomentumScore !== undefined || stock.priceChangePercent !== undefined) && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Excel Data Summary</h4>
                    <div className="space-y-2 text-sm">
                      {stock.previousMomentumScore !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Score 7 days ago:</span>
                          <span className="font-medium">{stock.previousMomentumScore.toFixed(2)}</span>
                        </div>
                      )}
                      {stock.priceChangePercent !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Delta:</span>
                          <span className={`font-medium ${stock.priceChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stock.priceChangePercent >= 0 ? '+' : ''}{stock.priceChangePercent.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {stock.sector && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sector:</span>
                          <span className="font-medium">{stock.sector}</span>
                        </div>
                      )}
                      {stock.industry && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Industry:</span>
                          <span className="font-medium">{stock.industry}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 