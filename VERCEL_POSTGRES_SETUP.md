# Vercel Postgres Kurulum Rehberi

## Adım 1: Vercel Postgres Oluştur

1. **Vercel Dashboard'a git:**
   https://vercel.com/dashboard

2. **Storage sekmesine tıkla** (üst menüde)

3. **"Create Database" butonuna tıkla**

4. **Postgres'i seç**

5. **Database adı ver:** `siparisbot-db` (istediğin ismi verebilirsin)

6. **Region seç:** En yakın bölgeyi seç (örn: Frankfurt, Amsterdam)

7. **Create butonu**na tıkla

8. **Projeyi bağla:** 
   - "Connect to Project" sekmesine geç
   - `siparisbot` projesini seç
   - "Connect" butonuna tıkla

✅ Bu işlem otomatik olarak projenize DATABASE_URL'i ekler!

---

## Adım 2: Diğer Environment Variables'ları Ekle

Vercel Dashboard → `siparisbot` projesi → Settings → Environment Variables

### 2.1 NEXTAUTH_SECRET Oluştur

Terminal'de çalıştır:
```bash
openssl rand -base64 32
```

Çıkan değeri kopyala ve Vercel'e ekle:
- Key: `NEXTAUTH_SECRET`
- Value: (kopyaladığın değer)
- Environments: Production, Preview, Development (hepsini seç)

### 2.2 NEXTAUTH_URL Ekle

- Key: `NEXTAUTH_URL`
- Value: `https://your-deployment-url.vercel.app` (deployment'tan sonra güncelleyeceksin)
- Environment: Production

### 2.3 NEXT_PUBLIC_APP_URL Ekle (Opsiyonel)

- Key: `NEXT_PUBLIC_APP_URL`
- Value: `https://your-deployment-url.vercel.app`
- Environment: Production

---

## Adım 3: Database Migration Çalıştır

Database oluşturduktan SONRA (deployment başarılı olduktan sonra):

### Local'den Vercel Postgres'e bağlan:

1. **Vercel CLI yükle:**
```bash
npm i -g vercel
```

2. **Login ol:**
```bash
vercel login
```

3. **Projeyi bağla:**
```bash
vercel link
```

4. **Environment variables'ı çek:**
```bash
vercel env pull .env.local
```

5. **Migration çalıştır:**
```bash
npx prisma migrate deploy
```

6. **Seed data ekle (opsiyonel):**
```bash
npm run db:seed
```

---

## Adım 4: Redeploy

Vercel Dashboard'da:
- Deployments sekmesi
- En son deployment'ın yanındaki "..." menüsü
- "Redeploy" → "Redeploy"

VEYA

```bash
git commit --allow-empty -m "chore: redeploy with Vercel Postgres"
git push
```

---

## ✅ Build Başarılı Olmalı!

Artık:
- ✅ DATABASE_URL var (Vercel Postgres otomatik ekledi)
- ✅ NEXTAUTH_SECRET var
- ✅ NEXTAUTH_URL var
- ✅ Build başarılı olacak!

---

## Sorun Yaşarsan

Vercel Dashboard'da Logs sekmesine git ve hatayı bana gönder.
