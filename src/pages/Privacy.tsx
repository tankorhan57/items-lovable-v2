import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-6 py-12 animate-fade-in">
      <div className="mx-auto max-w-2xl">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h1 className="text-3xl font-serif text-foreground mb-8">Privacy Policy</h1>

        <div className="prose prose-sm text-foreground/90 space-y-6">
          <p className="text-muted-foreground text-sm">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">1. Information We Collect</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We collect information you provide directly: email address, username, display name, profile photo, and content you post. We also collect usage data such as interactions (follows, reactions, appreciations) and device information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">2. How We Use Your Information</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use your information to: provide and improve the App; display your content to other users based on your privacy settings; send notifications you've opted into; and maintain the security of the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">3. Location Data</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you grant location permission, we may attach a city name to your posts. We do not store precise coordinates — only the reverse-geocoded city name. Location sharing is entirely optional.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">4. Data Sharing</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We do not sell your personal data. Your content is shared with other users based on your privacy settings (public or followers-only). We may share data with service providers necessary to operate the App (hosting, storage).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">5. Data Retention</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We retain your data for as long as your account is active. When you delete your account, all associated data (posts, follows, reactions, notes) is permanently removed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">6. Your Rights</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can: access and update your profile information at any time; delete your account and all associated data; control who can see your content via privacy settings; and opt out of push notifications.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">7. Security</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use industry-standard security measures including encrypted connections, row-level security policies, and secure authentication to protect your data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">8. Changes to This Policy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify users of significant changes through the App.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
