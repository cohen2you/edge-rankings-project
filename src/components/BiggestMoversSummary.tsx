'use client';

import { EdgeRankingData } from '@/types';
import { getBiggestMovers, getTopGainersBySector } from '@/lib/excel';
import { ChartBarIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

interface BiggestMoversSummaryProps {
  data: EdgeRankingData[];
}

export default function BiggestMoversSummary({ data }: BiggestMoversSummaryProps) {
  const biggestMovers = getBiggestMovers(data, 5);
  const topGainersBySector = getTopGainersBySector(data, 3);

  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}`;
  };

  const getChangeColor = (change: number) => {
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Biggest Movers (Absolute Change) */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Biggest Movers</h3>
          <ChartBarIcon className="h-5 w-5 text-primary-600" />
        </div>
        <div className="space-y-3">
          {biggestMovers.map((stock, index) => (
            <div key={stock.symbol} className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-500 w-6">{index + 1}.</span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{stock.symbol}</div>
                  <div className="text-xs text-gray-500">{stock.companyName}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${getChangeColor(stock.momentumChange || 0)}`}>
                  {formatChange(stock.momentumChange || 0)}
                </div>
                <div className="text-xs text-gray-500">
                  {stock.previousMomentumScore?.toFixed(1)} → {stock.momentumScore.toFixed(1)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Gainers by Sector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Top Gainers by Sector</h3>
          <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
        </div>
        <div className="space-y-4">
          {topGainersBySector.map((sectorGroup, sectorIndex) => (
            <div key={sectorGroup.sector} className="border-b border-gray-100 last:border-b-0 pb-3 last:pb-0">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">{sectorGroup.sector}</h4>
              <div className="space-y-2">
                {sectorGroup.stocks.map((stock, index) => (
                  <div key={stock.symbol} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-gray-500 w-4">{index + 1}.</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{stock.symbol}</div>
                        <div className="text-xs text-gray-500">{stock.companyName}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">
                        +{stock.momentumChange?.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {stock.previousMomentumScore?.toFixed(1)} → {stock.momentumScore.toFixed(1)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
