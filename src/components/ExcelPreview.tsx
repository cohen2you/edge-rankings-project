'use client';

import { useState } from 'react';
import { EdgeRankingData } from '@/types';
import { sortByMomentumChange, getBiggestMovers, getTopGainersBySector } from '@/lib/excel';
import { ChevronUpIcon, ChevronDownIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
// import BiggestMoversSummary from './BiggestMoversSummary';

interface ExcelPreviewProps {
  data: EdgeRankingData[];
  onGenerateArticle: (selectedStocks: EdgeRankingData[]) => void;
  isGenerating?: boolean;
}

export default function ExcelPreview({ data, onGenerateArticle, isGenerating = false }: ExcelPreviewProps) {
  const [sortField, setSortField] = useState<keyof EdgeRankingData>('momentumScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());
  const [analysisView, setAnalysisView] = useState<'all' | 'biggest-movers' | 'top-gainers-by-sector'>('all');

  const handleSort = (field: keyof EdgeRankingData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getDisplayData = () => {
    switch (analysisView) {
      case 'biggest-movers':
        return getBiggestMovers(data, 20);
      case 'top-gainers-by-sector':
        // For sector view, we'll flatten the sector groups into a single list
        const sectorGroups = getTopGainersBySector(data, 5);
        return sectorGroups.flatMap(group => group.stocks);
      default:
        return [...data].sort((a, b) => {
          const aValue = a[sortField];
          const bValue = b[sortField];
          
          if (typeof aValue === 'number' && typeof bValue === 'number') {
            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
          }
          
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortDirection === 'asc' 
              ? aValue.localeCompare(bValue) 
              : bValue.localeCompare(aValue);
          }
          
          return 0;
        });
    }
  };

  const sortedData = getDisplayData();

  const handleSelectAll = () => {
    if (selectedStocks.size === data.length) {
      setSelectedStocks(new Set());
    } else {
      setSelectedStocks(new Set(data.map(stock => stock.symbol)));
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

  const getSortIcon = (field: keyof EdgeRankingData) => {
    if (sortField !== field) {
      return <ChevronUpIcon className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="h-4 w-4 text-primary-600" />
      : <ChevronDownIcon className="h-4 w-4 text-primary-600" />;
  };

  const formatValue = (value: any, field: string) => {
    if (value === null || value === undefined) return '-';
    
    if (typeof value === 'number') {
      if (field.includes('Score') || field.includes('RSI')) {
        return value.toFixed(2);
      }
      if (field.includes('Price') || field.includes('MA')) {
        return `$${value.toFixed(2)}`;
      }
      if (field.includes('Cap')) {
        return `$${(value / 1000000000).toFixed(2)}B`;
      }
      if (field.includes('Percent')) {
        return `${value.toFixed(1)}%`;
      }
      if (field.includes('momentumChange')) {
        const sign = value > 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}`;
      }
      return value.toFixed(2);
    }
    
    return value.toString();
  };

  // const findDuplicates = (stocks: EdgeRankingData[]) => {
  //   const stockGroups = new Map<string, EdgeRankingData[]>();
    
  //   // Group stocks by symbol + company name
  //   stocks.forEach(stock => {
  //     const key = `${stock.symbol.toUpperCase()}_${stock.companyName.toLowerCase().replace(/\s+/g, '')}`;
  //     if (!stockGroups.has(key)) {
  //       stockGroups.set(key, []);
  //     }
  //     stockGroups.get(key)!.push(stock);
  //   });
    
  //   const duplicates: { symbol: string; company: string; kept: EdgeRankingData; removed: EdgeRankingData[] }[] = [];
    
  //   stockGroups.forEach((group, key) => {
  //     if (group.length > 1) {
  //       // Find the one with highest momentum score (the one that was kept)
  //       const kept = group.reduce((best, current) => {
  //         return current.momentumScore > best.momentumScore ? current : best;
  //       });
        
  //       const removed = group.filter(stock => stock !== kept);
        
  //       duplicates.push({
  //         symbol: kept.symbol,
  //         company: kept.companyName,
  //         kept,
  //         removed
  //       });
  //     }
  //   });
    
  //   return duplicates;
  // };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Excel Data Preview ({data.length} stocks)
        </h2>
                 <button
           onClick={() => {
             const selectedStocksData = data.filter(stock => selectedStocks.has(stock.symbol));
             onGenerateArticle(selectedStocksData);
           }}
           disabled={selectedStocks.size === 0 || isGenerating}
           className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
         >
           {isGenerating ? (
             <>
               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
               Generating...
             </>
           ) : (
             `Generate Article (${selectedStocks.size} selected)`
           )}
         </button>
      </div>

      {/* Analysis View Selector */}
      <div className="mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => setAnalysisView('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              analysisView === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Stocks
          </button>
          <button
            onClick={() => setAnalysisView('biggest-movers')}
            className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${
              analysisView === 'biggest-movers'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
                         <ArrowUpIcon className="h-4 w-4 mr-1" />
             Biggest Movers
          </button>
          <button
            onClick={() => setAnalysisView('top-gainers-by-sector')}
            className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${
              analysisView === 'top-gainers-by-sector'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
                         <ArrowUpIcon className="h-4 w-4 mr-1" />
             Top Gainers by Sector
          </button>
        </div>
      </div>

             {/* Biggest Movers Summary */}
       {/* <BiggestMoversSummary data={data} /> */}
       
       {/* Duplicate Detection Info - Temporarily disabled */}
       {/* {(() => {
         const duplicates = findDuplicates(data);
         if (duplicates.length > 0) {
           return (
             <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
               <div className="flex items-center">
                 <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                 </svg>
                 <h3 className="text-sm font-medium text-yellow-800">
                   Duplicate Entries Detected ({duplicates.length})
                 </h3>
               </div>
                               <div className="mt-2 text-sm text-yellow-700">
                  <p>The following stocks appear multiple times in your data:</p>
                  <ul className="mt-1 space-y-2">
                    {duplicates.map((duplicate, index) => (
                      <li key={index} className="bg-yellow-100 p-2 rounded">
                        <div className="font-medium">
                          <strong>{duplicate.symbol}</strong> - {duplicate.companyName}
                        </div>
                        <div className="text-xs mt-1">
                          <span className="text-green-600">✓ Kept:</span> Score {duplicate.kept.momentumScore.toFixed(1)} 
                          (Previous: {duplicate.kept.previousMomentumScore?.toFixed(1) || 'N/A'})
                        </div>
                        {duplicate.removed.map((removed, idx) => (
                          <div key={idx} className="text-xs text-red-600">
                            ✗ Removed: Score {removed.momentumScore.toFixed(1)} 
                            (Previous: {removed.previousMomentumScore?.toFixed(1) || 'N/A'})
                          </div>
                        ))}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs">
                    Kept the stock with the highest current momentum score for each duplicate group.
                  </p>
                </div>
             </div>
           );
         }
         return null;
       })()} */}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedStocks.size === data.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <th 
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('symbol')}
              >
                <div className="flex items-center">
                  Symbol
                  {getSortIcon('symbol')}
                </div>
              </th>
                             <th 
                 className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                 onClick={() => handleSort('companyName')}
               >
                 <div className="flex items-center">
                   Company
                   {getSortIcon('companyName')}
                 </div>
               </th>
               <th 
                 className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                 onClick={() => handleSort('sector')}
               >
                 <div className="flex items-center">
                   Sector
                   {getSortIcon('sector')}
                 </div>
               </th>
               <th 
                 className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                 onClick={() => handleSort('industry')}
               >
                 <div className="flex items-center">
                   Industry
                   {getSortIcon('industry')}
                 </div>
               </th>
               <th 
                 className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                 onClick={() => handleSort('marketCap')}
               >
                 <div className="flex items-center">
                   Market Cap
                   {getSortIcon('marketCap')}
                 </div>
               </th>
              <th 
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('momentumScore')}
              >
                <div className="flex items-center">
                  Momentum Score
                  {getSortIcon('momentumScore')}
                </div>
              </th>
              <th 
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('previousMomentumScore')}
              >
                <div className="flex items-center">
                  Previous Momentum
                  {getSortIcon('previousMomentumScore')}
                </div>
              </th>
                             <th 
                 className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                 onClick={() => handleSort('priceChangePercent')}
               >
                 <div className="flex items-center">
                   Price Change %
                   {getSortIcon('priceChangePercent')}
                 </div>
               </th>
               <th 
                 className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
               >
                 <div className="flex items-center">
                   Momentum Change
                 </div>
               </th>
              <th 
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('valueScore')}
              >
                <div className="flex items-center">
                  Value Score
                  {getSortIcon('valueScore')}
                </div>
              </th>
              <th 
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('growthScore')}
              >
                <div className="flex items-center">
                  Growth Score
                  {getSortIcon('growthScore')}
                </div>
              </th>
              <th 
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('qualityScore')}
              >
                <div className="flex items-center">
                  Quality Score
                  {getSortIcon('qualityScore')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((stock, index) => (
              <tr key={stock.symbol} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedStocks.has(stock.symbol)}
                    onChange={() => handleSelectStock(stock.symbol)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {stock.symbol}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  {stock.companyName}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatValue(stock.sector, 'sector')}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatValue(stock.industry, 'industry')}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatValue(stock.marketCap, 'marketCap')}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatValue(stock.momentumScore, 'momentumScore')}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatValue(stock.previousMomentumScore, 'previousMomentumScore')}
                </td>
                                 <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                   {formatValue(stock.priceChangePercent, 'priceChangePercent')}
                 </td>
                 <td className="px-3 py-4 whitespace-nowrap text-sm">
                   {stock.previousMomentumScore !== undefined ? (
                     <div className="flex items-center">
                       <span className={`font-medium ${
                         (stock.momentumScore - stock.previousMomentumScore) > 0 
                           ? 'text-green-600' 
                           : 'text-red-600'
                       }`}>
                         {formatValue(stock.momentumScore - stock.previousMomentumScore, 'momentumChange')}
                       </span>
                       <span className="text-gray-500 ml-1">
                         ({stock.previousMomentumScore.toFixed(2)} → {stock.momentumScore.toFixed(2)})
                       </span>
                     </div>
                   ) : (
                     <span className="text-gray-400">N/A</span>
                   )}
                 </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatValue(stock.valueScore, 'valueScore')}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatValue(stock.growthScore, 'growthScore')}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatValue(stock.qualityScore, 'qualityScore')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
