"use client"

interface CallRecordingPlayerProps {
  recordingUrl: string
  callId?: string
}

export default function CallRecordingPlayer({ recordingUrl, callId }: CallRecordingPlayerProps) {
  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Call Recording</h3>
        <a
          href={recordingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-700 underline"
        >
          Download
        </a>
      </div>

      <audio
        controls
        className="w-full"
        preload="metadata"
      >
        <source src={recordingUrl} type="audio/mpeg" />
        <source src={recordingUrl} type="audio/wav" />
        <source src={recordingUrl} type="audio/ogg" />
        Your browser does not support the audio element.
      </audio>

      {callId && (
        <p className="text-xs text-gray-400 mt-3 font-mono">
          Call ID: {callId}
        </p>
      )}
    </div>
  )
}
