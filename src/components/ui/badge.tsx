export const Badge = ({ children, variant = "outline", className = "", ...props }: any) => {
  const baseStyles = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors";
  
  const variants: Record<string, string> = {
    default: "border-transparent bg-primary text-primary-foreground",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    destructive: "border-transparent bg-destructive text-destructive-foreground",
    outline: "text-foreground",
    success: "border-transparent bg-success text-success-foreground",
    warning: "border-transparent bg-warning text-warning-foreground",
  };

  const variantClass = variants[variant] || variants.outline;
  
  return (
    <span className={`${baseStyles} ${variantClass} ${className}`} {...props}>
      {children}
    </span>
  );
};