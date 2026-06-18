'use client'

import React from 'react'
import QRCode from 'react-qr-code'

interface StoreQRCodeProps {
  url: string
  size?: number
  className?: string
}

export default function StoreQRCode({ url, size = 200, className = '' }: StoreQRCodeProps) {
  if (!url) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-xl ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-gray-400">QR indisponible</span>
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <QRCode
        value={url}
        size={size}
        bgColor="#FFFFFF"
        fgColor="#0F172A"
        level="M"
        className="rounded-xl"
      />
    </div>
  )
}
