import { useState } from 'react';
import type { Meeting } from '../../types/schedule';

interface Props {
  date: string;
  meetings: Meeting[];
  readOnly?: boolean;
  onAdd?: (date: string, name: string) => void;
  onRename?: (uid: string, name: string) => void;
  onRemove?: (uid: string) => void;
}

export function MeetingCell({
  date,
  meetings,
  readOnly,
  onAdd,
  onRename,
  onRemove,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const submitAdd = () => {
    const name = draft.trim();
    if (name) onAdd?.(date, name);
    setDraft('');
    setAdding(false);
  };

  const submitRename = (uid: string) => {
    const name = editDraft.trim();
    if (name) onRename?.(uid, name);
    setEditingUid(null);
  };

  return (
    <div className="flex min-h-[38px] flex-col gap-0.5 p-1">
      {meetings.map((m) => (
        <div
          key={m.uid}
          className="group flex items-center gap-1 rounded border border-emerald-200 bg-white px-1.5 py-0.5 text-sm leading-tight"
        >
          {!readOnly && editingUid === m.uid ? (
            <input
              autoFocus
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              onBlur={() => submitRename(m.uid)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitRename(m.uid);
                if (e.key === 'Escape') setEditingUid(null);
              }}
              className="h-5 flex-1 rounded border border-emerald-300 px-1 text-sm outline-none"
            />
          ) : readOnly ? (
            <span className="flex-1 truncate text-gray-800">{m.name}</span>
          ) : (
            <button
              type="button"
              className="flex-1 truncate text-left text-gray-800 hover:text-emerald-700"
              onClick={() => {
                setEditingUid(m.uid);
                setEditDraft(m.name);
              }}
              title="点击改名"
            >
              {m.name}
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={() => onRemove?.(m.uid)}
              className="hidden h-4 w-4 items-center justify-center rounded bg-rose-100 text-[11px] text-rose-700 hover:bg-rose-200 group-hover:flex"
              title="删除"
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {!readOnly &&
        (adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={submitAdd}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitAdd();
              if (e.key === 'Escape') {
                setDraft('');
                setAdding(false);
              }
            }}
            placeholder="会议名称"
            className="h-5 rounded border border-emerald-300 px-1 text-sm outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-auto rounded border border-dashed border-gray-300 py-0 text-[11px] leading-4 text-gray-400 transition-colors hover:border-emerald-400 hover:bg-white hover:text-emerald-600"
          >
            + 添加会议
          </button>
        ))}
    </div>
  );
}
