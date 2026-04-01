import { toast } from "sonner";

interface ShareData {
  title: string;
  text: string;
  url: string;
}

export async function shareContent(data: ShareData) {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (err: any) {
      if (err.name === "AbortError") return false;
      // Fallback to clipboard
    }
  }

  // Clipboard fallback
  try {
    await navigator.clipboard.writeText(data.url);
    toast.success("Link copied to clipboard");
    return true;
  } catch {
    toast.error("Unable to share");
    return false;
  }
}
