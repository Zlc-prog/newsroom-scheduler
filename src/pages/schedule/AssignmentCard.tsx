import { clsx } from 'clsx';
import { Draggable } from '@hello-pangea/dnd';
import type { Assignment } from '../../types/schedule';
import type { Employee } from '../../types/employee';

interface Props {
  assignment: Assignment;
  employee: Employee | undefined;
  index: number;
  readOnly?: boolean;
  onRemove?: (uid: string) => void;
  onToggleLock?: (uid: string) => void;
  onTogglePlanner?: (uid: string) => void;
  onDoubleClick?: (employeeId: number) => void;
}

export function AssignmentCard({
  assignment,
  employee,
  index,
  readOnly,
  onRemove,
  onToggleLock,
  onTogglePlanner,
  onDoubleClick,
}: Props) {
  const a = assignment;
  const isLeader = employee?.is_leader === 1;
  const isFirstReviewer = employee?.is_first_reviewer === 1;
  // Highlight when: (leader + reviewer) always; or (reviewer only) when acting as planner
  const shouldHighlight = isFirstReviewer && (isLeader || a.is_planner === 1);
  const name = employee?.name ?? `员工${a.employee_id}`;

  const textSize = 'text-sm';

  const baseClass = clsx(
    'group relative flex items-center gap-1 rounded border px-1.5 py-1',
    textSize,
    'select-none',
    shouldHighlight
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-gray-200 bg-white text-gray-800',
    a.locked === 1 && 'opacity-90'
  );

  const content = (
    <>
      {isLeader && (
        <span
          title="值班"
          className="rounded bg-rose-600 px-1 text-[11px] font-bold text-white"
        >
          值
        </span>
      )}
      {a.is_planner === 1 && (
        <span
          title="策划"
          className="rounded bg-sky-600 px-1 text-[11px] font-bold text-white"
        >
          策
        </span>
      )}
      <span
        className="truncate cursor-pointer"
        onDoubleClick={(e) => {
          e.stopPropagation();
          onDoubleClick?.(a.employee_id);
        }}
      >
        {name}
      </span>
      {a.locked === 1 && (
        <span title="已锁定" className="text-[11px]">
          🔒
        </span>
      )}

      {!readOnly && (
        <div className="ml-auto hidden gap-0.5 group-hover:flex">
          <IconBtn
            title="策划"
            onClick={() => onTogglePlanner?.(a.uid)}
            active={a.is_planner === 1}
          >
            策
          </IconBtn>
          <IconBtn
            title={a.locked === 1 ? '解锁' : '锁定'}
            onClick={() => onToggleLock?.(a.uid)}
            active={a.locked === 1}
          >
            {a.locked === 1 ? '🔓' : '🔒'}
          </IconBtn>
          {a.locked === 0 && (
            <IconBtn title="删除" onClick={() => onRemove?.(a.uid)} danger>
              ✕
            </IconBtn>
          )}
        </div>
      )}
    </>
  );

  if (readOnly) {
    return <div className={baseClass}>{content}</div>;
  }

  return (
    <Draggable draggableId={a.uid} index={index} isDragDisabled={a.locked === 1}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={clsx(
            baseClass,
            'transition-shadow',
            snapshot.isDragging && 'shadow-lg ring-2 ring-blue-300'
          )}
        >
          {content}
        </div>
      )}
    </Draggable>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  active,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        'flex h-4 w-4 items-center justify-center rounded text-[11px] leading-none',
        active
          ? 'bg-sky-600 text-white'
          : danger
            ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      )}
    >
      {children}
    </button>
  );
}
