import GuestPortal from './components/GuestPortal';

interface PageProps {
  params: Promise<{ room_id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { room_id } = await params;
  return {
    title: `Room ${room_id} — Buddha Village Resort`,
    description: `Guest portal for Room ${room_id} at Buddha Village Resort`,
  };
}

export default async function RoomPage({ params }: PageProps) {
  const { room_id } = await params;

  return <GuestPortal roomId={room_id} />;
}
