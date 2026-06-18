'use client'

import React from 'react'

interface ReactionOption {
  type: string
  emoji: string
  label: string
}

const REACTION_OPTIONS: ReactionOption[] = [
  { type: 'like', emoji: '👍', label: "J'aime" },
  { type: 'love', emoji: '❤️', label: "J'aime" },
  { type: 'celebrate', emoji: '🎉', label: 'Bravo' },
  { type: 'insight', emoji: '💡', label: 'Super' },
]

interface ReactionPickerProps {
  currentReaction?: string | null
  onSelect: (type: string) => void
  onClose: () => void
}

export function ReactionPicker({ currentReaction, onSelect, onClose }: ReactionPickerProps) {
  return (
    <div
      className="flex items-center gap-1 bg-white border border-gray-200 rounded-full shadow-lg px-2 py-1.5"
      onMouseEnter={(e) => {
        // Prevent parent mouseLeave from closing
        e.stopPropagation()
      }}
    >
      {REACTION_OPTIONS.map((option) => (
        <button
          key={option.type}
          onClick={() => onSelect(option.type)}
          onMouseLeave={onClose}
          title={option.label}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all duration-150 ${
            currentReaction === option.type
              ? 'bg-orange-100 scale-110'
              : 'hover:bg-gray-100 hover:scale-110'
          }`}
        >
          <span className="text-lg leading-none">{option.emoji}</span>
          <span className="text-xs text-gray-700 font-medium hidden lg:inline">
            {option.label}
          </span>
        </button>
      ))}
    </div>
  )
}
