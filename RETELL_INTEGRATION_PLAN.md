# Retell AI Integration - Eksik Özellikler Implementation Plan

## Mevcut Durum Analizi

### ✅ Tamamlanmış Özellikler
- Agent (Bot) CRUD operations
- LLM creation and management
- Basic phone call creation
- Webhook handling (call_started, call_ended, call_analyzed)
- Multi-tenant architecture
- Role-based access control
- Call history and transcript viewing

### ❌ Eksik Özellikler
1. Phone Number Management (Retell API entegrasyonu)
2. Voice Selection (Retell API'den dinamik liste)
3. Agent Version Management
4. Agent Overrides (call-time customization)
5. Web Call Support
6. Call Recording Playback UI
7. Real-time Call Monitoring
8. Batch Call Functionality

---

## Priority 1: Phone Number Management (Retell API Integration)

### Hedef
Admin panelinde phone number satın alma, listeleme, silme işlemlerini Retell API üzerinden yapmak.

### Mevcut Durum
- Database'de PhoneNumber tablosu var
- Manuel olarak number ekleniyor
- Retell API ile senkronizasyon yok

### Yapılacaklar

#### 1.1 API Routes Güncellemesi

**Dosya: `src/app/api/numbers/route.ts`**

**GET endpoint** - Retell'den phone number'ları listele:
```typescript
// Retell API'den number'ları çek
const retellNumbers = await retellClient.phoneNumber.list()

// Database ile senkronize et
// Her Retell number'ı database'de varsa güncelle, yoksa ekle
```

**POST endpoint** - Retell'den yeni phone number satın al:
```typescript
// Retell'den number satın al
const purchasedNumber = await retellClient.phoneNumber.create({
  area_code: data.areaCode, // optional
  agent_id: data.agentId // bind to agent
})

// Database'e kaydet
await prisma.phoneNumber.create({
  number: purchasedNumber.phone_number,
  retellPhoneNumberId: purchasedNumber.phone_number_id,
  organizationId,
  isActive: true
})
```

**Dosya: `src/app/api/numbers/[numberId]/route.ts`**

**DELETE endpoint** - Retell'den number'ı sil:
```typescript
// Database'den number'ı bul
const phoneNumber = await prisma.phoneNumber.findFirst({...})

// Retell'den sil
await retellClient.phoneNumber.delete(phoneNumber.retellPhoneNumberId)

// Database'den sil
await prisma.phoneNumber.delete({...})
```

**PUT endpoint** - Agent binding güncelle:
```typescript
// Retell'de agent binding güncelle
await retellClient.phoneNumber.update(phoneNumber.retellPhoneNumberId, {
  agent_id: bot.retellAgentId
})

// Database'i güncelle (gerekirse)
```

#### 1.2 Database Schema Güncellemesi

**Dosya: `prisma/schema.prisma`**

```prisma
model PhoneNumber {
  id                   String   @id @default(cuid())
  retellPhoneNumberId  String?  @unique  // NEW: Retell'deki ID
  number               String
  organizationId       String
  assignedToUserId     String?
  boundAgentId         String?  // NEW: Hangi bot'a bağlı
  isActive             Boolean  @default(true)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  assignedTo   User?        @relation(fields: [assignedToUserId], references: [id])
  boundAgent   Bot?         @relation(fields: [boundAgentId], references: [id])
  calls        Call[]       @relation("CallFromNumber")

  @@index([organizationId])
  @@index([assignedToUserId])
}
```

#### 1.3 UI Güncellemeleri

**Dosya: `src/components/numbers/add-number-dialog.tsx`**

Yeni alanlar ekle:
- Area code selection (US area codes dropdown)
- Agent binding selection (optional)
- Purchase vs Import toggle

**Dosya: `src/components/numbers/number-card.tsx`**

Göster:
- Bound agent bilgisi
- Retell phone number ID
- Sync status (Retell ile senkron mu?)

#### 1.4 Validation Schema

**Dosya: `src/lib/validations.ts`**

```typescript
export const purchasePhoneNumberSchema = z.object({
  areaCode: z.string().optional(), // US area code like "415"
  agentId: z.string().optional(), // Bot ID to bind
})

export const importPhoneNumberSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/), // E.164 format
  agentId: z.string().optional(),
  // Custom telephony fields (Twilio, Telnyx, etc.)
})
```

#### 1.5 Test Checklist
- [ ] Admin can purchase phone number from Retell
- [ ] Purchased number appears in database
- [ ] Admin can bind number to agent
- [ ] Admin can list all numbers (synced from Retell)
- [ ] Admin can delete number (removes from Retell + DB)
- [ ] Number assignment to customer works
- [ ] Customer can use assigned number for outbound calls

---

## Priority 2: Voice Selection (Dynamic from Retell API)

### Hedef
Bot oluştururken voice seçimini Retell API'den dinamik olarak çekmek.

### Mevcut Durum
- Hardcoded voice options var (11labs-Adrian, etc.)
- Retell'in sunduğu tüm voice'lar görünmüyor

### Yapılacaklar

#### 2.1 API Route

**Dosya: `src/app/api/voices/route.ts` (YENİ)**

```typescript
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Retell API'den voice listesi çek
    const voices = await retellClient.voice.list()

    return NextResponse.json({ voices })
  } catch (error) {
    console.error("Error fetching voices:", error)
    return NextResponse.json(
      { error: "Failed to fetch voices" },
      { status: 500 }
    )
  }
}
```

#### 2.2 UI Güncellemesi

**Dosya: `src/components/bots/bot-form.tsx`**

```typescript
// Voice options'ı API'den çek
const [voices, setVoices] = useState([])

useEffect(() => {
  fetch('/api/voices')
    .then(res => res.json())
    .then(data => setVoices(data.voices))
}, [])

// Select component'i güncelle
<select name="voiceId">
  {voices.map(voice => (
    <option key={voice.voice_id} value={voice.voice_id}>
      {voice.voice_name} - {voice.provider}
    </option>
  ))}
</select>
```

#### 2.3 Test Checklist
- [ ] Voice listesi API'den çekiliyor
- [ ] Bot form'da tüm voice'lar görünüyor
- [ ] Voice seçimi bot creation'da çalışıyor
- [ ] Voice bilgisi database'e kaydediliyor

---

## Priority 3: Agent Version Management

### Hedef
Agent versiyonlama sistemi eklemek (draft vs published versions).

### Mevcut Durum
- Sadece tek agent versiyonu var
- Version yönetimi yok

### Yapılacaklar

#### 3.1 Database Schema

**Dosya: `prisma/schema.prisma`**

```prisma
model BotVersion {
  id             String   @id @default(cuid())
  botId          String
  versionNumber  Int      // 1, 2, 3...
  retellAgentId  String   @unique
  retellLlmId    String?

  // Agent configuration
  voiceId        String
  model          String
  generalPrompt  String   @db.Text
  beginMessage   String?

  isPublished    Boolean  @default(false)
  isDraft        Boolean  @default(true)

  createdAt      DateTime @default(now())
  publishedAt    DateTime?

  bot            Bot      @relation(fields: [botId], references: [id], onDelete: Cascade)

  @@unique([botId, versionNumber])
  @@index([botId])
}

model Bot {
  // ... existing fields
  currentVersionId String?
  currentVersion   BotVersion? @relation("CurrentVersion", fields: [currentVersionId], references: [id])
  versions         BotVersion[]
}
```

#### 3.2 API Routes

**Dosya: `src/app/api/bots/[botId]/versions/route.ts` (YENİ)**

```typescript
// GET - List all versions
// POST - Create new version (draft)
```

**Dosya: `src/app/api/bots/[botId]/versions/[versionId]/publish/route.ts` (YENİ)**

```typescript
// POST - Publish version
export async function POST(req: NextRequest, { params }) {
  // Retell'de agent'ı publish et
  await retellClient.agent.publish(agent.retellAgentId)

  // Database'de version'ı published olarak işaretle
  await prisma.botVersion.update({
    where: { id: params.versionId },
    data: { isPublished: true, isDraft: false, publishedAt: new Date() }
  })

  // Bot'un currentVersion'ını güncelle
  await prisma.bot.update({
    where: { id: params.botId },
    data: { currentVersionId: params.versionId }
  })
}
```

#### 3.3 UI

**Sayfa: `src/app/(dashboard)/admin/bots/[botId]/versions/page.tsx` (YENİ)**

- Version history listesi
- Publish button
- Version comparison

#### 3.4 Test Checklist
- [ ] Draft version oluşturuluyor
- [ ] Version publish ediliyor
- [ ] Call'larda published version kullanılıyor
- [ ] Version history görüntülenebiliyor

---

## Priority 4: Agent Overrides (Call-time Customization)

### Hedef
Call başlatırken agent davranışını geçici olarak override edebilme.

### Yapılacaklar

#### 4.1 Validation Schema

**Dosya: `src/lib/validations.ts`**

```typescript
export const createCallSchema = z.object({
  botId: z.string(),
  toNumber: z.string(),
  fromNumberId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  // NEW: Agent overrides
  agentOverrides: z.object({
    voiceId: z.string().optional(),
    generalPrompt: z.string().optional(),
    beginMessage: z.string().optional(),
    temperature: z.number().optional(),
    interruptSensitivity: z.number().optional(),
  }).optional()
})
```

#### 4.2 API Update

**Dosya: `src/app/api/calls/route.ts`**

```typescript
const retellCall = await retellClient.call.createPhoneCall({
  from_number: fromNumber,
  to_number: data.toNumber,
  override_agent_id: bot.retellAgentId,
  // NEW: Add agent overrides
  ...(data.agentOverrides && {
    agent_overrides: data.agentOverrides
  }),
  metadata: {...}
})
```

#### 4.3 UI

**Dosya: `src/components/calls/initiate-call-dialog.tsx`**

Advanced options bölümü ekle:
- Override Voice (optional)
- Override Prompt (optional)
- Custom Begin Message (optional)

---

## Priority 5: Web Call Support

### Hedef
Browser-based web call (in-browser calling) desteği eklemek.

### Yapılacaklar

#### 5.1 Database Update

**Dosya: `prisma/schema.prisma`**

```prisma
enum CallType {
  PHONE
  WEB
}

model Call {
  // ... existing fields
  callType       CallType @default(PHONE)
  webCallUrl     String?  // Web call access URL
  webCallToken   String?  // Access token
}
```

#### 5.2 API Route

**Dosya: `src/app/api/calls/web/route.ts` (YENİ)**

```typescript
export async function POST(req: NextRequest) {
  // Create web call
  const retellWebCall = await retellClient.call.createWebCall({
    agent_id: bot.retellAgentId,
    metadata: {...}
  })

  // Save to database
  const call = await prisma.call.create({
    data: {
      callType: "WEB",
      retellCallId: retellWebCall.call_id,
      webCallUrl: retellWebCall.access_url,
      webCallToken: retellWebCall.access_token,
      // ... other fields
    }
  })

  return NextResponse.json({ call, webCallUrl: retellWebCall.access_url })
}
```

#### 5.3 UI

**Dosya: `src/components/calls/web-call-widget.tsx` (YENİ)**

Retell Web SDK ile browser'da call widget göster:
```html
<script src="https://unpkg.com/@retellai/web-sdk@latest/dist/retell-web-sdk.js"></script>
```

---

## Priority 6: Call Recording Playback UI

### Hedef
Call details sayfasında recording'i dinleme özelliği eklemek.

### Mevcut Durum
- Recording URL database'de var (`recordingUrl` field)
- UI'da player yok

### Yapılacaklar

#### 6.1 Component

**Dosya: `src/components/calls/call-recording-player.tsx` (YENİ)**

```typescript
export default function CallRecordingPlayer({ recordingUrl }: { recordingUrl: string }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="font-semibold mb-2">Call Recording</h3>
      <audio controls className="w-full">
        <source src={recordingUrl} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    </div>
  )
}
```

#### 6.2 UI Update

**Dosya: `src/app/(dashboard)/customer/calls/[callId]/page.tsx`**

```typescript
{call.recordingUrl && (
  <CallRecordingPlayer recordingUrl={call.recordingUrl} />
)}
```

---

## Priority 7: Real-time Call Monitoring

### Hedef
Aktif call'ları gerçek zamanlı izleme (status updates).

### Yapılacaklar

#### 7.1 API Route

**Dosya: `src/app/api/calls/active/route.ts` (YENİ)**

```typescript
export async function GET(req: NextRequest) {
  // Get active calls from database
  const activeCalls = await prisma.call.findMany({
    where: {
      organizationId,
      status: { in: ["INITIATED", "IN_PROGRESS"] }
    },
    include: { bot: true, initiatedBy: true }
  })

  return NextResponse.json({ activeCalls })
}
```

#### 7.2 Real-time Updates (Optional: WebSocket)

**Basit Yol:** Polling ile her 5 saniyede call status'u kontrol et.

**Gelişmiş Yol:** WebSocket ile webhook event'lerini client'a ilet.

#### 7.3 UI

**Sayfa: `src/app/(dashboard)/admin/calls/live/page.tsx` (YENİ)**

- Active calls listesi
- Real-time status updates
- Call duration timer

---

## Priority 8: Batch Call Functionality

### Hedef
Toplu arama yapma özelliği (CSV upload ile).

### Yapılacaklar

#### 8.1 API Route

**Dosya: `src/app/api/calls/batch/route.ts` (YENİ)**

```typescript
export async function POST(req: NextRequest) {
  const { botId, phoneNumbers, fromNumberId } = await req.json()

  // Retell'de batch call oluştur
  const batchCall = await retellClient.call.createBatchCall({
    agent_id: bot.retellAgentId,
    from_number: fromNumber,
    to_numbers: phoneNumbers, // Array of phone numbers
    metadata: {...}
  })

  // Database'e kaydet
  // Her phone number için ayrı Call record
}
```

#### 8.2 UI

**Sayfa: `src/app/(dashboard)/admin/calls/batch/page.tsx` (YENİ)**

- CSV upload
- Phone number list preview
- Bot selection
- From number selection
- Schedule time (optional)

---

## Implementation Sırası (Adım Adım)

### Phase 1: Critical Features (1-2 gün)
1. ✅ **Phone Number Management** - Retell API ile tam entegrasyon
2. ✅ **Voice Selection** - Dinamik voice listesi
3. ✅ **Call Recording Playback** - UI component

### Phase 2: Enhanced Features (2-3 gün)
4. ✅ **Agent Overrides** - Call-time customization
5. ✅ **Web Call Support** - Browser-based calls
6. ✅ **Real-time Call Monitoring** - Active calls dashboard

### Phase 3: Advanced Features (2-3 gün)
7. ✅ **Agent Version Management** - Versioning system
8. ✅ **Batch Call** - Toplu arama

### Phase 4: Testing & Polish (1 gün)
9. ✅ End-to-end testing
10. ✅ Bug fixes
11. ✅ Documentation updates

---

## Teknik Notlar

### Retell SDK Usage

```typescript
// Phone Number
await retellClient.phoneNumber.list()
await retellClient.phoneNumber.create({ area_code: "415" })
await retellClient.phoneNumber.update(id, { agent_id: "..." })
await retellClient.phoneNumber.delete(id)

// Voice
await retellClient.voice.list()

// Agent
await retellClient.agent.publish(agentId)

// Call
await retellClient.call.createWebCall({ agent_id: "..." })
await retellClient.call.createBatchCall({ to_numbers: [...] })
```

### Database Migration

```bash
# After schema changes
npx prisma db push
# or
npx prisma migrate dev --name add_retell_integration_fields
```

### Environment Variables

```bash
# Already exists
RETELL_API_KEY="key_..."
RETELL_WEBHOOK_SECRET="whsec_..."
```

---

## Success Criteria

- [ ] Phone numbers Retell'den satın alınabiliyor
- [ ] Voice listesi dinamik olarak yükleniyor
- [ ] Call recording dinlenebiliyor
- [ ] Web call browser'da açılabiliyor
- [ ] Agent overrides çalışıyor
- [ ] Active calls real-time izlenebiliyor
- [ ] Batch call yapılabiliyor
- [ ] Agent versiyonları yönetilebiliyor
- [ ] Tüm özellikler multi-tenant yapıda çalışıyor
- [ ] Admin ve Customer rolleri doğru çalışıyor

---

## Referanslar

- [Retell AI API Documentation](https://docs.retellai.com)
- [Retell TypeScript SDK](https://github.com/RetellAI/retell-typescript-sdk)
- [Retell Web SDK](https://docs.retellai.com/api-references/create-web-call)
