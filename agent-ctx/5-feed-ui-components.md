# Task: Create Social Feed UI Components (Teranga Biz ERP)

## Summary
Created all 6 UI component files for the internal social feed (Facebook-like timeline) feature. All files pass ESLint with zero errors.

## Files Created

### 1. `src/lib/feed-utils.ts` — Utility Functions
- `getTimeAgo(dateStr)` — French relative time ("À l'instant", "Il y a 5min", "Il y a 2h", "Il y a 3j", etc.)
- `formatFileSize(bytes)` — Human-readable file sizes ("1.2 MB", "345 KB")
- `formatCount(n)` — Returns empty string if 0, else the number
- `getInitials(name)` — Extracts up to 2 character initials from a name
- `truncateText(text, maxLength)` — Truncates text with "..."

### 2. `src/components/feed/create-post-box.tsx` — Post Creation Form
- Textarea with placeholder "Quoi de neuf dans l'équipe ?"
- Character count indicator (2000 max) with red warning at 90%
- Action buttons: Image upload (ImageIcon), Document upload (Paperclip icon)
- Hidden file inputs for images (accept: image/*) and documents (accept: .pdf,.doc,.docx,.xls,.xlsx)
- File preview area: image thumbnails with remove, document list with name/size/remove
- Orange "Publier" button, disabled when empty + no files
- POST to /api/posts with FormData, invalidates ['feed'] query
- Loading spinner during upload, sonner toast on success/error

### 3. `src/components/feed/post-card.tsx` — Facebook-style Post Card
- Exports `FeedPost` interface and all sub-types (FeedPostAuthor, FeedPostAttachment, FeedPostComment)
- Author header: orange avatar with initials, bold name (text-gray-900), time ago, pin icon if pinned
- Content: whitespace-pre-wrap, text-gray-900
- Image gallery: responsive grid (1 col, 2 col, 3 col) with max-heights, clickable to open
- Document attachments: cards with FileText icon, filename, size, download link
- Stats bar: reaction count + comment count (clickable to toggle comments)
- Action buttons: Like/React (with ReactionPicker), Comment (toggles section), Delete (red, author only)
- Integrated CommentSection and ReactionPicker components

### 4. `src/components/feed/comment-section.tsx` — Comments Area
- "Voir les X commentaires" expand/collapse button
- Comment list with: small orange avatar, author name (bold, text-gray-900), time ago, content (text-gray-800)
- Scrollable with max-h-96 overflow-y-auto
- Reply input: rounded input + orange "Envoyer" send button
- Loading state on submit, Enter key support
- Auto-scroll to newest comment

### 5. `src/components/feed/reaction-picker.tsx` — Emoji Reaction Popup
- 4 options: 👍 J'aime, ❤️ J'aime, 🎉 Bravo, 💡 Super
- Small rounded popup (pill-shaped) with shadow
- Orange highlight on currently selected reaction
- Labels hidden on mobile, shown on lg+
- Scale animation on hover

### 6. `src/components/feed/feed-filters.tsx` — Filter Tabs
- 5 horizontal pill tabs: Tout | Images | Documents | Annonces | Mes publications
- Active tab: orange-500 bg, white text, shadow
- Inactive: gray-100 bg, gray-600 text, hover effect
- Horizontal scrollable on mobile (overflow-x-auto)
- Exports `FeedFilter` type for parent consumption

## Design Principles Followed
- All text: text-gray-900/800/700 for content, text-gray-500 only for secondary info
- Cards: bg-white border border-gray-200 rounded-xl shadow-sm
- Orange accent: bg-orange-500, bg-orange-600 for buttons/active states
- Responsive: mobile-first, flex layouts, overflow handling
- shadcn/ui components: Button, Card, Input, Avatar, AvatarFallback, Separator, Badge
- lucide-react icons throughout
- sonner for toast notifications
- @tanstack/react-query for data management (invalidate queries)
