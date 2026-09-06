import * as React from "react";
import { cn } from "@/lib/utils";

const Image = React.forwardRef(
  ({ className, alt, ...props }, ref) => {
    return (
      <img
        className={cn("h-full w-full object-cover", className)}
        alt={alt}
        ref={ref}
        {...props}
      />
    );
  }
);
Image.displayName = "Image";

export { Image };