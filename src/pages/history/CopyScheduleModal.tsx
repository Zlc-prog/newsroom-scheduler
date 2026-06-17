import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatRange, getWeekStart } from '../../utils/week';

interface Props {
  open: boolean;
  sourceWeekStart: string | null;
  onClose: () => void;
  onConfirm: (target_week_start: string) => Promise<void>;
}

export function CopyScheduleModal({
  open,
  sourceWeekStart,
  onClose,
  onConfirm,
}: Props) {
  const [pickedDate, setPickedDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const next = sourceWeekStart
        ? dayjs(sourceWeekStart).add(1, 'week').format('YYYY-MM-DD')
        : dayjs().format('YYYY-MM-DD');
      setPickedDate(next);
      setError(null);
    }
  }, [open, sourceWeekStart]);

  const targetWeek = pickedDate ? getWeekStart(pickedDate) : '';

  const handleConfirm = async () => {
    if (!targetWeek) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(targetWeek);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="复制排班到目标周"
      onClose={onClose}
      width={460}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || !targetWeek}>
            {submitting ? '复制中…' : '复制'}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
          源周：
          <span className="ml-1 font-mono text-gray-800">
            {sourceWeekStart ? formatRange(sourceWeekStart) : '-'}
          </span>
        </div>
        <Input
          label="目标日期（任选周内任一天，自动归到周一）"
          type="date"
          value={pickedDate}
          onChange={(e) => setPickedDate(e.target.value)}
        />
        {targetWeek && (
          <div className="text-xs text-gray-500">
            将复制到：
            <span className="ml-1 font-mono text-gray-800">
              {formatRange(targetWeek)}
            </span>
          </div>
        )}
        <div className="text-[11px] text-amber-600">
          注意：若目标周已存在排班，将被覆盖。
        </div>
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
