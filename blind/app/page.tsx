import CameraFeed from '@/app/components/CameraFeed';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-black">
      <div className="w-full max-w-md mt-4">
        <CameraFeed />
      </div>
    </main>
  );
}
