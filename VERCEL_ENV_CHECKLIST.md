# Vercel Environment Variables Checklist

Build hatasının nedeni: Vercel'de environment variables eksik veya yanlış.

## Kontrol Edilmesi Gerekenler:

### 1. Vercel Dashboard'a Git
- https://vercel.com/[username]/siparisbot/settings/environment-variables

### 2. Bu Environment Variables'ların Olduğundan Emin Ol:

#### DATABASE_URL (Zorunlu - Build Sırasında Gerekli!)
```
Production, Preview, Development ortamlarında olmalı
Örnek: postgresql://user:password@host:5432/database
```

#### NEXTAUTH_URL (Zorunlu)
```
Production: https://siparisbot.vercel.app (veya kendi domain'in)
Preview: Vercel otomatik doldurur
Development: http://localhost:3000
```

#### NEXTAUTH_SECRET (Zorunlu)
```
Güçlü random bir string olmalı
Üret: openssl rand -base64 32
```

#### RETELL_API_KEY (Opsiyonel - runtime'da gerekli)
```
Retell AI dashboard'dan al
```

#### RETELL_WEBHOOK_SECRET (Opsiyonel)
```
Retell AI webhook secret
```

#### NEXT_PUBLIC_APP_URL (Opsiyonel ama önerilen)
```
Production: https://siparisbot.vercel.app
```

### 3. ÖNEMLİ: DATABASE_URL Nereden Alınır?

Eğer PostgreSQL veritabanın yoksa:
- Vercel Postgres kullan: https://vercel.com/docs/storage/vercel-postgres
- Veya Neon: https://neon.tech (ücretsiz tier var)
- Veya Supabase: https://supabase.com (ücretsiz tier var)

### 4. Sonra Ne Yapmalı?

1. Environment variables'ları ekle
2. Yeni bir deployment tetikle (otomatik olur veya redeploy butonuna bas)
3. Build başarılı olacak!

## Build Neden Başarısız Oluyor?

Next.js build sırasında:
1. Route dosyalarını analiz ediyor
2. Her route `import { prisma }` yapıyor
3. Prisma initialize olurken DATABASE_URL'e ihtiyaç duyuyor
4. DATABASE_URL yoksa → CRASH!

Bu yüzden DATABASE_URL sadece runtime'da değil, BUILD TIME'da da gerekli!
