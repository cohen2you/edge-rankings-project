export interface EdgeRankingData {
  symbol: string;
  companyName: string;
  momentumScore: number;
  previousMomentumScore?: number;
  valueScore?: number;
  growthScore?: number;
  qualityScore?: number;
  price?: number;
  priceChange?: number;
  priceChangePercent?: number;
  marketCap?: number;
  sector?: string;
  industry?: string;
  peRatio?: number;
  forwardPeRatio?: number;
  fiftyDayMA?: number;
  hundredDayMA?: number;
  twoHundredDayMA?: number;
  rsi?: number;
  volume?: number;
  analystRatings?: AnalystRating[];
  
  // Enhanced Benzinga Edge API data
  benzingaData?: BenzingaEdgeData;
  [key: string]: any; // For additional columns
}

export interface BenzingaEdgeData {
  sharesOutstanding?: number;
  shareFloat?: number;
  sharesShort?: number;
  sharesShortPercentOfFloat?: number;
  financialStats?: {
    operationRatiosAsOf1Y?: string;
    revenueGrowth1Y?: number;
    dilutedEpsGrowth1Y?: number;
    epsGrowth1Y?: number;
  };
  keyStatistics?: {
    revenueGrowth?: number;
    grossMargin?: number;
    cashAndCashEquivalents?: number;
    totalAssets?: number;
    longTermDebt?: number;
    currentDebt?: number;
    totalDebtEquityRatio?: number;
    currentRatio?: number;
    ebitdaMargin?: number;
    forwardDividendYield?: number;
    forwardPeRatio?: number;
    peRatio?: number;
    psRatio?: number;
    evToEbitda?: number;
    pcfRatio?: number;
    tangibleBookValuePerShare?: number;
  };
  percentiles?: PercentileData[];
  peers?: PeerData[];
}

export interface PercentileData {
  dataId: string;
  dataValue: number;
  classificationStandard: string;
  groupName: string;
  groupCode: number;
  percentile: number;
  mean: number;
  median: number;
}

export interface PeerData {
  symbol: string;
  isin: string;
  exchange: string;
  sharesOutstanding: number;
  shareFloat: number;
}

export interface AnalystRating {
  analyst: string;
  rating: string;
  priceTarget?: number;
  date?: string;
}

export interface ArticleData {
  title: string;
  introduction: string;
  stocks: StockArticle[];
  conclusion?: string;
}

export interface StockArticle {
  symbol: string;
  companyName: string;
  momentumChange: number;
  currentMomentum: number;
  previousMomentum: number;
  priceChange: number;
  priceChangePercent: number;
  technicalAnalysis: string;
  fundamentalAnalysis: string;
  analystInsights?: string;
}

export interface ExcelUploadResponse {
  success: boolean;
  data?: EdgeRankingData[];
  error?: string;
  message?: string;
}

export interface ArticleGenerationRequest {
  stocks: EdgeRankingData[];
  marketContext?: string;
  sector?: string;
}

export interface ArticleGenerationResponse {
  success: boolean;
  article?: ArticleData;
  error?: string;
}
