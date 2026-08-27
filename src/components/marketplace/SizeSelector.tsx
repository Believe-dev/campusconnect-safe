interface SizeSelectorProps {
  availableSizes: string[];
  selectedSize?: string;
  onSizeSelect: (size: string) => void;
  required?: boolean;
}

export const SizeSelector: React.FC<SizeSelectorProps> = ({
  availableSizes,
  selectedSize,
  onSizeSelect,
  required = false,
}) => {
  if (!availableSizes || availableSizes.length === 0) {
    return null;
  }

  return (
    <div>
      <span className="text-sm font-medium text-flora-ink">
        Select Size {required && <span className="text-red-500">*</span>}
      </span>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Available sizes">
        {availableSizes.map((size) => {
          const isSelected = selectedSize === size;
          return (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSizeSelect(size)}
              className={`min-w-[48px] rounded-full border px-4 py-2 text-sm font-medium transition ${
                isSelected
                  ? "border-flora-ink bg-flora-ink text-white"
                  : "border-flora-ink/10 bg-white/70 text-flora-ink hover:bg-white"
              }`}
            >
              {size}
            </button>
          );
        })}
      </div>
    </div>
  );
};