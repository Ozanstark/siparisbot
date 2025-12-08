"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { importPhoneNumberSchema } from "@/lib/validations"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Info, Globe, Smartphone, Lock } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type ImportPhoneNumberFormValues = z.infer<typeof importPhoneNumberSchema>

interface SipImportFormProps {
    onSuccess: () => void
    bots: any[]
}

export function SipImportForm({ onSuccess, bots }: SipImportFormProps) {
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState("retell")

    const form = useForm<ImportPhoneNumberFormValues>({
        resolver: zodResolver(importPhoneNumberSchema),
        defaultValues: {
            phoneNumber: "",
            nickname: "",
            sipUri: "",
            sipUsername: "",
            sipPassword: ""
        }
    })

    const selectedAgentId = form.watch("agentId")
    const isSip = activeTab === "sip"

    async function onSubmit(data: ImportPhoneNumberFormValues) {
        try {
            // Clear SIP fields if not in SIP mode to avoid validation confusion or bad data
            if (activeTab !== "sip") {
                delete data.sipUri
                delete data.sipUsername
                delete data.sipPassword
            }

            const response = await fetch("/api/phone-numbers/import", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Failed to import phone number")
            }

            const result = await response.json()

            toast({
                title: "Success",
                description: isSip ? "NetGSM line integrated successfully!" : "Number imported successfully from Retell."
            })

            form.reset()
            onSuccess()
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message
            })
        }
    }

    return (
        <div className="space-y-4">
            <Tabs defaultValue="retell" onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="retell">Retell Number</TabsTrigger>
                    <TabsTrigger value="sip">NetGSM / SIP (BYOC)</TabsTrigger>
                </TabsList>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">

                        <TabsContent value="retell">
                            <Alert className="mb-4 bg-muted/50">
                                <Info className="h-4 w-4" />
                                <AlertTitle>Retell Purchased Numbers</AlertTitle>
                                <AlertDescription>
                                    Use this for numbers you already bought or configured directly in the Retell Dashboard.
                                </AlertDescription>
                            </Alert>
                        </TabsContent>

                        <TabsContent value="sip">
                            <Alert className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                                <Globe className="h-4 w-4 text-blue-600" />
                                <AlertTitle>Bring Your Own Carrier (NetGSM, Twilio, etc.)</AlertTitle>
                                <AlertDescription className="text-muted-foreground">
                                    Enter the SIP Trunking details provided by your carrier.
                                </AlertDescription>
                            </Alert>

                            <div className="grid grid-cols-1 gap-4">
                                <FormField
                                    control={form.control}
                                    name="sipUri"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>SIP URI (Termination URI)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. sip.netgsm.com.tr" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="sipUsername"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>SIP Username</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Username" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="sipPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>SIP Password</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="Password" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        {/* Common Fields */}
                        <div className="space-y-4 pt-2 border-t">
                            <FormField
                                control={form.control}
                                name="phoneNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone Number (E.164)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Smartphone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input className="pl-9" placeholder="+905551234567" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormDescription>
                                            Must start with + and country code.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="nickname"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nickname (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Main Office Line" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="agentId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Assign Bot (Agent)</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a bot to handle calls" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {bots.map((bot) => (
                                                    <SelectItem key={bot.id} value={bot.id}>
                                                        {bot.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? "Importing..." : activeTab === 'sip' ? "Connect NetGSM Line" : "Import Number"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </Tabs>
        </div>
    )
}
