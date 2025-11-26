# SendStream Design System

## 🎨 Color Palette

### Primary (Purple/Violet)
- `primary-50` to `primary-950` - Main brand color
- Used for: Primary CTAs, links, active states

### Secondary (Cyan/Teal)
- `secondary-50` to `secondary-950` - Supporting brand color
- Used for: Secondary CTAs, accents, highlights

### Accent (Pink)
- `accent-50` to `accent-950` - Emphasis color
- Used for: Highlights, special badges, attention-grabbing elements

### Neutral (Slate)
- `neutral-50` to `neutral-950` - Grayscale palette
- Used for: Text, backgrounds, borders

## 📝 Typography

### Font Families
- **Display/Headings**: Manrope (via Google Fonts)
  - CSS Variable: `--font-geist`
  - Class: `font-display`
  
- **Body Text**: Inter (via Google Fonts)
  - CSS Variable: `--font-inter`
  - Class: `font-sans` (default)

### Font Sizes
- `text-xs` (0.75rem) to `text-9xl` (8rem)
- 13 responsive sizes configured with proper line heights

## 🎭 Components

### Button
**Variants:**
- `primary` - Purple gradient with shadow
- `secondary` - Cyan gradient with shadow
- `outline` - Bordered with hover fill
- `ghost` - Transparent with hover background
- `gradient` - Animated multi-color gradient
- `danger` - Red for destructive actions

**Sizes:** `sm`, `md`, `lg`, `xl`

**Features:**
- Loading states with spinner
- Left/right icon support
- Full width option
- Disabled states

### Card
**Variants:**
- `default` - White/dark background with border
- `hover` - Adds shadow and lift on hover
- `glass` - Backdrop blur with transparency
- `gradient` - Multi-color gradient background

**Padding:** `none`, `sm`, `md`, `lg`, `xl`

### Badge
**Variants:**
- `default`, `primary`, `secondary`, `success`, `warning`, `error`, `outline`

**Sizes:** `sm`, `md`, `lg`

### Container
**Sizes:**
- `sm` (max-w-3xl)
- `md` (max-w-5xl)
- `lg` (max-w-6xl)
- `xl` (max-w-7xl)
- `full` (max-w-full)

## ✨ Special Effects

### Glass Morphism
```tsx
<div className="glass">...</div>        // Light glass effect
<div className="glass-strong">...</div>  // Strong glass effect
```

### Gradient Text
```tsx
<span className="gradient-text">...</span>           // Primary → Accent → Secondary
<span className="gradient-text-secondary">...</span>  // Secondary → Accent → Primary
```

### Mesh Gradients
```tsx
<div className="mesh-gradient">...</div>      // Light theme mesh
<div className="mesh-gradient-dark">...</div> // Dark theme mesh
```

### Shadows
- `shadow-glow` - Colored glow effect (primary)
- `shadow-glow-lg` - Larger glow effect
- `shadow-glow-cyan` - Cyan glow effect
- `shadow-soft` - Soft shadow
- `shadow-soft-lg` - Large soft shadow
- `shadow-inner-glow` - Inner glow effect

## 🎬 Animations

### Available Animations
- `animate-fade-in` - Fade in from opacity 0
- `animate-fade-in-up` - Fade in and slide up
- `animate-fade-in-down` - Fade in and slide down
- `animate-slide-in-left` - Slide in from left
- `animate-slide-in-right` - Slide in from right
- `animate-scale-in` - Scale up from 0.95
- `animate-bounce-slow` - Slow bounce
- `animate-pulse-slow` - Slow pulse
- `animate-shimmer` - Shimmer effect
- `animate-gradient` - Animated gradient
- `animate-float` - Floating animation

### Animation Delays
Use Tailwind's `style` prop for delays:
```tsx
<div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
```

## 🔧 Utility Classes

### Custom Utilities
- `text-balance` - Better text wrapping
- `scrollbar-hide` - Hide scrollbar
- `aos-init` / `aos-animate` - Scroll animations

### Custom Scrollbar
Custom styled scrollbar with rounded thumb (applied globally)

## 📱 Responsive Design

All components are fully responsive with breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## 🌙 Dark Mode

All components include dark mode support using Tailwind's `dark:` variant.

## 🎯 Usage Examples

### Hero Section
```tsx
<section className="mesh-gradient-dark">
  <Container size="xl">
    <h1 className="font-display gradient-text">Title</h1>
    <Button variant="gradient" size="lg">CTA</Button>
  </Container>
</section>
```

### Feature Card
```tsx
<Card variant="hover">
  <Badge variant="primary" size="sm">New</Badge>
  <h3 className="font-display">Feature Title</h3>
  <p className="text-neutral-400">Description</p>
</Card>
```

### Glass Navigation
```tsx
<nav className="glass-strong border-b border-white/10">
  <Container size="xl">
    {/* Navigation content */}
  </Container>
</nav>
```

## 📦 Dependencies

- `clsx` - Conditional className utility
- `tailwind-merge` - Merge Tailwind classes without conflicts
- `lucide-react` - Icon library
- `next/font/google` - Google Fonts integration

## 🚀 Best Practices

1. **Use the `cn()` utility** for merging classes:
   ```tsx
   import { cn } from '@/utils/cn';
   <div className={cn('base-class', conditional && 'conditional-class', className)} />
   ```

2. **Leverage design tokens** instead of arbitrary values:
   ```tsx
   // ✅ Good
   <div className="bg-primary-500 text-white">
   
   // ❌ Avoid
   <div className="bg-[#a855f7] text-[#ffffff]">
   ```

3. **Use semantic variants** for consistent UI:
   ```tsx
   <Button variant="primary">Main Action</Button>
   <Button variant="outline">Secondary Action</Button>
   ```

4. **Add animations for better UX**:
   ```tsx
   <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
   ```

5. **Utilize Container for consistent spacing**:
   ```tsx
   <Container size="xl" className="py-20">
     {/* Section content */}
   </Container>
   ```

---

**Last Updated:** November 2024
**Version:** 1.0.0
