import { BUILT_IN_STYLES } from '../lib/styles';
import { useConversionStore } from '../store/conversionStore';
import { useCustomStyles } from '../hooks/useCustomStyles';

export function StyleSelector() {
  const { selectedStyleId, setSelectedStyleId } = useConversionStore();
  const { data: customStyles } = useCustomStyles();

  const allStyles = [
    ...BUILT_IN_STYLES,
    ...(customStyles ?? []).map((s) => ({ id: s.id, label: s.label, emoji: s.emoji })),
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {allStyles.map((style) => (
        <button
          key={style.id}
          onClick={() => setSelectedStyleId(style.id)}
          className={`px-2 py-1 text-xs rounded-md border transition-colors ${
            selectedStyleId === style.id
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-muted text-muted-foreground border-border hover:bg-accent'
          }`}
          title={style.label}
        >
          <span className="mr-1">{style.emoji}</span>
          {style.label}
        </button>
      ))}
    </div>
  );
}
