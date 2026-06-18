'use client'

import React from 'react'

export type FeedFilter = 'all' | 'images' | 'documents' | 'announcements' | 'mine'

interface FeedFilterOption {
  value: FeedFilter
  label: string
}

const FILTER_OPTIONS: FeedFilterOption[] = [
  { value: 'all', label: 'Tout' },
  { value: 'images', label: 'Images' },
  { value: 'documents', label: 'Documents' },
  { value: 'announcements', label: 'Annonces' },
  { value: 'mine', label: 'Mes publications' },
]

interface FeedFiltersProps {
  activeFilter: FeedFilter
  onFilterChange: (filter: FeedFilter) => void
}

export function FeedFilters({ activeFilter, onFilterChange }: FeedFiltersProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
      {FILTER_OPTIONS.map((option) => {
        const isActive = activeFilter === option.value

        return (
          <button
            key={option.value}
            onClick={() => onFilterChange(option.value)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
              isActive
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
