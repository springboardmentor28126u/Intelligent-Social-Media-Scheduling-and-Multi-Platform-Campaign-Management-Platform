// src/app/(auth)/layout.tsx
//
// Any folder wrapped in parentheses, like "(auth)", is a Next.js "route group" —
// it lets us share ONE layout across multiple pages (login, register) WITHOUT
// that "(auth)" text showing up in the URL.

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">SocialPilot</h1>
          <p className="text-sm text-gray-500 mt-1">
            Schedule. Publish. Track. All in one place.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}