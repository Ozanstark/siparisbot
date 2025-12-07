# Retell AI Multi-Tenant Dashboard - Sistem Dokümantasyonu

## 📋 İçindekiler
1. [Genel Bakış](#genel-bakış)
2. [Mimari](#mimari)
3. [Veritabanı Şeması](#veritabanı-şeması)
4. [Kullanıcı Rolleri & Yetkilendirme](#kullanıcı-rolleri--yetkilendirme)
5. [Modüller & Özellikler](#modüller--özellikler)
6. [API Endpoint'leri](#api-endpointleri)
7. [Webhook İşleme](#webhook-i̇şleme)
8. [Sayfa Yapısı](#sayfa-yapısı)
9. [Retell AI Entegrasyonu](#retell-ai-entegrasyonu)
10. [Kurulum & Çalıştırma](#kurulum--çalıştırma)

---

## Genel Bakış

**Retell AI Multi-Tenant Dashboard**, sesli asistan botlarını yöneten SaaS platformudur. Restoran ve otel işletmeleri için sipariş alma ve rezervasyon yapma özellikleri sunar.

### Temel Özellikler
- 🏢 **Multi-tenant mimari** - Her organizasyon izole veri ile çalışır
- 👥 **Rol bazlı erişim** - Admin, Customer, Super Admin
- 🤖 **Bot yönetimi** - Retell AI ile entegre bot oluşturma/düzenleme
- 📞 **Telefon numarası yönetimi** - Satın alma, import, bot ataması
- 📊 **Call tracking** - Canlı arama takibi, transkript, analitik
- 🍕 **Sipariş yönetimi** - Restoran siparişleri (real-time bildirimler)
- 🏨 **Rezervasyon yönetimi** - Otel rezervasyonları (kapasite kontrolü)
- 📈 **Kota takibi** - Aylık arama dakikası limiti

### Teknoloji Stack'i
- **Framework**: Next.js 14 (App Router) + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js (JWT-based)
- **API Integration**: Retell AI TypeScript SDK
- **UI**: Tailwind CSS + shadcn/ui
- **Real-time**: Webhook-based event processing

---

## Mimari

### Multi-Tenant Yapı
```
Platform (Super Admin)
  ├── Organization A
  │   ├── Users (Admin, Customers)
  │   ├── Bots
  │   ├── Phone Numbers
  │   ├── Calls
  │   └── Orders/Reservations
  └── Organization B
      ├── Users
      ├── Bots
      └── ...
```

**Veri İzolasyonu**: Tüm sorgular `organizationId` ile filtrelenir. Middleware JWT'den organizationId çıkarır ve API route'larında kullanılır.

### Klasör Yapısı
```
retell/
├── prisma/
│   ├── schema.prisma          # Veritabanı şeması
│   └── seed.ts                # Test verileri
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login sayfası
│   │   ├── (dashboard)/       # Dashboard layout
│   │   │   ├── admin/         # Admin sayfaları
│   │   │   ├── customer/      # Customer sayfaları
│   │   │   └── super-admin/   # Super admin sayfası
│   │   └── api/               # API route'ları
│   ├── components/            # React bileşenleri
│   ├── lib/                   # Utility fonksiyonlar
│   │   ├── auth.ts           # NextAuth config
│   │   ├── prisma.ts         # Prisma client
│   │   ├── retell.ts         # Retell SDK
│   │   ├── availability.ts   # Oda müsaitlik kontrolü
│   │   └── validations.ts    # Zod schemas
│   ├── middleware.ts          # Route koruması
│   └── types/                 # TypeScript tipleri
└── public/
    └── notification.mp3       # Bildirim sesi
```

---

## Veritabanı Şeması

### Core Models

#### **Organization**
```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique

  // API Keys (encrypted)
  retellApiKey            String?
  retellWebhookSecret     String?

  // Subscription & Quota
  subscriptionPlan        SubscriptionPlan @default(FREE)
  monthlyCallMinutes      Int              @default(0)
  maxMonthlyCallMinutes   Int              @default(100)
  currentPeriodStart      DateTime         @default(now())
  currentPeriodEnd        DateTime?

  // Relations
  users         User[]
  bots          Bot[]
  phoneNumbers  PhoneNumber[]
  calls         Call[]
  roomTypes     RoomType[]
}
```

**Subscription Plans**: FREE (100 dk), BASIC, PRO, ENTERPRISE

#### **User**
```prisma
model User {
  id             String   @id @default(cuid())
  email          String   @unique
  name           String?
  hashedPassword String
  role           Role     @default(CUSTOMER)
  customerType   CustomerType? // RESTAURANT | HOTEL
  isSuperAdmin   Boolean  @default(false)
  organizationId String

  // Relations
  organization     Organization
  assignedBots     BotAssignment[]
  assignedPhones   PhoneNumber[]
  initiatedCalls   Call[]
  orders           Order[]
  reservations     Reservation[]
  roomTypes        RoomType[]
}
```

**Roles**:
- `ADMIN` - Organizasyon yöneticisi (bot, numara, customer yönetimi)
- `CUSTOMER` - Müşteri (atanan botları kullanır)
- `isSuperAdmin` - Platform sahibi (tüm organizasyonları görür)

**Customer Types**:
- `RESTAURANT` - Sipariş alır (Order modeli)
- `HOTEL` - Rezervasyon alır (Reservation modeli)

#### **Bot**
```prisma
model Bot {
  id             String   @id @default(cuid())
  name           String
  description    String?
  organizationId String

  // Retell AI References
  retellAgentId  String   @unique
  retellLlmId    String?

  // Configuration
  voiceId        String   @default("11labs-Adrian")
  model          String   @default("gpt-4o")
  generalPrompt  String   @db.Text
  beginMessage   String?
  webhookUrl     String?
  language       String   @default("en-US")

  // Advanced Settings
  voiceTemperature         Float?
  voiceSpeed               Float?
  responsiveness           Float?
  interruptionSensitivity  Float?
  enableBackchannel        Boolean  @default(false)
  backchannel              Json?
  ambientSound             String?

  // Pronunciation & Boosting
  pronunciationDictionary  Json?
  boostedKeywords          String[] @default([])

  // Privacy
  normalizeForSpeech       Boolean  @default(true)
  optOutSensitiveDataStorage Boolean @default(false)

  // Tool/Function Calling
  customTools    Json?

  // Version Management
  publishedVersionId String?

  isActive       Boolean  @default(true)

  // Relations
  organization        Organization
  assignments         BotAssignment[]
  inboundPhones       PhoneNumber[] @relation("InboundPhoneNumbers")
  outboundPhones      PhoneNumber[] @relation("OutboundPhoneNumbers")
  calls               Call[]
  versions            BotVersion[]
  knowledgeBases      BotKnowledgeBase[]
}
```

**Bot Creation Flow**:
1. Admin/Customer bot form'u doldurur
2. Backend'de `retellClient.llm.create()` ile LLM oluşturulur
3. `retellClient.agent.create()` ile Agent oluşturulur
4. `retellAgentId` ve `retellLlmId` DB'ye kaydedilir

#### **PhoneNumber**
```prisma
model PhoneNumber {
  id             String   @id @default(cuid())
  number         String   @unique
  organizationId String
  assignedToUserId String?

  // Separate bot binding for inbound and outbound
  inboundAgentId   String?  // Gelen aramaları karşılayan bot
  outboundAgentId  String?  // Giden aramalarda kullanılan bot

  // Retell AI Reference
  retellPhoneNumberId String? @unique

  nickname       String?
  isActive       Boolean  @default(true)

  // Relations
  organization   Organization
  assignedTo     User?
  inboundAgent   Bot?  @relation("InboundPhoneNumbers")
  outboundAgent  Bot?  @relation("OutboundPhoneNumbers")
  calls          Call[]
}
```

**Inbound vs Outbound**:
- **Inbound**: Müşteri aradığında hangi bot cevap verecek
- **Outbound**: Dışarı arama yapılırken hangi bot konuşacak

#### **Call**
```prisma
model Call {
  id             String     @id @default(cuid())
  organizationId String
  botId          String
  initiatedById  String

  retellCallId   String     @unique

  fromNumber     String?
  fromNumberId   String?
  toNumber       String
  status         CallStatus @default(INITIATED)

  // Call Data
  durationMs     Int?
  recordingUrl   String?
  transcript     String?    @db.Text

  // Enhanced Transcript
  transcriptObject        Json?
  transcriptWithToolCalls Json?

  // Advanced Recording
  recordingMultiChannelUrl String?
  scrubbedRecordingUrl     String?

  // Debugging & Analysis
  publicLogUrl             String?
  knowledgeBaseUrl         String?

  // Call Flow
  disconnectionReason      String?
  transferDestination      String?

  // Cost & Tokens
  llmTokenUsage Json?
  callCost      Json?

  // Timestamps
  startedAt      DateTime?
  endedAt        DateTime?

  // Relations
  organization   Organization
  bot            Bot
  initiatedBy    User
  phoneNumber    PhoneNumber?
  analytics      CallAnalytics?
  webhookLogs    WebhookLog[]
  order          Order?
  reservation    Reservation?
}
```

**Call Status Flow**:
```
INITIATED → RINGING → IN_PROGRESS → ENDED → ANALYZED
                           ↓
                        FAILED
```

#### **CallAnalytics**
```prisma
model CallAnalytics {
  id                String   @id @default(cuid())
  callId            String   @unique

  // Analysis
  summary           String?  @db.Text
  sentiment         String?  // positive/negative/neutral
  successEvaluation String?
  customAnalysis    Json?

  // Latency Metrics (P50, P90, P95, P99)
  e2eLatencyP50     Float?
  llmLatencyP50     Float?
  asrLatencyP50     Float?
  ttsLatencyP50     Float?
  kbLatencyP50      Float?
  llmWebsocketNetworkRttP50  Float?

  // ... (P90, P95, P99 için aynı metrikleri içerir)
}
```

#### **Order** (Restaurant)
```prisma
model Order {
  id              String      @id @default(cuid())
  customerId      String      // Restaurant owner

  // Caller Info
  customerName    String
  customerPhone   String?

  // Order Details
  items           String      @db.Text
  totalAmount     Float?
  deliveryAddress String?
  notes           String?     @db.Text

  // Status
  status          OrderStatus @default(PENDING)
  // PENDING → PREPARING → READY → COMPLETED
  //                           ↓
  //                      CANCELLED

  callId          String      @unique

  createdAt       DateTime    @default(now())
  completedAt     DateTime?
}
```

#### **Reservation** (Hotel)
```prisma
model Reservation {
  id              String            @id @default(cuid())
  customerId      String            // Hotel owner

  // Guest Info
  guestName       String
  guestPhone      String?
  guestEmail      String?

  // Reservation Details
  checkIn         DateTime
  checkOut        DateTime
  roomTypeId      String?           // RoomType ilişkisi
  roomType        String?           // Fallback text
  numberOfRooms   Int               @default(1)
  numberOfGuests  Int               @default(1)
  specialRequests String?           @db.Text
  totalPrice      Float?

  // Status
  status          ReservationStatus @default(PENDING)
  // PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT
  //                            ↓
  //                       CANCELLED

  callId          String            @unique
}
```

#### **RoomType** (Hotel Capacity)
```prisma
model RoomType {
  id              String   @id @default(cuid())
  organizationId  String
  customerId      String   // Hotel owner

  // Room Info
  name            String   // "Deluxe Room", "Standard Suite"
  description     String?
  totalRooms      Int      // Toplam oda sayısı

  // Pricing
  pricePerNight   Float

  // Capacity
  maxGuests       Int      @default(2)

  // Features
  features        String[] @default([]) // ["Sea View", "Jacuzzi"]

  isActive        Boolean  @default(true)
}
```

**Availability Check**: `/src/lib/availability.ts`
```typescript
checkRoomAvailability(roomTypeId, checkIn, checkOut, roomsNeeded)
// Çakışan rezervasyonları bulur
// Müsait oda sayısını hesaplar
```

#### **KnowledgeBase**
```prisma
model KnowledgeBase {
  id                  String   @id @default(cuid())
  organizationId      String
  retellKnowledgeBaseId String @unique

  name                String
  texts               String[] // Text chunks
  enableAutoRefresh   Boolean  @default(false)

  bots                BotKnowledgeBase[]
}

model BotKnowledgeBase {
  id              String   @id @default(cuid())
  botId           String
  knowledgeBaseId String

  // KB Config
  topK            Int      @default(3)
  filterScore     Float    @default(0.5)

  @@unique([botId, knowledgeBaseId])
}
```

#### **WebhookLog**
```prisma
model WebhookLog {
  id             String            @id @default(cuid())
  callId         String?
  organizationId String

  eventType      WebhookEventType  // CALL_STARTED | CALL_ENDED | CALL_ANALYZED
  payload        Json

  processed      Boolean           @default(false)
  error          String?           @db.Text

  createdAt      DateTime          @default(now())
}
```

---

## Kullanıcı Rolleri & Yetkilendirme

### 1. Super Admin (isSuperAdmin: true)
**Yetkiler**:
- Tüm organizasyonları görebilir
- Platform geneli istatistikleri görebilir
- Kota kullanımlarını izler

**Sayfalar**:
- `/super-admin` - Platform dashboard

**API**:
- `GET /api/super-admin/organizations`

### 2. Admin (role: ADMIN)
**Yetkiler**:
- Kendi organizasyonundaki tüm verilere erişir
- Bot oluşturur/düzenler/siler
- Customer oluşturur
- Telefon numarası satın alır/import eder
- Bot ve numara atamaları yapar

**Sayfalar**:
- `/admin/bots` - Bot listesi & yönetim
- `/admin/bots/new` - Yeni bot oluştur
- `/admin/bots/[botId]` - Bot detay & düzenle
- `/admin/customers` - Customer listesi
- `/admin/customers/[customerId]` - Customer detay
- `/admin/phone-numbers` - Numara yönetimi
- `/admin/knowledge-bases` - KB yönetimi
- `/admin/settings` - Organizasyon ayarları

**API**:
- Bot CRUD: `POST /api/bots`, `PUT /api/bots/[botId]`, `DELETE /api/bots/[botId]`
- Customer CRUD: `POST /api/admin/customers`, `PUT /api/admin/customers/[customerId]`
- Phone: `POST /api/phone-numbers/purchase`, `POST /api/phone-numbers/import`
- Assignment: `POST /api/bots/[botId]/assign`, `POST /api/numbers/[numberId]/assign`

### 3. Customer (role: CUSTOMER)
**Yetkiler**:
- Sadece atanan botları görebilir
- Atanan botlar ile arama yapabilir
- Kendi aramalarını görebilir
- Sipariş/rezervasyon yönetimi (customerType'a göre)

**Customer Types**:
- **RESTAURANT**: Sipariş yönetimi
- **HOTEL**: Rezervasyon yönetimi

**Sayfalar (Restaurant)**:
- `/customer/bots` - Atanan botlar
- `/customer/bots/[botId]` - Bot detay
- `/customer/calls` - Arama geçmişi
- `/customer/calls/[callId]` - Arama detay & transkript
- `/customer/orders` - Canlı sipariş ekranı
- `/customer/orders/[orderId]` - Sipariş detay
- `/customer/settings` - Bildirim ayarları
- `/customer/knowledge-bases` - KB yönetimi

**Sayfalar (Hotel)**:
- Aynı + Reservation yönetimi (henüz UI eklenmedi)

**API**:
- Calls: `POST /api/calls`, `GET /api/calls`, `GET /api/calls/[callId]`
- Orders: `GET /api/orders`, `PATCH /api/orders/[orderId]`
- Bots: `GET /api/bots` (sadece atananlar)

### Middleware Koruması
**Dosya**: `/src/middleware.ts`

```typescript
// Public routes
["/", "/login"]

// Auth required routes
["/admin/*", "/customer/*", "/super-admin"]

// JWT'den organizationId çıkarılır
// Role bazlı yönlendirme:
// - ADMIN → /admin/bots
// - CUSTOMER → /customer/bots
// - isSuperAdmin → /super-admin
```

---

## Modüller & Özellikler

### 🤖 Bot Yönetimi

#### Bot Oluşturma
**Sayfa**: `/admin/bots/new`
**Component**: `src/components/bots/bot-form.tsx`
**API**: `POST /api/bots`

**Flow**:
1. Form doldurulur (name, prompt, voice, model, language)
2. Backend'de:
   ```typescript
   // 1. LLM oluştur
   const llm = await retellClient.llm.create({
     general_prompt: data.generalPrompt,
     model: data.model,
     ...
   })

   // 2. Agent oluştur
   const agent = await retellClient.agent.create({
     llm_websocket_url: llm.llm_websocket_url,
     voice_id: data.voiceId,
     agent_name: data.name,
     webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/retell`,
     ...
   })

   // 3. DB'ye kaydet
   await prisma.bot.create({
     data: {
       retellAgentId: agent.agent_id,
       retellLlmId: llm.llm_id,
       organizationId,
       ...
     }
   })
   ```

#### Bot Düzenleme
**Sayfa**: `/admin/bots/[botId]/edit`
**API**: `PUT /api/bots/[botId]`

**Update Flow**:
1. Retell'de LLM güncelle
2. Retell'de Agent güncelle
3. DB'de güncelle

#### Bot Silme
**Component**: `src/components/bots/delete-bot-button.tsx`
**API**: `DELETE /api/bots/[botId]`

**Delete Flow**:
1. Retell'den agent sil
2. Retell'den LLM sil
3. DB'den sil (cascade ile tüm ilişkiler silinir)

#### Knowledge Base Atama
**Component**: `src/components/bots/kb-assignment-section.tsx`
**API**: `POST /api/bots/[botId]/knowledge-bases`

**Flow**:
1. KB seçilir (topK ve filterScore ayarlanır)
2. Junction table'a eklenir (`BotKnowledgeBase`)
3. Retell Agent'e KB eklenir

#### Custom Tool Ekleme
**Component**: `src/components/bots/tool-management-section.tsx`
**API**: `POST /api/bots/[botId]/tools`

**Tool Structure**:
```json
{
  "type": "end_call",
  "name": "end_call_function",
  "description": "Use this to end the call",
  "parameters": {
    "type": "object",
    "properties": {
      "reason": {
        "type": "string",
        "description": "Reason for ending call"
      }
    }
  }
}
```

#### Bot Versiyonlama
**Component**: `src/components/bots/version-manager.tsx`
**API**: `POST /api/bots/[botId]/versions`

**Flow**:
1. Mevcut bot config'i snapshot olarak kaydedilir
2. Version number artırılır
3. Publish edilebilir veya draft kalır

### 📞 Telefon Numarası Yönetimi

#### Numara Satın Alma
**Component**: `src/components/phone-numbers/purchase-phone-dialog.tsx`
**API**: `POST /api/phone-numbers/purchase`

**Flow**:
1. Retell'den müsait numaralar listelenir
2. Admin numara seçer
3. Retell'de satın alınır
4. DB'ye kaydedilir

#### Numara Import
**Component**: `src/components/phone-numbers/import-phone-dialog.tsx`
**API**: `POST /api/phone-numbers/import`

**Flow**:
1. Admin var olan numarayı import eder
2. Retell'de numara aranır/oluşturulur
3. DB'ye kaydedilir

#### Bot Ataması
**Component**: `src/components/numbers/bind-bot-dialog.tsx`
**API**: `PATCH /api/phone-numbers/[numberId]`

**Inbound Bot Ataması**:
```typescript
// Numara arandığında bu bot cevap verir
await prisma.phoneNumber.update({
  where: { id: numberId },
  data: { inboundAgentId: botId }
})

// Retell'de update
await retellClient.phoneNumber.update(retellPhoneNumberId, {
  inbound_agent_id: bot.retellAgentId
})
```

**Outbound Bot Ataması**:
```typescript
// Dışarı arama yaparken bu bot konuşur
await prisma.phoneNumber.update({
  where: { id: numberId },
  data: { outboundAgentId: botId }
})
```

### 📞 Arama Yönetimi

#### Arama Başlatma
**Component**: `src/components/calls/initiate-call-dialog.tsx`
**API**: `POST /api/calls`

**Flow**:
1. Customer bot ve telefon numarası seçer
2. Backend:
   ```typescript
   const call = await retellClient.call.createPhoneCall({
     from_number: fromNumber,
     to_number: toNumber,
     override_agent_id: bot.retellAgentId,
     metadata: {
       organizationId,
       userId,
       customerId
     }
   })

   await prisma.call.create({
     data: {
       retellCallId: call.call_id,
       organizationId,
       botId,
       initiatedById: userId,
       fromNumber,
       toNumber,
       status: "INITIATED"
     }
   })
   ```

#### Arama Geçmişi
**Sayfa**: `/customer/calls`
**Component**: `src/components/calls/call-table.tsx`
**API**: `GET /api/calls`

**Features**:
- Pagination
- Filter by status
- Filter by date range
- Sort by createdAt

#### Arama Detayları
**Sayfa**: `/customer/calls/[callId]`
**API**: `GET /api/calls/[callId]`

**Gösterilir**:
- Call metadata (duration, status, timestamps)
- Full transcript
- Recording player
- Analytics (sentiment, summary, latency)
- Custom analysis (sipariş/rezervasyon bilgileri)

### 🍕 Sipariş Yönetimi (Restaurant)

#### Canlı Sipariş Ekranı
**Sayfa**: `/customer/orders`
**Dosya**: `src/app/(dashboard)/customer/orders/page.tsx`
**API**: `GET /api/orders?status=PENDING`

**Features**:
- **Auto-refresh**: 5 saniyede bir yenilenir (ayarlanabilir)
- **Ses bildirimi**: Yeni sipariş geldiğinde çalar (`/public/notification.mp3`)
- **Desktop notification**: Tarayıcı bildirimi
- **Real-time status update**: PENDING → PREPARING → READY → COMPLETED

**Sipariş Bilgileri**:
```typescript
{
  customerName: "Ahmet Yılmaz",
  customerPhone: "+905551234567",
  items: "2x Margherita Pizza, 1x Coca Cola",
  totalAmount: 150.00,
  deliveryAddress: "Atatürk Cad. No:123 Beşiktaş",
  notes: "Kapıyı çalarken SMS atın",
  status: "PENDING",
  createdAt: "2024-01-15T14:30:00Z"
}
```

**Status Flow**:
```
PENDING (Kırmızı) → PREPARING (Sarı) → READY (Mavi) → COMPLETED (Yeşil)
                                                  ↓
                                            CANCELLED (Gri)
```

#### Bildirim Ayarları
**Sayfa**: `/customer/settings`
**Dosya**: `src/app/(dashboard)/customer/settings/page.tsx`

**Ayarlar**:
- Ses bildirimi aç/kapa
- Ses seviyesi (0-100%)
- Desktop bildirimi aç/kapa
- Otomatik yenileme aç/kapa
- Yenileme sıklığı (3-30 saniye)

**LocalStorage**: `orderNotificationSettings`

#### Sipariş Detayı
**Sayfa**: `/customer/orders/[orderId]`
**API**: `GET /api/orders/[orderId]`

**Gösterilir**:
- Tüm sipariş bilgileri
- Call transcript
- Recording
- Timeline (created → preparing → ready → completed)

#### Sipariş Oluşturma (Webhook)
**Webhook**: `call_analyzed` eventi
**Dosya**: `src/app/api/webhooks/retell/route.ts:274-291`

```typescript
if (call.initiatedBy.customerType === "RESTAURANT" && customAnalysisData.order) {
  await tx.order.create({
    data: {
      customerId: call.initiatedById,
      callId: callId,
      customerName: customAnalysisData.order.customer_name || "Unknown",
      customerPhone: callData.from_number || call.fromNumber,
      items: customAnalysisData.order.items || transcript,
      totalAmount: customAnalysisData.order.total_amount
        ? parseFloat(customAnalysisData.order.total_amount)
        : null,
      deliveryAddress: customAnalysisData.order.delivery_address || null,
      notes: customAnalysisData.order.notes || null,
      status: "PENDING"
    }
  })
}
```

**Custom Analysis Format** (Retell'den gelir):
```json
{
  "order": {
    "customer_name": "Ahmet Yılmaz",
    "items": "2x Margherita Pizza, 1x Coca Cola",
    "total_amount": "150.00",
    "delivery_address": "Atatürk Cad. No:123",
    "notes": "Kapıyı çalarken SMS atın"
  }
}
```

### 🏨 Rezervasyon Yönetimi (Hotel)

#### Oda Tipi Yönetimi
**Model**: `RoomType`
**API**: Henüz UI yok (sadece backend hazır)

**Örnek**:
```typescript
{
  name: "Deluxe Room",
  description: "Deniz manzaralı, 35m²",
  totalRooms: 10,
  pricePerNight: 1500.00,
  maxGuests: 2,
  features: ["Sea View", "Balcony", "Mini Bar"],
  isActive: true
}
```

#### Müsaitlik Kontrolü
**Dosya**: `src/lib/availability.ts`

```typescript
// Oda müsaitliği kontrolü
const result = await checkRoomAvailability(
  roomTypeId,
  new Date("2024-02-01"),
  new Date("2024-02-05"),
  2 // 2 oda isteniyor
)

// Result:
{
  available: true,
  availableRooms: 3,
  totalRooms: 10,
  bookedRooms: 7
}
```

**Çakışma Algoritması**:
```typescript
// Rezervasyon çakışıyorsa:
// reservation.checkIn < requestedCheckOut AND
// reservation.checkOut > requestedCheckIn

// Örnek:
// Mevcut rezervasyon: 01.02 - 05.02
// İstek: 03.02 - 07.02 → ÇAKIŞIYOR
// İstek: 06.02 - 10.02 → ÇAKIŞMIYOR
```

#### Alternatif Tarih Önerme
```typescript
const alternatives = await suggestAlternativeDates(
  roomTypeId,
  new Date("2024-02-01"),
  new Date("2024-02-05"),
  2, // 2 oda
  14 // ±14 gün ara
)

// Result: En yakın 5 alternatif tarih
```

#### Rezervasyon Oluşturma (Webhook)
**Webhook**: `call_analyzed` eventi
**Dosya**: `src/app/api/webhooks/retell/route.ts:292-310`

```typescript
if (call.initiatedBy.customerType === "HOTEL" && customAnalysisData.reservation) {
  await tx.reservation.create({
    data: {
      customerId: call.initiatedById,
      callId: callId,
      guestName: customAnalysisData.reservation.guest_name || "Unknown",
      guestPhone: callData.from_number || call.fromNumber,
      guestEmail: customAnalysisData.reservation.guest_email || null,
      checkIn: new Date(customAnalysisData.reservation.check_in),
      checkOut: new Date(customAnalysisData.reservation.check_out),
      roomType: customAnalysisData.reservation.room_type || null,
      numberOfGuests: customAnalysisData.reservation.number_of_guests || 1,
      specialRequests: customAnalysisData.reservation.special_requests || null,
      status: "PENDING"
    }
  })
}
```

### 📊 Kota Yönetimi

#### Aylık Arama Dakikası Takibi
**Model**: `Organization.monthlyCallMinutes`
**Webhook**: `call_ended` eventi
**Dosya**: `src/app/api/webhooks/retell/route.ts:189-200`

```typescript
const durationMs = callData.end_timestamp - callData.start_timestamp
const durationMinutes = Math.ceil(durationMs / 60000) // Yukarı yuvarla

await tx.organization.update({
  where: { id: organizationId },
  data: {
    monthlyCallMinutes: {
      increment: durationMinutes
    }
  }
})
```

**Otomatik Artırma**: Her arama bittiğinde organizasyonun `monthlyCallMinutes` değeri otomatik artar.

#### Kota Kontrolü
```typescript
const org = await prisma.organization.findUnique({
  where: { id: organizationId }
})

const usagePercentage = (org.monthlyCallMinutes / org.maxMonthlyCallMinutes) * 100

if (usagePercentage >= 100) {
  // Kota doldu - arama engellenebilir
}
```

#### Süper Admin Dashboard
**Sayfa**: `/super-admin`
**Dosya**: `src/app/(dashboard)/super-admin/page.tsx`
**API**: `GET /api/super-admin/organizations`

**Gösterilir**:
- Platform toplam istatistikleri
  - Toplam organizasyon sayısı
  - Toplam kullanıcı
  - Toplam bot
  - Toplam arama
  - Toplam dakika
- Her organizasyon için:
  - Subscription plan
  - Kota kullanımı (progress bar)
  - Kullanıcı/bot/arama sayıları
  - Dönem bilgisi

**Kota Uyarıları**:
- %90+ kullanım: Kırmızı badge & border
- %75-89: Turuncu progress bar
- %50-74: Sarı progress bar
- <50%: Yeşil progress bar

---

## API Endpoint'leri

### Auth
| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| POST | `/api/auth/[...nextauth]` | Login/logout | Public |

### Bots
| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| GET | `/api/bots` | Bot listesi | Admin/Customer |
| POST | `/api/bots` | Bot oluştur | Admin/Customer |
| GET | `/api/bots/[botId]` | Bot detay | Admin/Customer |
| PUT | `/api/bots/[botId]` | Bot güncelle | Admin |
| DELETE | `/api/bots/[botId]` | Bot sil | Admin |
| POST | `/api/bots/[botId]/assign` | Customer'a ata | Admin |
| GET | `/api/bots/[botId]/versions` | Version listesi | Admin |
| POST | `/api/bots/[botId]/versions` | Yeni version | Admin |
| POST | `/api/bots/[botId]/versions/[versionId]/publish` | Version yayınla | Admin |
| GET | `/api/bots/[botId]/knowledge-bases` | KB listesi | Admin |
| POST | `/api/bots/[botId]/knowledge-bases` | KB ata | Admin |
| DELETE | `/api/bots/[botId]/knowledge-bases/[assignmentId]` | KB kaldır | Admin |
| POST | `/api/bots/[botId]/tools` | Custom tool ekle | Admin |
| POST | `/api/bots/sync` | Retell'den senkronize et | Admin |

### Phone Numbers
| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| GET | `/api/phone-numbers` | Numara listesi | Admin |
| POST | `/api/phone-numbers/purchase` | Numara satın al | Admin |
| POST | `/api/phone-numbers/import` | Numara import | Admin |
| PATCH | `/api/phone-numbers/[numberId]` | Bot ata (inbound/outbound) | Admin |
| DELETE | `/api/phone-numbers/[numberId]` | Numara sil | Admin |

### Calls
| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| GET | `/api/calls` | Arama listesi | Admin/Customer |
| POST | `/api/calls` | Arama başlat | Customer |
| GET | `/api/calls/[callId]` | Arama detay | Admin/Customer |
| GET | `/api/calls/[callId]/transcript` | Transkript | Admin/Customer |
| GET | `/api/calls/active` | Aktif aramalar | Admin |
| POST | `/api/calls/batch` | Toplu arama | Admin |
| POST | `/api/calls/web` | Web call başlat | Customer |

### Orders
| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| GET | `/api/orders` | Sipariş listesi | Customer |
| GET | `/api/orders/[orderId]` | Sipariş detay | Customer |
| PATCH | `/api/orders/[orderId]` | Status güncelle | Customer |

### Customers
| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| GET | `/api/admin/customers` | Customer listesi | Admin |
| POST | `/api/admin/customers` | Customer oluştur | Admin |
| GET | `/api/admin/customers/[customerId]` | Customer detay | Admin |
| PUT | `/api/admin/customers/[customerId]` | Customer güncelle | Admin |
| DELETE | `/api/admin/customers/[customerId]` | Customer sil | Admin |

### Knowledge Bases
| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| GET | `/api/knowledge-bases` | KB listesi | Admin/Customer |
| POST | `/api/knowledge-bases` | KB oluştur | Admin/Customer |
| PUT | `/api/knowledge-bases/[id]` | KB güncelle | Admin/Customer |
| DELETE | `/api/knowledge-bases/[id]` | KB sil | Admin/Customer |

### Super Admin
| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| GET | `/api/super-admin/organizations` | Tüm org'lar | Super Admin |

### Settings
| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| GET | `/api/admin/settings` | Org ayarları | Admin |
| PATCH | `/api/admin/settings` | Ayarları güncelle | Admin |

### Webhooks
| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| POST | `/api/webhooks/retell` | Retell webhook | Public (HMAC) |
| POST | `/api/webhooks/tool-call` | Custom tool webhook | Public |

### Voices
| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| GET | `/api/voices` | Retell voice listesi | Admin |

---

## Webhook İşleme

### Retell Webhook Endpoint
**URL**: `POST /api/webhooks/retell`
**Dosya**: `src/app/api/webhooks/retell/route.ts`

### Security: HMAC SHA256 Signature Verification
```typescript
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac("sha256", secret)
  const digest = hmac.update(payload).digest("hex")
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  )
}
```

### Webhook Event Types

#### 1. `call_started`
**Timing**: Arama başladığında
**Handler**: `handleCallStarted()`
**İşlemler**:
```typescript
await prisma.$transaction([
  // Call'u IN_PROGRESS yap
  prisma.call.update({
    where: { id: callId },
    data: {
      status: "IN_PROGRESS",
      startedAt: new Date(callData.start_timestamp)
    }
  }),

  // Webhook log
  prisma.webhookLog.create({
    data: {
      callId,
      organizationId,
      eventType: "CALL_STARTED",
      payload: fullPayload,
      processed: true
    }
  })
])
```

#### 2. `call_ended`
**Timing**: Arama bittiğinde
**Handler**: `handleCallEnded()`
**İşlemler**:
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Call'u ENDED yap, transcript & recording kaydet
  await tx.call.update({
    where: { id: callId },
    data: {
      status: "ENDED",
      endedAt: new Date(callData.end_timestamp),
      durationMs,
      transcript,
      recordingUrl: callData.recording_url,
      transcriptObject: callData.transcript_object,
      transcriptWithToolCalls: callData.transcript_with_tool_calls,
      recordingMultiChannelUrl: callData.recording_multi_channel_url,
      scrubbedRecordingUrl: callData.scrubbed_recording_url,
      publicLogUrl: callData.public_log_url,
      knowledgeBaseUrl: callData.knowledge_base_url,
      disconnectionReason: callData.disconnection_reason,
      transferDestination: callData.call_transfer?.to_number,
      llmTokenUsage: callData.llm_token_count,
      callCost: callData.call_cost
    }
  })

  // 2. Organizasyon kotasını artır
  if (durationMs) {
    const durationMinutes = Math.ceil(durationMs / 60000)
    await tx.organization.update({
      where: { id: organizationId },
      data: {
        monthlyCallMinutes: {
          increment: durationMinutes
        }
      }
    })
  }

  // 3. Webhook log
  await tx.webhookLog.create({ ... })
})
```

**Kota Tracking**: Her arama bittiğinde otomatik olarak organizasyonun `monthlyCallMinutes` değeri artırılır.

#### 3. `call_analyzed`
**Timing**: Retell analizi tamamlandığında (genellikle call_ended'den sonra)
**Handler**: `handleCallAnalyzed()`
**İşlemler**:
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Call'u ANALYZED yap
  await tx.call.update({
    where: { id: callId },
    data: {
      status: "ANALYZED",
      transcript,
      transcriptObject: callData.transcript_object,
      // ... diğer enhanced fields
    }
  })

  // 2. Sipariş/Rezervasyon oluştur
  if (call.initiatedBy.customerType === "RESTAURANT" && customAnalysisData.order) {
    await tx.order.create({
      data: {
        customerId: call.initiatedById,
        callId,
        customerName: customAnalysisData.order.customer_name,
        customerPhone: callData.from_number,
        items: customAnalysisData.order.items,
        totalAmount: parseFloat(customAnalysisData.order.total_amount),
        deliveryAddress: customAnalysisData.order.delivery_address,
        notes: customAnalysisData.order.notes,
        status: "PENDING"
      }
    })
  } else if (call.initiatedBy.customerType === "HOTEL" && customAnalysisData.reservation) {
    await tx.reservation.create({
      data: {
        customerId: call.initiatedById,
        callId,
        guestName: customAnalysisData.reservation.guest_name,
        guestPhone: callData.from_number,
        guestEmail: customAnalysisData.reservation.guest_email,
        checkIn: new Date(customAnalysisData.reservation.check_in),
        checkOut: new Date(customAnalysisData.reservation.check_out),
        roomType: customAnalysisData.reservation.room_type,
        numberOfGuests: customAnalysisData.reservation.number_of_guests,
        specialRequests: customAnalysisData.reservation.special_requests,
        status: "PENDING"
      }
    })
  }

  // 3. Analytics oluştur
  await tx.callAnalytics.upsert({
    where: { callId },
    create: {
      callId,
      summary: analysis?.call_summary,
      sentiment: analysis?.sentiment,
      successEvaluation: analysis?.call_successful?.toString(),
      customAnalysis: analysis?.custom_analysis_data,
      // E2E Latency
      e2eLatencyP50: latency?.e2e_latency?.p50,
      e2eLatencyP90: latency?.e2e_latency?.p90,
      e2eLatencyP95: latency?.e2e_latency?.p95,
      e2eLatencyP99: latency?.e2e_latency?.p99,
      // LLM Latency
      llmLatencyP50: latency?.llm_latency?.p50,
      // ... diğer latency metrikleri
    },
    update: { ... }
  })

  // 4. Webhook log
  await tx.webhookLog.create({ ... })
})
```

### Webhook Metadata
**Critical**: Her arama yapılırken `metadata` field'ına `organizationId` eklenir:

```typescript
const call = await retellClient.call.createPhoneCall({
  from_number: "+905551234567",
  to_number: "+905559876543",
  override_agent_id: bot.retellAgentId,
  metadata: {
    organizationId: session.user.organizationId,
    userId: session.user.id,
    customerId: session.user.id
  }
})
```

Webhook'ta bu metadata kullanılarak tenant isolation sağlanır:

```typescript
const organizationId = call.metadata?.organizationId
if (!organizationId) {
  return NextResponse.json({ error: "Invalid metadata" }, { status: 400 })
}

const dbCall = await prisma.call.findFirst({
  where: {
    retellCallId: call.call_id,
    organizationId // Tenant isolation
  }
})
```

### Error Handling & Logging
```typescript
async function logWebhookError(payload: any, errorMessage: string, organizationId?: string) {
  await prisma.webhookLog.create({
    data: {
      organizationId: organizationId || "unknown",
      eventType: payload.event?.toUpperCase().replace(".", "_") || "CALL_STARTED",
      payload,
      processed: false,
      error: errorMessage
    }
  })
}
```

---

## Sayfa Yapısı

### Auth Pages
```
src/app/(auth)/
├── layout.tsx          # Centered layout for login
└── login/
    └── page.tsx        # Login form
```

### Dashboard Layout
```
src/app/(dashboard)/
├── layout.tsx          # Sidebar + navbar layout
├── admin/              # Admin routes
├── customer/           # Customer routes
└── super-admin/        # Super admin routes
```

### Admin Routes
```
admin/
├── bots/
│   ├── page.tsx                    # Bot listesi
│   ├── new/page.tsx                # Yeni bot
│   ├── [botId]/
│   │   ├── page.tsx                # Bot detay
│   │   └── edit/page.tsx           # Bot düzenle
├── customers/
│   ├── page.tsx                    # Customer listesi
│   └── [customerId]/page.tsx       # Customer detay
├── phone-numbers/
│   ├── page.tsx                    # Numara listesi
│   └── client.tsx                  # Client component
├── knowledge-bases/
│   └── page.tsx                    # KB yönetimi
└── settings/
    └── page.tsx                    # Org ayarları
```

### Customer Routes
```
customer/
├── bots/
│   ├── page.tsx                    # Atanan botlar
│   └── [botId]/page.tsx            # Bot detay
├── calls/
│   ├── page.tsx                    # Arama geçmişi
│   └── [callId]/page.tsx           # Arama detay
├── orders/
│   ├── page.tsx                    # Canlı sipariş ekranı
│   └── [orderId]/page.tsx          # Sipariş detay
├── knowledge-bases/
│   └── page.tsx                    # KB yönetimi
└── settings/
    └── page.tsx                    # Bildirim ayarları
```

### Super Admin Routes
```
super-admin/
└── page.tsx                        # Platform dashboard
```

---

## Retell AI Entegrasyonu

### SDK Initialization
**Dosya**: `src/lib/retell.ts`

```typescript
import { Retell } from "retell-sdk"

export const retellClient = new Retell({
  apiKey: process.env.RETELL_API_KEY!
})
```

### Key Retell Concepts

#### 1. LLM (Large Language Model)
**Purpose**: Bot'un beyin yapısı (prompt, model, temperature)

```typescript
const llm = await retellClient.llm.create({
  general_prompt: "You are a friendly restaurant assistant...",
  model: "gpt-4o",
  general_tools: [/* custom tools */],
  begin_message: "Hello! How can I help you today?",
  inbound_dynamic_variables_webhook_url: webhookUrl
})
```

#### 2. Agent
**Purpose**: Bot'un ses ve davranış özellikleri (voice, language, responsiveness)

```typescript
const agent = await retellClient.agent.create({
  agent_name: "Restaurant Bot",
  llm_websocket_url: llm.llm_websocket_url,
  voice_id: "11labs-Adrian",
  language: "en-US",
  responsiveness: 0.8,
  interruption_sensitivity: 0.5,
  enable_backchannel: true,
  ambient_sound: "coffee-shop",
  webhook_url: `${APP_URL}/api/webhooks/retell`
})
```

#### 3. Phone Number
**Purpose**: Retell'den satın alınan veya import edilen telefon numarası

```typescript
// Purchase
const availableNumbers = await retellClient.phoneNumber.list({
  area_code: "212"
})
const number = await retellClient.phoneNumber.create({
  phone_number: availableNumbers[0].phone_number
})

// Update inbound agent
await retellClient.phoneNumber.update(number.phone_number_id, {
  inbound_agent_id: agent.agent_id
})
```

#### 4. Call
**Purpose**: Arama başlatma

```typescript
const call = await retellClient.call.createPhoneCall({
  from_number: "+905551234567",
  to_number: "+905559876543",
  override_agent_id: agent.agent_id,
  retell_llm_dynamic_variables: {
    customer_name: "Ahmet",
    order_history: "3 previous orders"
  },
  metadata: {
    organizationId: "org_123",
    userId: "user_456"
  }
})
```

#### 5. Knowledge Base
**Purpose**: Bot'a ekstra bilgi vermek (RAG - Retrieval Augmented Generation)

```typescript
const kb = await retellClient.knowledgeBase.create({
  knowledge_base_name: "Menu Items",
  texts: [
    "Margherita Pizza - 50 TL",
    "Pepperoni Pizza - 60 TL",
    "Vegetarian Pizza - 55 TL"
  ],
  enable_auto_refresh: true
})

// Bot'a ata
await retellClient.agent.update(agent.agent_id, {
  knowledge_base: {
    knowledge_base_id: kb.knowledge_base_id,
    top_k: 3,
    filter_score: 0.5
  }
})
```

### Retell Webhook Events

#### Event Structure
```json
{
  "event": "call_analyzed",
  "call": {
    "call_id": "call_abc123",
    "agent_id": "agent_xyz789",
    "call_type": "phone_call",
    "from_number": "+905551234567",
    "to_number": "+905559876543",
    "direction": "outbound",
    "start_timestamp": 1705334400000,
    "end_timestamp": 1705334520000,
    "transcript": "...",
    "transcript_object": [...],
    "recording_url": "https://...",
    "public_log_url": "https://...",
    "call_analysis": {
      "call_summary": "Customer ordered 2 pizzas",
      "sentiment": "positive",
      "call_successful": true,
      "custom_analysis_data": {
        "order": {
          "customer_name": "Ahmet Yılmaz",
          "items": "2x Margherita Pizza, 1x Coca Cola",
          "total_amount": "150.00",
          "delivery_address": "Atatürk Cad. No:123"
        }
      }
    },
    "latency": {
      "e2e_latency": { "p50": 800, "p90": 1200, "p95": 1500, "p99": 2000 },
      "llm_latency": { "p50": 400, "p90": 600, "p95": 800, "p99": 1000 },
      "tts_latency": { "p50": 200, "p90": 300, "p95": 400, "p99": 500 },
      "asr_latency": { "p50": 100, "p90": 150, "p95": 200, "p99": 250 }
    },
    "metadata": {
      "organizationId": "org_123",
      "userId": "user_456"
    }
  }
}
```

### Custom Analysis Data
**Purpose**: Retell'in LLM'i aramayı analiz ederken structured data çıkarır.

**Restaurant Bot Prompt Example**:
```
After the call, extract the following information:
- customer_name: Customer's full name
- items: Ordered items (e.g., "2x Pizza, 1x Coke")
- total_amount: Total price
- delivery_address: Delivery address
- notes: Special instructions

Return as JSON in custom_analysis_data.order field.
```

**Hotel Bot Prompt Example**:
```
After the call, extract:
- guest_name: Guest's full name
- guest_email: Email address
- check_in: Check-in date (ISO format)
- check_out: Check-out date (ISO format)
- room_type: Requested room type
- number_of_guests: Number of guests
- special_requests: Special requests

Return as JSON in custom_analysis_data.reservation field.
```

---

## Kurulum & Çalıştırma

### 1. Environment Variables
`.env.local` dosyası oluştur:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/retell_db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="openssl-rand-base64-32-output-here"

# Retell AI
RETELL_API_KEY="key_abc123xyz789"
RETELL_WEBHOOK_SECRET="whsec_abc123"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 2. Dependencies
```bash
npm install
```

**Key Dependencies**:
- `next@14` - Framework
- `@prisma/client` - ORM
- `next-auth` - Authentication
- `retell-sdk` - Retell AI SDK
- `bcryptjs` - Password hashing
- `zod` - Validation
- `react-hook-form` - Forms
- `@hookform/resolvers` - Form validation
- `tailwindcss` - Styling
- `@radix-ui/*` - UI primitives (shadcn/ui)

### 3. Database Setup
```bash
# Push schema
npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed database (optional)
npm run db:seed
```

**Seed Creates**:
- 1 Organization (Demo Org)
- 1 Admin user (admin@demo.com / Admin123!)
- 2 Customer users:
  - Restaurant (restaurant@demo.com / Rest123!)
  - Hotel (hotel@demo.com / Hotel123!)

### 4. Run Development Server
```bash
npm run dev
```

**Server**: http://localhost:3000

### 5. Prisma Studio (DB GUI)
```bash
npx prisma studio
```

**Studio**: http://localhost:5555

### 6. Retell Webhook Configuration
Retell Dashboard → Settings → Webhooks:

**Webhook URL**: `https://your-domain.com/api/webhooks/retell`
**Webhook Secret**: Copy to `.env.local` as `RETELL_WEBHOOK_SECRET`

**Events to Subscribe**:
- ✅ call_started
- ✅ call_ended
- ✅ call_analyzed

### 7. Production Deployment
**Recommended**: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Environment Variables**: Add to Vercel Dashboard

**Database**: Use production PostgreSQL (Neon, Supabase, Railway)

**Webhook URL**: Update in Retell Dashboard to production URL

---

## Önemli Dosyalar

### Configuration
- `prisma/schema.prisma` - Database schema
- `src/lib/auth.ts` - NextAuth configuration
- `src/lib/retell.ts` - Retell SDK client
- `src/middleware.ts` - Route protection
- `src/lib/validations.ts` - Zod schemas

### Core API Routes
- `src/app/api/auth/[...nextauth]/route.ts` - Authentication
- `src/app/api/webhooks/retell/route.ts` - Webhook handler
- `src/app/api/bots/route.ts` - Bot CRUD
- `src/app/api/calls/route.ts` - Call management
- `src/app/api/phone-numbers/route.ts` - Phone management

### Key Pages
- `src/app/(auth)/login/page.tsx` - Login
- `src/app/(dashboard)/admin/bots/page.tsx` - Bot management
- `src/app/(dashboard)/customer/orders/page.tsx` - Live orders
- `src/app/(dashboard)/super-admin/page.tsx` - Platform dashboard

### Utilities
- `src/lib/availability.ts` - Room availability checker
- `src/lib/utils.ts` - Helper functions

---

## Database Indexes

**Performance Optimization**: Critical indexes for multi-tenant queries

```prisma
// Organization
@@index([slug])
@@index([subscriptionPlan])

// User
@@index([organizationId])
@@index([email])
@@index([organizationId, role])
@@index([customerType])
@@index([isSuperAdmin])

// Bot
@@index([organizationId])
@@index([retellAgentId])
@@index([organizationId, isActive])

// PhoneNumber
@@index([organizationId])
@@index([organizationId, isActive])

// Call
@@index([organizationId])
@@index([organizationId, createdAt])
@@index([organizationId, status])
@@index([retellCallId])

// Order
@@index([customerId])
@@index([customerId, status])
@@index([status])
@@index([createdAt])

// Reservation
@@index([customerId])
@@index([customerId, status])
@@index([checkIn])
@@index([roomTypeId])
```

---

## Security Checklist

✅ **Authentication**: NextAuth.js JWT-based
✅ **Authorization**: Role-based (Admin/Customer/Super Admin)
✅ **Tenant Isolation**: All queries filtered by `organizationId`
✅ **Password Hashing**: bcrypt (10 rounds)
✅ **Webhook Verification**: HMAC SHA256
✅ **SQL Injection Prevention**: Prisma parameterized queries
✅ **XSS Prevention**: React auto-escaping
✅ **CSRF Protection**: NextAuth built-in
✅ **Sensitive Data**: `optOutSensitiveDataStorage` for PII scrubbing

---

## Performance Considerations

### Database
- Connection pooling (Prisma automatic)
- Indexes on foreign keys and frequently queried fields
- Transaction usage for atomic operations

### API Routes
- Paginated responses (default: 50 items)
- Filter and sort support
- Efficient queries (select only needed fields)

### Real-time Features
- Polling for orders (5-second default, configurable)
- WebSocket consideration for future (Retell supports web calls)

### Caching
- Currently no caching (add Redis for production scale)

---

## Troubleshooting

### Common Issues

#### 1. Webhook Not Receiving Events
- ✅ Check `RETELL_WEBHOOK_SECRET` in `.env.local`
- ✅ Verify webhook URL in Retell Dashboard
- ✅ Check signature verification logs
- ✅ Ensure public URL for production (ngrok for local testing)

#### 2. Bot Not Created in Retell
- ✅ Check `RETELL_API_KEY` validity
- ✅ Check API response errors in console
- ✅ Verify Retell account has quota

#### 3. Orders Not Appearing
- ✅ Check if `customerType = RESTAURANT`
- ✅ Verify `custom_analysis_data.order` exists in webhook
- ✅ Check webhook logs in database

#### 4. Audio Notifications Not Playing
- ✅ Verify `/public/notification.mp3` exists
- ✅ Check browser autoplay policy (user must interact first)
- ✅ Check notification settings in `/customer/settings`

#### 5. Room Availability Always Shows 0
- ✅ Check if `RoomType.totalRooms > 0`
- ✅ Verify reservation dates don't overlap incorrectly
- ✅ Check `Reservation.status` (only count PENDING/CONFIRMED/CHECKED_IN)

---

## Next Steps & Future Enhancements

### Planned Features
- [ ] Room type UI for hotels (CRUD pages)
- [ ] Reservation management UI for hotels
- [ ] Google Calendar integration for hotels
- [ ] Quota warning emails (when 80%, 90%, 100%)
- [ ] Billing module (Stripe integration)
- [ ] White-label customization (logo, colors)
- [ ] Advanced analytics dashboard
- [ ] Web call interface (in-browser calls)
- [ ] Multi-language support (i18n)
- [ ] Mobile app (React Native)

### Optimization Opportunities
- Redis caching for frequently accessed data
- Elasticsearch for call transcript search
- CDN for audio files
- Background jobs (Bull/BullMQ) for webhook processing
- Real-time WebSocket for live order updates

---

## Credits

**Built with**:
- Next.js 14
- Retell AI
- Prisma
- NextAuth.js
- shadcn/ui

**Generated with**: Claude Code
