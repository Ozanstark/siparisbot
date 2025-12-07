"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Bell, Volume2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface NotificationSettings {
  soundEnabled: boolean
  soundVolume: number
  autoRefresh: boolean
  refreshInterval: number
  showDesktopNotifications: boolean
}

const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  soundVolume: 70,
  autoRefresh: true,
  refreshInterval: 5000,
  showDesktopNotifications: true
}

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS)
  const [testAudioPlaying, setTestAudioPlaying] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem("orderNotificationSettings")
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])

  const saveSettings = () => {
    localStorage.setItem("orderNotificationSettings", JSON.stringify(settings))
    toast({
      title: "Ayarlar Kaydedildi",
      description: "Bildirim ayarlarınız başarıyla güncellendi."
    })
  }

  const testSound = () => {
    setTestAudioPlaying(true)
    const audio = new Audio("/notification.mp3")
    audio.volume = settings.soundVolume / 100
    audio.play()
    audio.onended = () => setTestAudioPlaying(false)
  }

  const testDesktopNotification = () => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Test Bildirimi", {
        body: "Yeni sipariş geldiğinde bu şekilde bildirim alacaksınız!",
        icon: "/favicon.ico",
        tag: "test-notification"
      })
    } else if (Notification.permission === "denied") {
      toast({
        title: "Bildirimler Engellenmiş",
        description: "Tarayıcı ayarlarından bildirimlere izin vermeniz gerekiyor.",
        variant: "destructive"
      })
    } else {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          testDesktopNotification()
        }
      })
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Bildirim Ayarları</h1>
        <p className="text-gray-600 mt-1">Sipariş bildirimleri ve ses ayarlarını özelleştirin</p>
      </div>

      <div className="space-y-6">
        {/* Ses Bildirimleri */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Ses Bildirimleri
            </CardTitle>
            <CardDescription>
              Yeni sipariş geldiğinde ses bildirimi al
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="sound-enabled" className="text-base">
                Ses Bildirimini Aç
              </Label>
              <Switch
                id="sound-enabled"
                checked={settings.soundEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, soundEnabled: checked })
                }
              />
            </div>

            {settings.soundEnabled && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Ses Seviyesi</Label>
                    <span className="text-sm text-gray-600">{settings.soundVolume}%</span>
                  </div>
                  <Slider
                    value={[settings.soundVolume]}
                    onValueChange={([value]) =>
                      setSettings({ ...settings, soundVolume: value })
                    }
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={testSound}
                  disabled={testAudioPlaying}
                  className="w-full"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  {testAudioPlaying ? "Çalıyor..." : "Sesi Test Et"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Masaüstü Bildirimleri */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Masaüstü Bildirimleri
            </CardTitle>
            <CardDescription>
              Tarayıcı bildirimlerini etkinleştir
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="desktop-notifications" className="text-base">
                Masaüstü Bildirimlerini Aç
              </Label>
              <Switch
                id="desktop-notifications"
                checked={settings.showDesktopNotifications}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, showDesktopNotifications: checked })
                }
              />
            </div>

            {settings.showDesktopNotifications && (
              <Button
                variant="outline"
                onClick={testDesktopNotification}
                className="w-full"
              >
                <Bell className="h-4 w-4 mr-2" />
                Bildirimi Test Et
              </Button>
            )}

            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Not:</strong> Masaüstü bildirimleri için tarayıcınızdan izin vermeniz gerekiyor.
            </div>
          </CardContent>
        </Card>

        {/* Otomatik Yenileme */}
        <Card>
          <CardHeader>
            <CardTitle>Otomatik Yenileme</CardTitle>
            <CardDescription>
              Sipariş listesinin ne sıklıkla yenileneceğini ayarlayın
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-refresh" className="text-base">
                Otomatik Yenilemeyi Aç
              </Label>
              <Switch
                id="auto-refresh"
                checked={settings.autoRefresh}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoRefresh: checked })
                }
              />
            </div>

            {settings.autoRefresh && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Yenileme Sıklığı</Label>
                  <span className="text-sm text-gray-600">
                    {settings.refreshInterval / 1000} saniye
                  </span>
                </div>
                <Slider
                  value={[settings.refreshInterval]}
                  onValueChange={([value]) =>
                    setSettings({ ...settings, refreshInterval: value })
                  }
                  min={3000}
                  max={30000}
                  step={1000}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Önerilen: 5 saniye (çok sık yenileme gereksiz trafik oluşturabilir)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kaydet Butonu */}
        <Button onClick={saveSettings} className="w-full" size="lg">
          <Save className="h-4 w-4 mr-2" />
          Ayarları Kaydet
        </Button>

        {/* Reset Butonu */}
        <Button
          variant="outline"
          onClick={() => setSettings(DEFAULT_SETTINGS)}
          className="w-full"
        >
          Varsayılan Ayarlara Dön
        </Button>
      </div>
    </div>
  )
}
