# Categories Feature 🎨

## Overview
The categories feature allows performers to tag themselves with specific content types (like "Sensual," "Deep Talks," "Dance Party," etc.) and enables users to filter performers based on these categories.

## What Was Implemented

### 1. **Categories Constants** (`src/constants/categories.ts`)
Defined 16 categories organized into 6 groups:

#### Connection & Conversation 💫
- 🗣️ Talk to Strangers
- 🌌 Deep Talks

#### Sensual 💞
- 💞 Sensual & Intimate

#### Debate & Ideas 🧠
- 🧠 Mock UN / Debates
- 💡 Idea Lab

#### Mind & Wellbeing 🧘‍♀️
- 🕊️ Meditation Room
- 🌿 Breathe & Relax
- 💬 Affirmation Circle

#### Creativity & Expression 🎨
- 📚 Story Builders
- ✍️ Poetry Lounge
- 🎨 Art & Design Share
- 🎭 Improv & Roleplay

#### Fun & Play 🎉
- 💃 Dance Party
- 🎲 Truth or Dare (PG)
- 🧩 Trivia Night
- 🔄 Random Roulette

### 2. **Data Model Updates**
- **Performer Interface**: Added `categories: string[]` field
- **MatchFilters Interface**: Added `categories?: string[]` for filtering
- **Database**: Performers now store category IDs in their profile

### 3. **Backend Updates** (`src/services/PerformerService.ts`)
- Updated `mapDocToPerformer` to include categories field
- Enhanced `applyClientFilters` to filter performers by selected categories
- If a user selects a category, only performers offering that category will be shown

### 4. **UI Components**

#### Main Page (`src/app/page.tsx`)
- **Category Filter Dropdown**: Located next to the gender filter
- Organized by category groups with icons
- Real-time filtering as users select categories
- Shows "All Categories" by default

#### Performer Card (`src/components/PerformerCard.tsx`)
- **Category Tags Display**: Shows up to 2 categories per card
- Styled with purple/pink gradient background
- Shows "+X more" if performer has more than 2 categories
- Categories appear between bio and tags section

#### Profile Page (`src/app/profile/page.tsx`)
- **Performer Category Selection**: Only visible when "Enable performer mode" is checked
- Multi-select interface organized by category groups
- Shows count of selected categories
- Visual feedback when categories are selected (purple/pink gradient)
- Scrollable container for all 16 categories
- Non-editing view shows first 3 categories with "+X more" indicator

## How It Works (For Users) 🎯

### As a User Browsing:
1. Go to the home page
2. Use the **"Category"** dropdown next to the gender filter
3. Select a category (e.g., "💞 Sensual & Intimate")
4. Only performers who offer that category will be displayed
5. You can see which categories each performer offers on their card

### As a Performer:
1. Go to your **Profile** page
2. Check **"Enable performer mode"**
3. Scroll down to **"Categories You Offer"** section
4. Click on any categories you want to offer (they'll highlight in purple/pink)
5. Click **"Save Changes"**
6. Your selected categories will now be visible to users on your performer card

## Technical Details 🔧

### Data Flow:
1. **Save**: Profile page → `updateProfile()` → Firebase `users` collection & `performers` collection
2. **Filter**: Main page → `PerformerService.getPerformers()` → Firebase query → Client-side filter
3. **Display**: Performer cards → `getCategoriesByIds()` → Show category badges

### Category IDs:
Categories use kebab-case IDs (e.g., `sensual`, `deep-talks`, `dance-party`)

### Firestore Structure:
```javascript
// users/{userId}
{
  categories: ["sensual", "deep-talks"],  // If user is a performer
  // ... other fields
}

// performers/{performerId}
{
  categories: ["sensual", "deep-talks"],
  // ... other fields
}
```

## Benefits 🌟

1. **Better Discovery**: Users can quickly find performers offering specific content types
2. **Clear Expectations**: Both parties know what to expect from the call
3. **Niche Content**: Performers can specialize and attract their ideal audience
4. **Flexible**: Performers can offer multiple categories
5. **Organized**: Categories are grouped logically for easy browsing

## Example Use Cases 📝

### Example 1: Finding a Meditation Partner
1. User selects "🕊️ Meditation Room" from the category filter
2. Sees only performers who offer meditation sessions
3. Connects with someone who specializes in guided meditation

### Example 2: Performer Specialization
1. Performer enables performer mode
2. Selects "💞 Sensual & Intimate" and "🌌 Deep Talks"
3. Gets matched with users looking for meaningful, intimate conversations

### Example 3: Fun Activity
1. User wants to dance
2. Selects "💃 Dance Party" category
3. Finds energetic performers ready to dance together

## Future Enhancements 🚀

Possible future improvements:
- Allow multiple category selection for filtering
- Add category statistics (most popular categories)
- Category-based pricing (different fees for different categories)
- Time-based category availability (e.g., "Meditation Room" only in mornings)
- User preferences to recommend categories based on history

## Testing 🧪

To test the categories feature:

1. **As Performer**:
   - Go to Profile → Enable performer mode
   - Select 2-3 categories (including "Sensual")
   - Save and verify categories appear on your card

2. **As User**:
   - Go to home page
   - Use category dropdown to filter
   - Verify only performers with that category appear
   - Check performer cards show their categories

3. **Edge Cases**:
   - Performer with no categories selected (still shows in "All Categories")
   - Performer with 10+ categories (shows "+X more")
   - Filter + search combination (both work together)

---

**Note**: All category content should follow platform guidelines and community standards. The "Sensual & Intimate" category is for mindful emotional connection, not explicit content.

