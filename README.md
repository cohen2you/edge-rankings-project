# Edge Rankings Article Generator

A web application that generates financial articles from Benzinga Edge Rankings Excel data. The app processes Excel files containing stock ranking data and automatically generates professional articles in the style of Benzinga financial publications.

## Features

- **Excel File Upload**: Drag-and-drop or click-to-upload Excel files (.xlsx, .xls)
- **Data Preview**: Interactive table with sorting and filtering capabilities
- **Stock Selection**: Choose which stocks to include in the generated article
- **Article Generation**: AI-powered article creation with fallback to template-based generation
- **Export Options**: Copy to clipboard or download as text file
- **Responsive Design**: Modern UI built with Tailwind CSS

## Technology Stack

- **Frontend**: Next.js 14 with TypeScript and React
- **Styling**: Tailwind CSS with custom components
- **Excel Processing**: xlsx library for file parsing
- **AI Integration**: OpenAI GPT-4 (optional, with fallback)
- **Icons**: Heroicons
- **Deployment**: Ready for Vercel, Netlify, or any Next.js hosting

## Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key (optional, for AI-powered generation)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd edge-rankings-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables** (optional)
   Create a `.env.local` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Upload Excel File
- Drag and drop your Excel file onto the upload area or click to browse
- The app supports `.xlsx` and `.xls` formats
- Ensure your Excel file has the following columns (or similar):
  - Symbol
  - Company Name
  - Momentum Score
  - Previous Momentum Score
  - Price Change %
  - Value Score
  - Growth Score
  - Quality Score
  - Additional technical indicators (RSI, Moving Averages, etc.)

### 2. Preview and Select Data
- Review the parsed data in the interactive table
- Sort by any column by clicking the header
- Select which stocks to include in your article
- The app automatically selects the top 3 stocks by default

### 3. Generate Article
- Click "Generate Article" to create your content
- The app will use AI if an API key is provided, otherwise fall back to template generation
- Review the generated article with proper formatting

### 4. Export
- Copy the article to clipboard for easy pasting
- Download as a text file for offline use
- The article follows Benzinga's editorial style and format

## Excel File Format

Your Excel file should contain the following columns (column names are flexible and will be auto-mapped):

| Column | Description | Required |
|--------|-------------|----------|
| Symbol | Stock ticker symbol | Yes |
| Company Name | Full company name | Yes |
| Momentum Score | Current momentum ranking score | Yes |
| Previous Momentum | Previous period momentum score | No |
| Price Change % | Percentage price change | No |
| Value Score | Value ranking score | No |
| Growth Score | Growth ranking score | No |
| Quality Score | Quality ranking score | No |
| Market Cap | Market capitalization | No |
| P/E Ratio | Price-to-earnings ratio | No |
| 50 Day MA | 50-day moving average | No |
| 100 Day MA | 100-day moving average | No |
| 200 Day MA | 200-day moving average | No |
| RSI | Relative Strength Index | No |

## API Integration

### OpenAI Integration (Optional)

To enable AI-powered article generation:

1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/)
2. Add your API key to `.env.local`:
   ```env
   OPENAI_API_KEY=sk-your-api-key-here
   ```
3. The app will automatically use AI generation when the key is available

### Fallback Generation

If no API key is provided or AI generation fails, the app uses a sophisticated template-based system that:
- Analyzes momentum changes
- Generates technical analysis based on available data
- Creates fundamental analysis sections
- Maintains professional financial writing style

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   └── generate-article/
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── FileUpload.tsx     # File upload component
│   ├── ExcelPreview.tsx   # Data preview table
│   └── ArticleGenerator.tsx # Article display
├── lib/                   # Utility functions
│   ├── excel.ts           # Excel processing
│   └── ai.ts              # AI integration
└── types/                 # TypeScript interfaces
    └── index.ts           # Type definitions
```

## Customization

### Styling
- Modify `tailwind.config.js` for theme customization
- Update `src/app/globals.css` for custom component styles

### Article Templates
- Edit `src/lib/ai.ts` to modify the template-based generation
- Update prompts in `src/app/api/generate-article/route.ts` for AI generation

### Excel Processing
- Modify `src/lib/excel.ts` to handle different Excel formats
- Add new column mappings in the `columnMapping` object

## Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms
The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
1. Check the existing issues
2. Create a new issue with detailed information
3. Include sample Excel data if reporting parsing issues

## Roadmap

- [ ] PDF export functionality
- [ ] Multiple article templates
- [ ] Batch processing for multiple files
- [ ] Advanced filtering and search
- [ ] User authentication and article history
- [ ] Integration with additional AI providers
