import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-6 py-12 animate-fade-in">
      <div className="mx-auto max-w-2xl">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h1 className="text-3xl font-serif text-foreground mb-8">Terms of Service</h1>

        <div className="prose prose-sm text-foreground/90 space-y-6">
          <p className="text-muted-foreground text-sm">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">1. Acceptance of Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By accessing or using Items ("the App"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the App.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">2. Description of Service</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Items is a daily photo-sharing platform that provides a daily prompt encouraging users to capture and share a moment from their day. The service includes social features such as following other users, reactions, and private notes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">3. User Accounts</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You must create an account to use the App. You are responsible for maintaining the security of your account credentials and for all activity under your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">4. User Content</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You retain ownership of content you post. By posting content, you grant Items a non-exclusive, worldwide license to display, distribute, and store your content as needed to operate the service. You agree not to post content that is illegal, harmful, or violates the rights of others.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">5. Prohibited Conduct</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You agree not to: harass other users; post spam or misleading content; attempt to access other users' accounts; reverse engineer the App; or use the App for any unlawful purpose.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">6. Termination</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your account if you violate these terms. You may delete your account at any time through the Settings page.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">7. Disclaimer</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The App is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the App.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">8. Changes to Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may update these terms at any time. Continued use of the App after changes constitutes acceptance of the updated terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
