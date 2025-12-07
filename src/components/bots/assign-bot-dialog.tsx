"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface AssignBotDialogProps {
    isOpen: boolean
    onClose: () => void
    botId: string | null
    customers: {
        id: string
        name: string | null
        email: string
    }[]
    onAssignSuccess?: () => void
}

export default function AssignBotDialog({
    isOpen,
    onClose,
    botId,
    customers,
    onAssignSuccess
}: AssignBotDialogProps) {
    const [selectedUserId, setSelectedUserId] = useState<string>("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleAssign = async () => {
        if (!botId || !selectedUserId) return

        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/bots/${botId}/assign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: selectedUserId }),
            })

            if (!response.ok) {
                throw new Error("Failed to assign bot")
            }

            onAssignSuccess?.()
            onClose()
            setSelectedUserId("")
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Kullanıcıya Asistan Ata</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Müşteri Seç</Label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Bir müşteri seçin..." />
                            </SelectTrigger>
                            <SelectContent>
                                {customers.map((customer) => (
                                    <SelectItem key={customer.id} value={customer.id}>
                                        {customer.name || customer.email} ({customer.email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        İptal
                    </Button>
                    <Button
                        onClick={handleAssign}
                        disabled={!selectedUserId || isLoading}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Ata
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
