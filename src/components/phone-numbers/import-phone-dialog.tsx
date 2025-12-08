"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SipImportForm } from "./sip-import-form"

interface ImportPhoneDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function ImportPhoneDialog({
  isOpen,
  onClose
}: ImportPhoneDialogProps) {
  const [bots, setBots] = useState<any[]>([])

  useEffect(() => {
    if (isOpen) {
      fetch("/api/bots")
        .then(res => res.json())
        .then(data => setBots(data.bots || []))
        .catch(err => console.error("Failed to load bots", err))
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Phone Number</DialogTitle>
          <DialogDescription>
            Add an existing Retell number or connect your own SIP trunk (NetGSM, Twilio BYOC).
          </DialogDescription>
        </DialogHeader>

        <SipImportForm onSuccess={onClose} bots={bots} />
      </DialogContent>
    </Dialog>
  )
}
