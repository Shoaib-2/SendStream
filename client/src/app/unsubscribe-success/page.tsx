// src/app/unsubscribe-success/page.tsx

export default function UnsubscribeSuccessPage({
}: {
  searchParams: { token: string }
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
        <h1 className="text-2xl font-bold text-green-600 mb-4">Successfully Unsubscribed</h1>
        <p className="text-gray-700 mb-6">
          You have been unsubscribed from our newsletter.
        </p>
        <a 
          href="/" 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          Return to Homepage
        </a>
      </div>
    </div>
  );
}