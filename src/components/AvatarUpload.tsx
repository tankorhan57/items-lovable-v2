import { useRef, useState } from "react";
import { mapErrorToUserMessage } from "@/lib/error-utils";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-utils";
import { Camera } from "lucide-react";
import { toast } from "sonner";

interface AvatarUploadProps {
  size?: "sm" | "lg";
  onUploaded?: (url: string) => void;
}

export default function AvatarUpload({ size = "lg", onUploaded }: AvatarUploadProps) {
  const { user, profile, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const dimension = size === "lg" ? "h-20 w-20" : "h-16 w-16";
  const avatarUrl = preview || profile?.avatar_url;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !user) return;

    if (f.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }

    setUploading(true);
    try {
      // Square crop at 400px, JPEG compressed
      const compressed = await compressImage(f, 400, 0.85);
      const path = `${user.id}/avatar.jpg`;

      // Upsert overwrites the same path — no orphan files
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      // Cache-bust with timestamp
      const url = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);
      if (updateError) throw updateError;

      // Soft fade transition via state change
      setPreview(url);
      await refreshProfile();
      onUploaded?.(url);
      toast.success("Avatar updated");
    } catch (err: unknown) {
      toast.error(mapErrorToUserMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      className={`relative ${dimension} rounded-full bg-secondary flex items-center justify-center overflow-hidden group transition-all duration-500 ease-out`}
      disabled={uploading}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover transition-opacity duration-300 ease-in-out"
        />
      ) : (
        <span className="text-2xl font-serif text-muted-foreground">
          {profile?.username?.[0]?.toUpperCase() || "?"}
        </span>
      )}
      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {uploading ? (
          <div className="h-5 w-5 rounded-full border-2 border-background border-t-transparent animate-spin" />
        ) : (
          <Camera className="h-5 w-5 text-background" />
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </button>
  );
}
