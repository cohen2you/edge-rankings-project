import * as XLSX from 'xlsx';
import { EdgeRankingData, AnalystRating } from '@/types';

export function parseExcelFile(file: File): Promise<EdgeRankingData[]> {
  console.log('=== PARSE EXCEL FILE CALLED ===');
  console.log('File object:', file);
  console.log('File name:', file.name);
  console.log('File size:', file.size);
  console.log('File type:', file.type);
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        console.log('=== FILE READER ONLOAD ===');
        console.log('File read successfully, size:', file.size);
        console.log('Target result type:', typeof e.target?.result);
        console.log('Target result length:', e.target?.result ? (e.target.result as ArrayBuffer).byteLength : 'undefined');
        
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        console.log('Uint8Array created, length:', data.length);
        
        console.log('=== XLSX READ START ===');
        const workbook = XLSX.read(data, { type: 'array' });
        console.log('Workbook created successfully');
        console.log('Workbook sheets:', workbook.SheetNames);
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        console.log('Worksheet range:', worksheet['!ref']);
        
        console.log('=== SHEET TO JSON START ===');
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        console.log('Raw JSON data length:', jsonData.length);
        console.log('First few rows of raw data:', jsonData.slice(0, 3));
        
        console.log('=== PROCESS EXCEL DATA START ===');
        const processedData = processExcelData(jsonData);
        console.log('=== PROCESS EXCEL DATA COMPLETE ===');
        console.log('Processed data length:', processedData.length);
        resolve(processedData);
      } catch (error) {
        console.error('=== ERROR IN PARSE EXCEL FILE ===');
        console.error('Error type:', typeof error);
        console.error('Error message:', error instanceof Error ? error.message : error);
        console.error('Full error:', error);
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = (error) => {
      console.error('=== FILE READER ERROR ===');
      console.error('Reader error:', error);
      reject(new Error('Failed to read file'));
    };
    
    console.log('=== STARTING FILE READ ===');
    reader.readAsArrayBuffer(file);
  });
}

function processExcelData(rawData: any[][]): EdgeRankingData[] {
  if (rawData.length < 2) {
    throw new Error('Excel file must have at least a header row and one data row');
  }

  const headers = rawData[0] as string[];
  const dataRows = rawData.slice(1);
  
  console.log('Excel headers found:', headers);
  console.log('Number of data rows:', dataRows.length);
  
  // Check if the first data row starts with "Ticker" - this indicates a malformed header
  if (dataRows.length > 0 && dataRows[0][0] === 'Ticker') {
    console.log('Detected malformed header structure - first data row starts with "Ticker"');
    // Use the first data row as headers and skip it from data
    const actualHeaders = dataRows[0] as string[];
    const actualDataRows = dataRows.slice(1);
    console.log('Actual headers from data:', actualHeaders);
    console.log('Actual data rows:', actualDataRows.length);
    return processDataWithHeaders(actualHeaders, actualDataRows);
  }
  
  return processDataWithHeaders(headers, dataRows);
}

function processDataWithHeaders(headers: string[], dataRows: any[][]): EdgeRankingData[] {
  
  // Map common column names to our interface
  const columnMapping: { [key: string]: string } = {
    // Symbol variations
    'Symbol': 'symbol',
    'Ticker': 'symbol',
    'Ticker Symbol': 'symbol',
    'Stock Symbol': 'symbol',
    
    // Company name variations
    'Company Name': 'companyName',
    'Company': 'companyName',
    'Name': 'companyName',
    'Stock Name': 'companyName',
    
    // Momentum variations - map to current score
    'Momentum Score': 'momentumScore',
    'Momentum': 'momentumScore',
    'Current Momentum': 'momentumScore',
    'Momentum Ranking': 'momentumScore',
    'Current Score': 'momentumScore',
    'Score': 'momentumScore',
    
    // Previous momentum variations - map to score 7 days ago
    'Previous Momentum': 'previousMomentumScore',
    'Previous Momentum Score': 'previousMomentumScore',
    'Prior Momentum': 'previousMomentumScore',
    'Last Momentum': 'previousMomentumScore',
    'Score 7 days ago': 'previousMomentumScore',
    'Previous Score': 'previousMomentumScore',
    'Prior Score': 'previousMomentumScore',
    
    // Delta/Change variations
    'Delta': 'priceChangePercent',
    'Change': 'priceChangePercent',
    'Change %': 'priceChangePercent',
    'Percent Change': 'priceChangePercent',
    'Price Change %': 'priceChangePercent',
    'Price Change Percent': 'priceChangePercent',
    
    // Value variations
    'Value Score': 'valueScore',
    'Value': 'valueScore',
    'Value Ranking': 'valueScore',
    
    // Growth variations
    'Growth Score': 'growthScore',
    'Growth': 'growthScore',
    'Growth Ranking': 'growthScore',
    
    // Quality variations
    'Quality Score': 'qualityScore',
    'Quality': 'qualityScore',
    'Quality Ranking': 'qualityScore',
    
    // Price variations
    'Price': 'price',
    'Current Price': 'price',
    'Stock Price': 'price',
    
    // Price change variations
    'Price Change': 'priceChange',
    
    // Market cap variations
    'Market Cap': 'marketCap',
    'Market Capitalization': 'marketCap',
    'Market Cap (B)': 'marketCap',
    
    // Sector variations
    'Sector': 'sector',
    'Industry Sector': 'sector',
    'Business Sector': 'sector',
    
    // Industry variations
    'Industry': 'industry',
    'Business Industry': 'industry',
    'Industry Type': 'industry',
    
    // P/E variations
    'P/E Ratio': 'peRatio',
    'PE Ratio': 'peRatio',
    'Price to Earnings': 'peRatio',
    
    // Forward P/E variations
    'Forward P/E': 'forwardPeRatio',
    'Forward PE': 'forwardPeRatio',
    'Forward Price to Earnings': 'forwardPeRatio',
    
    // Moving average variations
    '50 Day MA': 'fiftyDayMA',
    '50-Day MA': 'fiftyDayMA',
    '50 Day Moving Average': 'fiftyDayMA',
    '50-Day Moving Average': 'fiftyDayMA',
    
    '100 Day MA': 'hundredDayMA',
    '100-Day MA': 'hundredDayMA',
    '100 Day Moving Average': 'hundredDayMA',
    '100-Day Moving Average': 'hundredDayMA',
    
    '200 Day MA': 'twoHundredDayMA',
    '200-Day MA': 'twoHundredDayMA',
    '200 Day Moving Average': 'twoHundredDayMA',
    '200-Day Moving Average': 'twoHundredDayMA',
    
    // RSI variations
    'RSI': 'rsi',
    'Relative Strength Index': 'rsi',
    
    // Volume variations
    'Volume': 'volume',
    'Trading Volume': 'volume',
    'Volume (M)': 'volume'
  };

    console.log('Filtering and processing rows...');
  const processedRows = dataRows
    .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
    .map((row, rowIndex) => {
      console.log(`Processing row ${rowIndex + 1}:`, row);
      
      const stockData: EdgeRankingData = {
        symbol: '',
        companyName: '',
        momentumScore: 0
      };

      headers.forEach((header, index) => {
        const value = row[index];
        let mappedKey = columnMapping[header];
        
        console.log(`  Header "${header}" -> mapped to "${mappedKey}" with value "${value}"`);
        
        // If no direct match, try case-insensitive matching
        if (!mappedKey) {
          const lowerHeader = header.toLowerCase();
          for (const [key, value] of Object.entries(columnMapping)) {
            if (key.toLowerCase() === lowerHeader) {
              mappedKey = value;
              console.log(`    Case-insensitive match found: "${key}" -> "${mappedKey}"`);
              break;
            }
          }
        }
        
        // If still no match, try partial matching for common patterns
        if (!mappedKey) {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('symbol') || lowerHeader.includes('ticker')) {
            mappedKey = 'symbol';
            console.log(`    Partial match: symbol/ticker -> "${mappedKey}"`);
          } else if (lowerHeader.includes('company') || lowerHeader.includes('name')) {
            mappedKey = 'companyName';
            console.log(`    Partial match: company/name -> "${mappedKey}"`);
          } else if (lowerHeader.includes('momentum') || lowerHeader.includes('score')) {
            if (lowerHeader.includes('previous') || lowerHeader.includes('prior') || lowerHeader.includes('last') || lowerHeader.includes('7 days ago')) {
              mappedKey = 'previousMomentumScore';
              console.log(`    Partial match: previous score -> "${mappedKey}"`);
            } else if (lowerHeader.includes('current')) {
              mappedKey = 'momentumScore';
              console.log(`    Partial match: current score -> "${mappedKey}"`);
            } else {
              mappedKey = 'momentumScore';
              console.log(`    Partial match: score -> "${mappedKey}"`);
            }
          } else if (lowerHeader.includes('delta') || lowerHeader.includes('change')) {
            mappedKey = 'priceChangePercent';
            console.log(`    Partial match: delta/change -> "${mappedKey}"`);
          } else if (lowerHeader.includes('value')) {
            mappedKey = 'valueScore';
            console.log(`    Partial match: value -> "${mappedKey}"`);
          } else if (lowerHeader.includes('growth')) {
            mappedKey = 'growthScore';
            console.log(`    Partial match: growth -> "${mappedKey}"`);
          } else if (lowerHeader.includes('quality')) {
            mappedKey = 'qualityScore';
            console.log(`    Partial match: quality -> "${mappedKey}"`);
          } else if (lowerHeader.includes('price') && lowerHeader.includes('change')) {
            mappedKey = 'priceChangePercent';
            console.log(`    Partial match: price change -> "${mappedKey}"`);
                     } else if (lowerHeader.includes('market') && lowerHeader.includes('cap')) {
             mappedKey = 'marketCap';
             console.log(`    Partial match: market cap -> "${mappedKey}"`);
           } else if (lowerHeader.includes('sector')) {
             mappedKey = 'sector';
             console.log(`    Partial match: sector -> "${mappedKey}"`);
           } else if (lowerHeader.includes('industry')) {
             mappedKey = 'industry';
             console.log(`    Partial match: industry -> "${mappedKey}"`);
          } else if (lowerHeader.includes('pe') || lowerHeader.includes('earnings')) {
            if (lowerHeader.includes('forward')) {
              mappedKey = 'forwardPeRatio';
              console.log(`    Partial match: forward pe -> "${mappedKey}"`);
            } else {
              mappedKey = 'peRatio';
              console.log(`    Partial match: pe -> "${mappedKey}"`);
            }
          } else if (lowerHeader.includes('50') && lowerHeader.includes('ma')) {
            mappedKey = 'fiftyDayMA';
            console.log(`    Partial match: 50 day ma -> "${mappedKey}"`);
          } else if (lowerHeader.includes('100') && lowerHeader.includes('ma')) {
            mappedKey = 'hundredDayMA';
            console.log(`    Partial match: 100 day ma -> "${mappedKey}"`);
          } else if (lowerHeader.includes('200') && lowerHeader.includes('ma')) {
            mappedKey = 'twoHundredDayMA';
            console.log(`    Partial match: 200 day ma -> "${mappedKey}"`);
          } else if (lowerHeader.includes('rsi')) {
            mappedKey = 'rsi';
            console.log(`    Partial match: rsi -> "${mappedKey}"`);
          } else if (lowerHeader.includes('volume')) {
            mappedKey = 'volume';
            console.log(`    Partial match: volume -> "${mappedKey}"`);
          }
        }
        
        if (mappedKey && value !== null && value !== undefined) {
          // Convert numeric values
          if (['momentumScore', 'previousMomentumScore', 'valueScore', 'growthScore', 'qualityScore', 
               'price', 'priceChange', 'priceChangePercent', 'marketCap', 'peRatio', 'forwardPeRatio',
               'fiftyDayMA', 'hundredDayMA', 'twoHundredDayMA', 'rsi', 'volume'].includes(mappedKey)) {
            stockData[mappedKey] = parseFloat(value) || 0;
            console.log(`    Set ${mappedKey} = ${stockData[mappedKey]} (numeric)`);
          } else {
            stockData[mappedKey] = value;
            console.log(`    Set ${mappedKey} = "${stockData[mappedKey]}" (string)`);
          }
        }
      });

      console.log(`Row ${rowIndex + 1} final result:`, stockData);
      return stockData;
    });

  const validStocks = processedRows.filter(stock => stock.symbol && stock.companyName);
  console.log('Valid stocks found:', validStocks.length);
  console.log('Sample valid stock:', validStocks[0]);
  
  // Remove duplicates based on symbol - temporarily disabled
  // const uniqueStocks = removeDuplicates(validStocks);
  // console.log('Unique stocks after deduplication:', uniqueStocks.length);
  
  return validStocks;
}

export function validateEdgeRankingsData(data: EdgeRankingData[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (data.length === 0) {
    errors.push('No valid data found in the Excel file');
    return { isValid: false, errors };
  }

  data.forEach((stock, index) => {
    if (!stock.symbol) {
      errors.push(`Row ${index + 1}: Missing symbol`);
    }
    if (!stock.companyName) {
      errors.push(`Row ${index + 1}: Missing company name`);
    }
    if (typeof stock.momentumScore !== 'number' || isNaN(stock.momentumScore)) {
      errors.push(`Row ${index + 1}: Invalid momentum score`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function sortByMomentumChange(data: EdgeRankingData[]): EdgeRankingData[] {
  return data
    .filter(stock => stock.previousMomentumScore !== undefined)
    .map(stock => ({
      ...stock,
      momentumChange: stock.momentumScore - (stock.previousMomentumScore || 0)
    }))
    .sort((a, b) => (b.momentumChange || 0) - (a.momentumChange || 0));
}

export function getBiggestMovers(data: EdgeRankingData[], count: number = 10): EdgeRankingData[] {
  return data
    .filter(stock => stock.previousMomentumScore !== undefined)
    .map(stock => ({
      ...stock,
      momentumChange: stock.momentumScore - (stock.previousMomentumScore || 0),
      momentumChangePercent: ((stock.momentumScore - (stock.previousMomentumScore || 0)) / (stock.previousMomentumScore || 1)) * 100
    }))
    .sort((a, b) => Math.abs(b.momentumChange || 0) - Math.abs(a.momentumChange || 0))
    .slice(0, count);
}

export function getTopGainers(data: EdgeRankingData[], count: number = 10): EdgeRankingData[] {
  return data
    .filter(stock => stock.previousMomentumScore !== undefined)
    .map(stock => ({
      ...stock,
      momentumChange: stock.momentumScore - (stock.previousMomentumScore || 0),
      momentumChangePercent: ((stock.momentumScore - (stock.previousMomentumScore || 0)) / (stock.previousMomentumScore || 1)) * 100
    }))
    .filter(stock => stock.momentumChange > 0)
    .sort((a, b) => (b.momentumChange || 0) - (a.momentumChange || 0))
    .slice(0, count);
}

export function getBiggestLosers(data: EdgeRankingData[], count: number = 10): EdgeRankingData[] {
  return data
    .filter(stock => stock.previousMomentumScore !== undefined)
    .map(stock => ({
      ...stock,
      momentumChange: stock.momentumScore - (stock.previousMomentumScore || 0),
      momentumChangePercent: ((stock.momentumScore - (stock.previousMomentumScore || 0)) / (stock.previousMomentumScore || 1)) * 100
    }))
    .filter(stock => stock.momentumChange < 0)
    .sort((a, b) => (a.momentumChange || 0) - (b.momentumChange || 0))
    .slice(0, count);
}

export function getTopGainersBySector(data: EdgeRankingData[], countPerSector: number = 3): { sector: string; stocks: EdgeRankingData[] }[] {
  // Filter stocks with previous momentum scores and positive momentum change
  const gainers = data
    .filter(stock => stock.previousMomentumScore !== undefined && stock.sector)
    .map(stock => ({
      ...stock,
      momentumChange: stock.momentumScore - (stock.previousMomentumScore || 0),
      momentumChangePercent: ((stock.momentumScore - (stock.previousMomentumScore || 0)) / (stock.previousMomentumScore || 1)) * 100
    }))
    .filter(stock => stock.momentumChange > 0);

  // Group by sector
  const sectorGroups = new Map<string, EdgeRankingData[]>();
  
  gainers.forEach(stock => {
    const sector = stock.sector || 'Unknown';
    if (!sectorGroups.has(sector)) {
      sectorGroups.set(sector, []);
    }
    sectorGroups.get(sector)!.push(stock);
  });

  // Sort stocks within each sector by momentum change and take top N
  const result: { sector: string; stocks: EdgeRankingData[] }[] = [];
  
  sectorGroups.forEach((stocks, sector) => {
    const topStocks = stocks
      .sort((a, b) => (b.momentumChange || 0) - (a.momentumChange || 0))
      .slice(0, countPerSector);
    
    if (topStocks.length > 0) {
      result.push({ sector, stocks: topStocks });
    }
  });

  // Sort sectors by the highest momentum change in each sector
  return result.sort((a, b) => {
    const aMaxChange = Math.max(...a.stocks.map(s => s.momentumChange || 0));
    const bMaxChange = Math.max(...b.stocks.map(s => s.momentumChange || 0));
    return bMaxChange - aMaxChange;
  });
}

// function removeDuplicates(stocks: EdgeRankingData[]): EdgeRankingData[] {
//   const stockGroups = new Map<string, EdgeRankingData[]>();
  
//   // Group stocks by symbol + company name
//   stocks.forEach(stock => {
//     const key = `${stock.symbol.toUpperCase()}_${stock.companyName.toLowerCase().replace(/\s+/g, '')}`;
//     if (!stockGroups.has(key)) {
//       stockGroups.set(key, []);
//     }
//     stockGroups.get(key)!.push(stock);
//   });
  
//   const uniqueStocks: EdgeRankingData[] = [];
//   const duplicates: EdgeRankingData[] = [];
  
//   stockGroups.forEach((group, key) => {
//     if (group.length === 1) {
//       // No duplicates, keep the stock
//       uniqueStocks.push(group[0]);
//     } else {
//       // Has duplicates, choose the best one
//       console.log(`Duplicate group found for key "${key}":`, group.length, 'entries');
      
//       // Strategy: Keep the one with the highest current momentum score
//       const bestStock = group.reduce((best, current) => {
//         return current.momentumScore > best.momentumScore ? current : best;
//       });
      
//       uniqueStocks.push(bestStock);
      
//       // Add the rest to duplicates list
//       const removedStocks = group.filter(stock => stock !== bestStock);
//       duplicates.push(...removedStocks);
      
//       console.log(`Kept: ${bestStock.symbol} (Score: ${bestStock.momentumScore})`);
//       console.log(`Removed:`, removedStocks.map(s => `${s.symbol} (Score: ${s.momentumScore})`));
//     }
//   });
  
//   if (duplicates.length > 0) {
//     console.log(`Removed ${duplicates.length} duplicate entries:`, duplicates.map(d => `${d.symbol} (${d.companyName})`));
//     console.log('Duplicate details:', duplicates.map(d => ({
//       symbol: d.symbol,
//       company: d.companyName,
//       currentScore: d.momentumScore,
//       previousScore: d.previousMomentumScore,
//       delta: d.momentumScore - (d.previousMomentumScore || 0)
//     })));
//   }
  
//   return uniqueStocks;
// }
