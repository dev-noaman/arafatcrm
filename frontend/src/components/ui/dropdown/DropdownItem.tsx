import { ReactNode } from "react";
import { Link } from "react-router-dom";

export interface DropdownItemProps {
  children: ReactNode;
  tag?: "a" | "button";
  to?: string;
  onItemClick?: () => void;
  className?: string;
}

export const DropdownItem = ({
  children,
  tag = "button",
  to,
  onItemClick,
  className,
}: DropdownItemProps) => {
  const handleItemClick = () => {
    onItemClick?.();
  };

  if (tag === "a" && to) {
    return (
      <Link to={to} onClick={handleItemClick} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={handleItemClick} className={className}>
      {children}
    </button>
  );
};
