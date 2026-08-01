"use client";

import * as React from "react";
import Image from "next/image";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Image with a built-in branded gradient backdrop. If the remote photo
 * fails to load, the gradient + leaf mark remains, so the layout never
 * looks broken, which helps while the client's real photography is pending.
 */
export function Photo({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = React.useState(false);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-primary/15 via-sage/40 to-secondary",
        className,
      )}
    >
      {!failed && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Leaf className="h-12 w-12 text-primary/30" />
        </div>
      )}
    </div>
  );
}
