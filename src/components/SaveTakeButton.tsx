type Props = { disabled?: boolean; onSave: () => void };
export default function SaveTakeButton({ disabled, onSave }: Props) {
  return <button type="button" className="record-button" disabled={disabled} onClick={onSave}>Save Take</button>;
}
