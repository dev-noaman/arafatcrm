import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, title, description, action, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-white rounded-xl border border-gray-200 shadow-theme-sm",
          "dark:bg-gray-900 dark:border-gray-800",
          className
        )}
        {...props}
      >
        {(title || description || action) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <div>
              {title && (
                <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                  {title}
                </h3>
              )}
              {description && (
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {description}
                </p>
              )}
            </div>
            {action && <div>{action}</div>}
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
      </div>
    );
  },
);

Card.displayName = "Card";

export const CardTitle = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-lg font-semibold text-gray-900", className)}
      {...props}
    />
  ),
);

CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("mt-1 text-sm text-gray-500", className)}
      {...props}
    />
  ),
);

CardDescription.displayName = "CardDescription";
