import { Share2 } from "lucide-react";
import { shareContent } from "@/lib/share-utils";

interface ShareButtonProps {
  title: string;
  text: string;
  url: string;
  className?: string;
}

export default function ShareButton({ title, text, url, className }: ShareButtonProps) {
  return (
    <button
      onClick={() => shareContent({ title, text, url })}
      className={className || "p-2 text-muted-foreground hover:text-foreground transition-ritual tap-scale"}
    >
      <Share2 className="h-5 w-5" />
    </button>
  );
}
