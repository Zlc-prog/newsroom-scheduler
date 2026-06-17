interface Props {
  value: string;
  onChange: (next: string) => void;
}

export function ScheduleNotice({ value, onChange }: Props) {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2">
      <span className="shrink-0 text-sm font-medium text-amber-700">提示</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent text-sm text-amber-900 outline-none placeholder:text-amber-300"
        placeholder="请按时参加汇报会，做好OA交接"
      />
    </div>
  );
}
