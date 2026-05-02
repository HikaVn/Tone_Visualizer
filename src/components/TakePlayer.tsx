type Props = { audioUrl: string | null };
export default function TakePlayer({ audioUrl }: Props) {
  if (!audioUrl) return <p>音声なし</p>;
  return <audio controls src={audioUrl} playsInline />;
}
