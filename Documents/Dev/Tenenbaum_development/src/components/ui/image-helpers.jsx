import * as React from "react";
import { cn } from "@/lib/utils";

const ImageContainer = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  />
));
ImageContainer.displayName = "ImageContainer";

const ImageWrapper = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative h-full w-full", className)}
    {...props}
  />
));
ImageWrapper.displayName = "ImageWrapper";

const ImageSkeleton = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("absolute inset-0 bg-muted animate-pulse", className)}
    {...props}
  />
));
ImageSkeleton.displayName = "ImageSkeleton";

const ImageError = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground",
      className
    )}
    {...props}
  />
));
ImageError.displayName = "ImageError";

export { ImageContainer, ImageWrapper, ImageSkeleton, ImageError };