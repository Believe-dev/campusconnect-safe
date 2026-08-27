import { useState } from "react";

// Curated, categorized subset rather than a raw dump of ~780 emojis — an
// unlabeled grid that large isn't a usable picker, just a wall of glyphs.
const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
      "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙",
      "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔",
      "😐", "😑", "😶", "🙄", "😏", "😴", "🥱", "😪", "😌", "🤤",
    ],
  },
  {
    label: "Reactions",
    emojis: [
      "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😢", "😭", "😤",
      "😠", "😡", "🤬", "😞", "😔", "😟", "😕", "🙁", "☹️", "😖",
      "😣", "😩", "😫", "🥺", "😮", "😯", "😲", "😧", "😦", "🤯",
    ],
  },
  {
    label: "Gestures",
    emojis: [
      "👍", "👎", "👌", "🤌", "✌️", "🤞", "🤟", "🤘", "👏", "🙌",
      "👐", "🤲", "🙏", "💪", "🤝", "👋", "🤙", "☝️", "✋", "👊",
    ],
  },
  {
    label: "Hearts",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💯", "✨",
    ],
  },
  {
    label: "Objects",
    emojis: [
      "🔥", "🎉", "🎊", "🛍️", "📦", "💰", "💳", "⭐", "🌟", "✅",
      "❌", "⚡", "⏰", "📱", "💬", "📸", "🎁", "🚚", "👀", "💡",
    ],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export const EmojiPicker = ({ onSelect }: EmojiPickerProps) => {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className="w-72 rounded-2xl bg-white p-3 shadow-floating">
      <div className="mb-2 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {EMOJI_CATEGORIES.map((category, index) => (
          <button
            key={category.label}
            type="button"
            onClick={() => setActiveCategory(index)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
              activeCategory === index
                ? "bg-flora-ink text-white"
                : "text-flora-muted hover:bg-flora-chip hover:text-flora-ink"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>
      <div className="grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto">
        {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition hover:bg-flora-chip"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
