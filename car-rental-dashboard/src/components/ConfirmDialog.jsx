import { useState } from 'react'
import Modal from './Modal'
import { Spinner } from './Loading'

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  body,
  confirmLabel = 'Confirm',
  danger,
  onConfirm,
  onCancel,
}) {
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={busy ? undefined : onCancel}
      footer={
        <>
          <button className="btn" onClick={onCancel} disabled={busy}>
            Keep it
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={run} disabled={busy}>
            {busy && <Spinner />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ color: 'var(--muted)', fontSize: '0.92rem' }}>{body}</p>
    </Modal>
  )
}
