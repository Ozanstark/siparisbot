"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"

export default function ProfileForm() {
    const { data: session, update } = useSession()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        name: session?.user?.name || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    })

    // Update local state when session loads
    useState(() => {
        if (session?.user?.name) {
            setFormData(prev => ({ ...prev, name: session.user.name || "" }))
        }
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setSuccess(null)

        // Basic Validation
        if (formData.newPassword) {
            if (formData.newPassword !== formData.confirmPassword) {
                setError("New passwords do not match")
                setIsLoading(false)
                return
            }
            if (formData.newPassword.length < 6) {
                setError("Password must be at least 6 characters")
                setIsLoading(false)
                return
            }
            if (!formData.currentPassword) {
                setError("Current password is required to set a new password")
                setIsLoading(false)
                return
            }
        }

        try {
            const response = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    currentPassword: formData.currentPassword || undefined,
                    newPassword: formData.newPassword || undefined,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Failed to update profile")
            }

            setSuccess("Profile updated successfully")

            // Clear password fields
            setFormData(prev => ({
                ...prev,
                currentPassword: "",
                newPassword: "",
                confirmPassword: ""
            }))

            // Update session to reflect new name immediately
            await update({ name: formData.name })

        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6 text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded mb-6 text-sm">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email - Read Only */}
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Email Address</label>
                    <input
                        type="email"
                        value={session?.user?.email || ""}
                        disabled
                        className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
                </div>

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Full Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Your Name"
                    />
                </div>

                <div className="border-t border-gray-100 my-6 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Change Password</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Current Password</label>
                            <input
                                type="password"
                                value={formData.currentPassword}
                                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Required to change password"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">New Password</label>
                                <input
                                    type="password"
                                    value={formData.newPassword}
                                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="Min. 6 characters"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="Confirm new password"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex pt-2">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50"
                    >
                        {isLoading ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </div>
    )
}
