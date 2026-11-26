import React from "react";
import {
  BookOpen,
  CheckSquare,
  Code2,
  Film,
  Home,
  Lightbulb,
  ListTodo,
  Music,
  Plane,
  ShoppingCart,
  Star,
  Utensils,
} from "lucide-react";

interface ListIconProps {
  iconId: string;
  size?: number;
  color?: string;
}

export const ListIcon: React.FC<ListIconProps> = ({
  iconId,
  size = 20,
  color = "currentColor",
}) => {
  const props = { size, color, strokeWidth: 2 };
  switch (iconId) {
    case "shopping-cart":
      return <ShoppingCart {...props} />;
    case "check":
      return <CheckSquare {...props} />;
    case "book":
      return <BookOpen {...props} />;
    case "movie":
      return <Film {...props} />;
    case "idea":
      return <Lightbulb {...props} />;
    case "travel":
      return <Plane {...props} />;
    case "code":
      return <Code2 {...props} />;
    case "home":
      return <Home {...props} />;
    case "star":
      return <Star {...props} />;
    case "music":
      return <Music {...props} />;
    case "food":
      return <Utensils {...props} />;
    default:
      return <ListTodo {...props} />;
  }
};

export function getNeutralAccentBorder(color: string): string {
  const upper = color.toUpperCase();
  if (upper === "#FFFFFF" || upper === "#FFF") {
    return "var(--win-border-hover)";
  }
  return color;
}

export const ListIconBadge: React.FC<{
  iconId: string;
  color: string;
  size?: number;
}> = ({ iconId, color, size = 40 }) => {
  const upper = color.toUpperCase();
  const isWhite = upper === "#FFFFFF" || upper === "#FFF";
  const isBlack = upper === "#111827" || upper === "#000000" || upper === "#000";

  const bg = isWhite
    ? "#1f2937"
    : isBlack
    ? "#e5e7eb"
    : `${color}1F`;
  const fg = isWhite ? "#FFFFFF" : isBlack ? "#111827" : color;
  const border = isWhite || isBlack ? "1px solid var(--win-border-1)" : "none";

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${Math.round(size * 0.25)}px`,
        backgroundColor: bg,
        border,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <ListIcon iconId={iconId} size={Math.round(size * 0.5)} color={fg} />
    </div>
  );
};
