# KOL Analytics Dashboard

A comprehensive dashboard for tracking Twitter/X influencer metrics for crypto DAOs. Monitor KOL performance, track follower growth, and identify zombie accounts.

## Features

- **Real-time Leaderboard**: Track KOL rankings based on followers, growth rate, and engagement
- **Historical Data**: View 30-day follower growth trends with sparkline charts
- **Growth Metrics**: 24-hour and percentage-based growth calculations
- **Zombie Detection**: Admin tools to identify and manage inactive accounts
- **Automated Collection**: Cron job integration for periodic metric updates

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Backend**: Next.js API Routes, Server Actions
- **Database**: Supabase (PostgreSQL)
- **Data Visualization**: Recharts
- **UI Components**: shadcn/ui

## Environment Variables

Add these environment variables to your project:

### Supabase (Auto-configured via Vercel Integration)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Twitter API (Required for real data collection)
- `TWITTER_API_KEY` - Your utools API key from https://twitter.good6.top

### Cron Job Security (Required for production)
- `CRON_SECRET` - Random secret for authenticating cron requests

## Getting Started

### 1. Database Setup

Run the SQL migration scripts in order in v0's interface (click "Run" button on each script):

```sql
scripts/001_create_kols_table.sql
scripts/002_create_snapshots_table.sql
scripts/003_create_leaderboard_view.sql
scripts/004_seed_sample_data.sql
```

### 2. Configure Twitter API

1. Sign up at https://twitter.good6.top
2. Get your API key from the user center
3. In v0, click the sidebar → **"Vars"** → Add Variable:
   - Key: `TWITTER_API_KEY`
   - Value: Your API key

**Note**: The app works with mock data if `TWITTER_API_KEY` is not set.

### 3. Import KOLs

You can import KOLs in three ways:

**Option A: Using the UI (Recommended)**
1. Click the "Import KOLs" button in the dashboard header
2. Paste Twitter usernames (one per line)
3. Click "Import" to fetch and save data

**Option B: Using the CSV file**
1. Edit `data/kol-list.csv` with your KOL usernames
2. Run the import script (coming soon)

**Option C: Using the API**
```bash
curl -X POST /api/admin/import-kols \
  -H "Content-Type: application/json" \
  -d '{"usernames": ["@username1", "@username2"]}'
```

### 4. Set Up Cron Job

Configure Vercel Cron to call `/api/cron/collect-metrics`:

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/collect-metrics",
    "schedule": "0 */6 * * *"
  }]
}
```

Add the `CRON_SECRET` environment variable for authentication.

## API Endpoints

### Data Collection
- `GET /api/cron/collect-metrics` - Collect metrics for all KOLs (requires auth header)

### KOL Management
- `GET /api/kols/[id]/history` - Get historical snapshots for a KOL
- `POST /api/kols/[id]/mark-zombie` - Mark/unmark a KOL as zombie

## Database Schema

### Tables
- **kols** - KOL profiles with Twitter user info
- **snapshots** - Historical metric snapshots taken periodically

### Views
- **leaderboard_24h** - Calculated rankings with 24h growth metrics

## Twitter API Integration

This project uses the utools Twitter API service:
- Documentation: https://utools.readme.io/reference/getting-started-with-your-api-2
- Base URL: `https://twitter.utools.me/api`
- Authentication: API Key in header

The API client (`lib/twitter-api.ts`) handles:
- Fetching user data by username or ID
- Error handling and retries
- Response transformation to our data format

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Deployment

Deploy to Vercel with one click:

1. Click "Publish" in v0 interface
2. Configure environment variables
3. Set up Vercel Cron for automated data collection

## Support

For Twitter API issues, contact:
- Discord: discord.gg/VEKBj3fT9G
- Telegram: https://t.me/Yang0619
