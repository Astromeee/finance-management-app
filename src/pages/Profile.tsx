import { ArrowLeft, Camera, Trash2 } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { InstallAppButton } from '../components/pwa/InstallAppButton'
import { getProfile, initialsOf, setProfile } from '../lib/profile'

/**
 * Profile — edit display name + avatar photo.
 * Reached from the Dashboard avatar menu. The photo is centre-cropped,
 * downscaled to 256px, and stored as a data URL alongside the name.
 */

export function ProfilePage({ onBack }: { onBack: () => void }) {
  const initial = getProfile()
  const [name, setName] = useState(initial.name)
  const [avatar, setAvatar] = useState<string | undefined>(initial.avatar)
  const [notice, setNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const onPickPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        const size = 256
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const context = canvas.getContext('2d')
        if (!context) return
        const side = Math.min(image.width, image.height)
        context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, size, size)
        setAvatar(canvas.toDataURL('image/jpeg', 0.85))
      }
      image.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  const save = () => {
    setProfile({ name: name.trim() || 'Pocket Ledger user', avatar })
    setNotice('Profile saved.')
    window.setTimeout(() => setNotice(''), 2200)
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <button className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--muted)]" onClick={onBack}>
        <ArrowLeft size={17} /> Back
      </button>

      {notice && (
        <div className="rounded-2xl border border-[rgba(246,105,36,.25)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">{notice}</div>
      )}

      {/* ---- Photo ---- */}
      <section className="card p-6">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-[var(--accent)] text-3xl font-extrabold text-[#16130F]">
              {avatar ? <img alt="Profile" className="h-full w-full object-cover" src={avatar} /> : initialsOf(name)}
            </div>
            <button
              aria-label="Change photo"
              className="absolute -bottom-1 -right-1 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-[var(--surface-2)] text-[var(--accent)] shadow-lg"
              onClick={() => fileRef.current?.click()}
            >
              <Camera size={17} />
            </button>
          </div>
          <p className="mt-4 text-sm text-[var(--muted)]">This photo shows in the Home header.</p>
          {avatar && (
            <button className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-[13px] font-semibold text-[var(--negative)]" onClick={() => setAvatar(undefined)}>
              <Trash2 size={14} /> Remove photo
            </button>
          )}
          <input ref={fileRef} accept="image/*" className="hidden" type="file" onChange={onPickPhoto} />
        </div>
      </section>

      {/* ---- Name ---- */}
      <section className="card p-5">
        <label>
          <span className="form-label">Display name</span>
          <input className="form-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
        </label>
        <p className="mt-2 text-xs text-[var(--muted-2)]">The Home greeting uses your first name.</p>
        <button className="btn-primary mt-4 w-full justify-center" onClick={save}>Save profile</button>
      </section>

      {/* ---- App ---- */}
      <section className="card flex items-center justify-between gap-4 p-5">
        <div>
          <h3 className="text-[15px] font-semibold text-white">Install Pocket Ledger</h3>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">Add the app to your home screen.</p>
        </div>
        <InstallAppButton />
      </section>
    </div>
  )
}
