# Retell AI Multi-Tenant Dashboard

Full-stack SaaS dashboard for managing Retell AI voice bots with multi-tenant architecture.

## 🎯 Features

### Multi-Tenant Architecture
- **Admin Role**: Create bots, manage customers, assign phone numbers
- **Customer Role**: Manage assigned bots, initiate calls, view analytics
- Complete data isolation between tenants
- Role-based access control (RBAC)

### Bot Management
- Create and configure voice bots with Retell AI
- Customize voice, model (GPT-4, etc.), and prompts
- Assign bots to customers
- Real-time sync with Retell API

### Call Management
- Initiate phone calls through bots
- Real-time call status tracking
- Full transcript viewing (chat-style UI)
- Audio recording playback

### Analytics & Logs
- Call sentiment analysis
- Latency metrics (P50, P90, P95, P99)
- Call summaries powered by AI
- Complete webhook audit trail

### Phone Number Management
- Admin adds phone numbers
- Assign numbers to specific customers
- Track number usage

### Customer Management
- Admin creates customer accounts
- View customer activity and statistics
- Manage bot assignments

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (JWT)
- **External API**: Retell AI TypeScript SDK
- **Styling**: Tailwind CSS

## 📦 Installation

### Prerequisites
- Node.js 18+ (currently using v18.20.4)
- PostgreSQL database
- Retell AI account and API key

### 1. Clone and Install

```bash
cd /Users/oes/retell
npm install
```

### 2. Configure Environment Variables

Create `.env.local`:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/retell_dashboard"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Retell AI
RETELL_API_KEY="key_your_retell_api_key_here"
RETELL_WEBHOOK_SECRET="whsec_your_webhook_secret_here"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 3. Setup Database

```bash
# Push schema to database
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Seed with demo data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🔑 Demo Credentials

After seeding, you can login with:

**Admin Account:**
- Email: `admin@demo.com`
- Password: `admin123`

**Customer Accounts:**
- Email: `customer1@demo.com` / Password: `customer123`
- Email: `customer2@demo.com` / Password: `customer123`

## 🚀 Usage Guide

### Admin Workflow

1. **Login** as admin
2. **Create Bots**: `/admin/bots/new`
   - Configure voice (ElevenLabs voices)
   - Set AI model (GPT-4, GPT-3.5, etc.)
   - Write system prompt
3. **Add Phone Numbers**: `/admin/numbers`
   - Add numbers in E.164 format (+14155551234)
4. **Create Customers**: `/admin/customers`
   - Provide email and password
5. **Assign Resources**:
   - Assign bots to customers
   - Assign phone numbers to customers

### Customer Workflow

1. **Login** as customer
2. **View Assigned Bots**: `/customer/bots`
3. **Initiate Calls**: `/customer/calls`
   - Select bot
   - Enter phone number (E.164 format)
   - Optional: Select from assigned phone numbers
4. **View Call History**: See transcripts, analytics, recordings

## 📡 Webhook Setup

Your Retell webhooks should point to:
```
https://your-domain.com/api/webhooks/retell
```

The webhook handler processes 3 event types:
- `call_started`: Updates call status to IN_PROGRESS
- `call_ended`: Stores transcript, duration, recording
- `call_analyzed`: Saves analytics (sentiment, summary, latency)

**Security**: All webhooks are verified using HMAC SHA256 signature.

## 🗄️ Database Schema

### Core Models
- `Organization`: Tenant container
- `User`: Admin and Customer accounts
- `Bot`: Voice bot configurations (links to Retell agent_id)
- `BotAssignment`: Junction table (customer ↔ bot)
- `PhoneNumber`: Phone number pool
- `Call`: Call records
- `CallAnalytics`: AI analysis results
- `WebhookLog`: Audit trail

## 🔒 Security Features

- Multi-tenant data isolation by `organizationId`
- JWT-based authentication with NextAuth.js
- Webhook signature verification (HMAC SHA256)
- Password hashing with bcrypt (10 rounds)
- Role-based access control middleware
- SQL injection prevention (Prisma ORM)

## 📁 Project Structure

```
/Users/oes/retell/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data
├── src/
│   ├── app/
│   │   ├── (auth)/           # Auth pages (login)
│   │   ├── (dashboard)/      # Protected dashboard
│   │   │   ├── admin/        # Admin routes
│   │   │   └── customer/     # Customer routes
│   │   └── api/              # API routes
│   │       ├── auth/         # NextAuth
│   │       ├── bots/         # Bot CRUD
│   │       ├── calls/        # Call management
│   │       ├── numbers/      # Phone numbers
│   │       ├── webhooks/     # Retell webhooks
│   │       └── admin/        # Admin APIs
│   ├── components/           # React components
│   │   ├── bots/
│   │   ├── calls/
│   │   ├── customers/
│   │   └── numbers/
│   ├── lib/                  # Core utilities
│   │   ├── auth.ts           # NextAuth config
│   │   ├── prisma.ts         # Prisma client
│   │   ├── retell.ts         # Retell SDK
│   │   └── validations.ts    # Zod schemas
│   └── types/                # TypeScript types
├── .env.local                # Environment variables
├── package.json
└── README.md
```

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
npm run db:push      # Push schema changes (dev)
npm run db:migrate   # Create migration (prod)
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database
```

## 🐛 Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` in `.env.local`
- Ensure PostgreSQL is running
- Check database credentials

### Retell API Errors
- Verify `RETELL_API_KEY` is correct
- Check API key permissions in Retell dashboard
- Ensure webhook URL is publicly accessible

### Webhook Not Receiving Events
- Verify `RETELL_WEBHOOK_SECRET` matches Retell dashboard
- Check webhook URL is correct in bot configuration
- Use ngrok for local development: `ngrok http 3000`

### Authentication Issues
- Regenerate `NEXTAUTH_SECRET`: `openssl rand -base64 32`
- Clear browser cookies and retry
- Check `NEXTAUTH_URL` matches your domain

## 📝 API Endpoints

### Authentication
- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout

### Bots
- `GET /api/bots` - List bots
- `POST /api/bots` - Create bot
- `GET /api/bots/[id]` - Get bot details
- `PUT /api/bots/[id]` - Update bot
- `DELETE /api/bots/[id]` - Delete bot
- `POST /api/bots/[id]/assign` - Assign to customer (admin)

### Calls
- `GET /api/calls` - List calls
- `POST /api/calls` - Initiate call
- `GET /api/calls/[id]` - Get call details
- `GET /api/calls/[id]/transcript` - Get transcript

### Phone Numbers (Admin)
- `GET /api/numbers` - List numbers
- `POST /api/numbers` - Add number
- `POST /api/numbers/[id]/assign` - Assign to customer

### Customers (Admin)
- `GET /api/admin/customers` - List customers
- `POST /api/admin/customers` - Create customer
- `GET /api/admin/customers/[id]` - Get customer details

### Webhooks
- `POST /api/webhooks/retell` - Retell webhook handler

## 🌐 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

```bash
# Or use Vercel CLI
npm install -g vercel
vercel --prod
```

### Database Setup for Production
- Use managed PostgreSQL (Vercel Postgres, Supabase, Railway)
- Run migrations: `npx prisma migrate deploy`
- Don't forget to seed if needed

### Environment Variables
Set all variables from `.env.local` in your hosting platform.

## 🎨 Customization

### Adding New Voice Options
Edit `src/components/bots/bot-form.tsx`:
```typescript
const VOICE_OPTIONS = [
  { value: "11labs-Adrian", label: "Adrian (Male)" },
  { value: "your-voice-id", label: "Your Voice Name" },
]
```

### Adding New AI Models
Edit the same file:
```typescript
const MODEL_OPTIONS = [
  { value: "gpt-4o", label: "GPT-4 Optimized" },
  { value: "claude-3-opus", label: "Claude 3 Opus" },
]
```

## 📚 Learn More

- [Retell AI Documentation](https://docs.retellai.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)

## 📄 License

MIT

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Retell AI documentation
3. Open an issue on GitHub

---

Built with ❤️ using Next.js, Prisma, and Retell AI
