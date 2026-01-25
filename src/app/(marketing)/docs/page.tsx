import type { Metadata } from "next";
import Link from "next/link";
import {
  DocSection,
  DocsNav,
  EditorMockup,
  FeatureBox,
  StepCard,
  TipBox,
  WorkflowDiagram,
} from "./components";

export const metadata: Metadata = {
  title: "Documentation - How to Use EventFXr",
  description:
    "Learn how to create stunning event pages with EventFXr. Step-by-step guide to the page editor, templates, and features.",
  openGraph: {
    title: "EventFXr Documentation",
    description: "Complete guide to creating and managing event pages",
  },
};

export default function DocsPage() {
  return (
    <div className="container py-8 lg:py-12">
      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
        {/* Sidebar navigation */}
        <aside className="hidden lg:block">
          <DocsNav />
        </aside>

        {/* Main content */}
        <main className="min-w-0">
          {/* Hero */}
          <div className="mb-12">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How to Use EventFXr
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Create stunning event pages in minutes. This guide will walk you
              through everything you need to know.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Get Started Free
              </Link>
              <Link
                href="#quick-start"
                className="inline-flex items-center justify-center rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Jump to Quick Start
              </Link>
            </div>
          </div>

          {/* Quick Start */}
          <DocSection
            id="quick-start"
            title="Getting Started"
            description="Four simple steps to create your first event page."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <StepCard
                stepNumber={1}
                title="Create Your Account"
                description="Sign up with your email address to get started."
                icon="👤"
                details={[
                  "Enter your email and create a password",
                  "Verify your email address",
                  "Complete your profile basics",
                ]}
              />
              <StepCard
                stepNumber={2}
                title="Create an Event"
                description="Set up your event with the essential details."
                icon="📅"
                details={[
                  "Click 'Create Event' from your dashboard",
                  "Enter event name, date, and location",
                  "Choose visibility (public or private)",
                ]}
              />
              <StepCard
                stepNumber={3}
                title="Design Your Page"
                description="Customize your event page with our visual editor."
                icon="🎨"
                details={[
                  "Select a template that fits your event",
                  "Customize colors and fonts",
                  "Add sections and upload images",
                ]}
              />
              <StepCard
                stepNumber={4}
                title="Publish & Share"
                description="Go live and start collecting RSVPs."
                icon="🚀"
                details={[
                  "Preview your page before publishing",
                  "Click 'Publish' when ready",
                  "Share the link or send invitations",
                ]}
              />
            </div>

            <WorkflowDiagram
              steps={["Sign Up", "Create Event", "Design Page", "Go Live!"]}
              title="Your Journey"
              className="mt-8"
            />
          </DocSection>

          {/* Templates */}
          <DocSection
            id="templates"
            title="Templates"
            description="Choose a template that matches your event type. Each template includes tailored sections and styling."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <FeatureBox
                  icon="💒"
                  title="Wedding Template"
                  description="Elegant, romantic design perfect for weddings and engagements."
                  highlights={[
                    "Our Story",
                    "Wedding Party",
                    "Travel & Stay",
                    "Dress Code",
                  ]}
                />
                <FeatureBox
                  icon="🎤"
                  title="Conference Template"
                  description="Professional layout for conferences, seminars, and corporate events."
                  highlights={["Speakers", "Sponsors", "Schedule", "Venue Map"]}
                />
                <FeatureBox
                  icon="🎉"
                  title="Party Template"
                  description="Vibrant, fun design for birthdays, celebrations, and social gatherings."
                  highlights={["Photo Gallery", "Timeline", "RSVP", "Location"]}
                />
              </div>
              <EditorMockup variant="template-selector" />
            </div>

            <TipBox type="tip" title="Wedding Exclusive Sections" className="mt-6">
              The Wedding template includes special sections not available in
              other templates: Our Story, Travel & Stay, Wedding Party, Dress
              Code, and Things To Do. Perfect for giving guests all the
              information they need.
            </TipBox>
          </DocSection>

          {/* Page Editor */}
          <DocSection
            id="editor"
            title="Page Editor"
            description="The page editor is where you customize every aspect of your event page."
          >
            <p className="text-muted-foreground">
              After creating an event, click &quot;Page&quot; from your event dashboard to
              open the editor. Here you can customize themes, manage sections,
              upload media, and more.
            </p>
          </DocSection>

          {/* Theme & Hero */}
          <DocSection
            id="theme"
            title="Theme & Hero Section"
            description="Set your event's visual identity with colors, fonts, and a striking hero image."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <FeatureBox
                  icon="🎨"
                  title="Primary Color"
                  description="Choose a color that represents your event. The editor validates contrast for accessibility."
                />
                <FeatureBox
                  icon="🔤"
                  title="Font Pair"
                  description="Select from three curated font combinations: Modern, Classic, or Serif+Sans."
                />
                <FeatureBox
                  icon="🖼️"
                  title="Hero Image"
                  description="Upload a background image for your hero section. Displayed behind your title and subtitle."
                />
              </div>
              <div className="space-y-4">
                <EditorMockup variant="theme-editor" />
                <EditorMockup variant="hero-section" />
              </div>
            </div>
          </DocSection>

          {/* Media Library */}
          <DocSection
            id="media"
            title="Media Library"
            description="Upload and organize images for your event page."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <WorkflowDiagram
                  steps={["Upload Image", "Select Type", "Add Alt Text", "Use in Section"]}
                  title="Media Upload Flow"
                  className="mb-6"
                />
                <div className="space-y-4">
                  <FeatureBox
                    icon="📤"
                    title="Upload Images"
                    description="Drag and drop or click to upload. Supports JPEG, PNG, and WebP formats."
                    highlights={["Max 5MB each", "Up to 20 images"]}
                  />
                  <FeatureBox
                    icon="🏷️"
                    title="Image Types"
                    description="Categorize images as HERO (for hero section) or GALLERY (for photo galleries)."
                  />
                  <FeatureBox
                    icon="♿"
                    title="Alt Text"
                    description="Add descriptive alt text for accessibility. Required for all images."
                  />
                </div>
              </div>
              <EditorMockup variant="media-library" />
            </div>

            <TipBox type="info" className="mt-6">
              Upload images to the Media Library first, then select them in the
              Hero Section or Gallery Section. This keeps your media organized
              and reusable.
            </TipBox>
          </DocSection>

          {/* Sections */}
          <DocSection
            id="sections"
            title="Managing Sections"
            description="Add, remove, reorder, and configure sections to build your perfect page."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <FeatureBox
                  icon="➕"
                  title="Add Sections"
                  description="Choose from 15+ section types including Schedule, Gallery, FAQ, Map, and more."
                />
                <FeatureBox
                  icon="🔀"
                  title="Reorder Sections"
                  description="Drag sections to rearrange the order they appear on your page."
                />
                <FeatureBox
                  icon="👁️"
                  title="Toggle Visibility"
                  description="Enable or disable sections without deleting them. Disabled sections won't appear on your published page."
                />
                <FeatureBox
                  icon="🗑️"
                  title="Remove Sections"
                  description="Delete sections you no longer need. This action can be undone with version history."
                />
              </div>
              <EditorMockup variant="section-list" />
            </div>
          </DocSection>

          {/* Gallery */}
          <DocSection
            id="gallery"
            title="Gallery Editor"
            description="Create beautiful photo galleries with multiple display modes and storytelling captions."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <h4 className="font-semibold">Display Modes</h4>
                <div className="grid grid-cols-2 gap-3">
                  <FeatureBox
                    icon="▦"
                    title="Grid"
                    description="Classic tile layout"
                  />
                  <FeatureBox
                    icon="◀▶"
                    title="Carousel"
                    description="Swipeable slider"
                  />
                  <FeatureBox
                    icon="▤"
                    title="Masonry"
                    description="Pinterest-style layout"
                  />
                  <FeatureBox
                    icon="▶"
                    title="Slideshow"
                    description="Auto-advancing display"
                  />
                </div>
              </div>
              <EditorMockup variant="gallery-modes" />
            </div>

            <div className="mt-6 space-y-4">
              <h4 className="font-semibold">Storytelling Features</h4>
              <p className="text-muted-foreground">
                Add context to each image with titles, moments, and captions:
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <FeatureBox
                  title="Title"
                  description="Short description of the image"
                />
                <FeatureBox
                  title="Moment"
                  description="Date or occasion (e.g., 'The Proposal')"
                />
                <FeatureBox
                  title="Caption"
                  description="Up to 200 characters for storytelling"
                />
              </div>
            </div>

            <TipBox type="tip" className="mt-6">
              For slideshows and carousels, you can enable auto-play and choose
              transition effects like fade, slide, zoom, or flip.
            </TipBox>
          </DocSection>

          {/* Schedule & RSVP */}
          <DocSection
            id="schedule-rsvp"
            title="Schedule & RSVP"
            description="Help guests know what to expect and collect their responses."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <div>
                  <h4 className="mb-3 font-semibold">Schedule / Timeline</h4>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Create a timeline of your event with times, titles, and
                    optional descriptions.
                  </p>
                  <div className="space-y-2 rounded-lg border bg-card p-4">
                    <div className="flex gap-3">
                      <span className="text-sm font-medium text-primary">3:00 PM</span>
                      <div>
                        <p className="font-medium">Ceremony</p>
                        <p className="text-sm text-muted-foreground">
                          Garden Pavilion
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-sm font-medium text-primary">5:00 PM</span>
                      <div>
                        <p className="font-medium">Reception</p>
                        <p className="text-sm text-muted-foreground">
                          Grand Ballroom
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-sm font-medium text-primary">8:00 PM</span>
                      <div>
                        <p className="font-medium">Dancing</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-3 font-semibold">RSVP Configuration</h4>
                <p className="mb-4 text-sm text-muted-foreground">
                  Customize how guests respond to your invitation.
                </p>
                <div className="space-y-3">
                  <FeatureBox
                    title="Response Options"
                    description="Yes, No, or optionally 'Maybe' for undecided guests"
                  />
                  <FeatureBox
                    title="Plus-Ones"
                    description="Allow guests to bring additional attendees with configurable limits"
                  />
                  <FeatureBox
                    title="Custom Heading"
                    description="Personalize the RSVP section title and description"
                  />
                </div>
              </div>
            </div>
          </DocSection>

          {/* Version History */}
          <DocSection
            id="versions"
            title="Version History"
            description="Never lose your work. Every save creates a version you can preview or restore."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <FeatureBox
                  icon="📋"
                  title="View History"
                  description="See a list of all saved versions with timestamps and who made changes."
                />
                <FeatureBox
                  icon="👀"
                  title="Preview Versions"
                  description="View any previous version without affecting your current work."
                />
                <FeatureBox
                  icon="↩️"
                  title="Rollback"
                  description="Restore a previous version if you need to undo changes."
                />
              </div>
              <div className="rounded-xl border bg-card p-4">
                <h5 className="mb-3 text-sm font-medium text-muted-foreground">
                  Version History
                </h5>
                <div className="space-y-2">
                  {[
                    { time: "Today, 2:30 PM", label: "Current" },
                    { time: "Today, 11:15 AM", label: "" },
                    { time: "Yesterday, 4:45 PM", label: "" },
                  ].map((version, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                    >
                      <span className="text-sm">{version.time}</span>
                      {version.label && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {version.label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <TipBox type="info" className="mt-6">
              When you preview an old version, a banner appears at the top of
              the editor. Click &quot;Rollback&quot; to restore it, or close the preview
              to keep your current version.
            </TipBox>
          </DocSection>

          {/* Publishing */}
          <DocSection
            id="publishing"
            title="Publishing & Sharing"
            description="When your page is ready, publish it and share with your guests."
          >
            <WorkflowDiagram
              steps={["Preview Page", "Click Publish", "Share Link", "Track RSVPs"]}
              title="Publishing Flow"
              className="mb-6"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FeatureBox
                icon="👁️"
                title="Preview Mode"
                description="See exactly how your page will look before publishing. Access from the Page Preview button."
              />
              <FeatureBox
                icon="🌐"
                title="Publish"
                description="Click 'Publish Page' to make your event page live. You can unpublish anytime."
              />
              <FeatureBox
                icon="🔗"
                title="Share Link"
                description="Copy your event's unique URL to share via email, text, or social media."
              />
              <FeatureBox
                icon="📧"
                title="Send Invitations"
                description="Use the Invites section to send personalized email invitations to your guest list."
              />
            </div>

            <TipBox type="tip" className="mt-6">
              You can continue editing after publishing. Changes are saved
              immediately and visitors will see the updated page.
            </TipBox>
          </DocSection>

          {/* Tips & Limits */}
          <DocSection
            id="tips"
            title="Tips & Limits"
            description="Best practices and platform limits to keep in mind."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h4 className="mb-4 font-semibold">Platform Limits</h4>
                <div className="space-y-3">
                  <TipBox type="warning">
                    <strong>Images:</strong> Max 20 images per event, 5MB each.
                    Formats: JPEG, PNG, WebP.
                  </TipBox>
                  <TipBox type="warning">
                    <strong>Schedule:</strong> Up to 20 timeline items per event.
                  </TipBox>
                  <TipBox type="warning">
                    <strong>FAQ:</strong> Up to 10 question-answer pairs.
                  </TipBox>
                  <TipBox type="warning">
                    <strong>Gallery Captions:</strong> 200 characters max per image.
                  </TipBox>
                </div>
              </div>

              <div>
                <h4 className="mb-4 font-semibold">Best Practices</h4>
                <div className="space-y-3">
                  <TipBox type="tip">
                    <strong>Hero Images:</strong> Use high-quality images at least
                    1920px wide for best results.
                  </TipBox>
                  <TipBox type="tip">
                    <strong>Alt Text:</strong> Write descriptive alt text for
                    accessibility and SEO benefits.
                  </TipBox>
                  <TipBox type="tip">
                    <strong>Mobile Preview:</strong> Check how your page looks on
                    mobile before publishing.
                  </TipBox>
                  <TipBox type="tip">
                    <strong>Save Often:</strong> Your work is auto-saved, but
                    clicking Save creates a version you can restore later.
                  </TipBox>
                </div>
              </div>
            </div>
          </DocSection>

          {/* Footer CTA */}
          <div className="mt-16 rounded-2xl bg-muted/50 p-8 text-center">
            <h2 className="text-2xl font-bold">Ready to create your event?</h2>
            <p className="mt-2 text-muted-foreground">
              Start building your event page in minutes.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
              >
                Get Started Free
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg border bg-background px-6 py-3 font-medium hover:bg-muted"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile nav */}
      <DocsNav />
    </div>
  );
}
