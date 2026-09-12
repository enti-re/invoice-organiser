// Two earlier approaches were dropped: a hover tooltip (moving toward it
// broke the hover state it depended on) and a centered modal (too much
// ceremony, and it dims the document being compared against).
export function FlagIcon({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Needs review"
      className="inline-flex cursor-pointer items-center rounded-full border border-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-red-400 transition-colors hover:border-red-400 hover:bg-red-500/20 hover:text-red-300"
    >
      ⚠
    </button>
  );
}

function EditRow({
  value,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave();
          if (e.key === "Escape") onCancel();
        }}
        className="min-w-0 flex-1 border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm font-mono text-neutral-100 focus:outline-none focus:border-white"
      />
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="shrink-0 cursor-pointer bg-white px-2 py-1 text-xs font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 cursor-pointer text-xs text-neutral-400 hover:text-white"
      >
        Cancel
      </button>
    </div>
  );
}

export function InlineReviewPanel({
  reason,
  editable,
  editing,
  editValue,
  onEditChange,
  onConfirm,
  onStartEdit,
  onSave,
  onCancelEdit,
  onClose,
  saving,
  error,
  align = "left",
}: {
  reason?: string;
  editable: boolean;
  editing: boolean;
  editValue: string;
  onEditChange: (v: string) => void;
  onConfirm: () => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onClose: () => void;
  saving: boolean;
  error: string | null;
  align?: "left" | "right";
}) {
  const sideClass = align === "right" ? "right-0" : "left-0";
  return (
    <div
      className={`absolute top-full z-20 mt-1.5 w-72 max-w-[90vw] border border-neutral-700 bg-neutral-950 p-3 text-left text-sm shadow-lg ${editing ? "" : "pr-7"} ${sideClass}`}
    >
      {!editing && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-1.5 top-1.5 cursor-pointer text-neutral-500 hover:text-white"
        >
          ✕
        </button>
      )}
      {editing ? (
        <EditRow
          value={editValue}
          onChange={onEditChange}
          onSave={onSave}
          onCancel={onCancelEdit}
          saving={saving}
        />
      ) : (
        <>
          {reason && <p className="text-xs text-red-400">⚠ {reason}</p>}
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={saving}
              className="cursor-pointer border border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-100 hover:border-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Saving…" : "Confirm"}
            </button>
            {editable && (
              <button
                type="button"
                onClick={onStartEdit}
                className="cursor-pointer bg-white px-3 py-1 text-xs font-medium text-black"
              >
                Edit
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
