import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  native: false,
  writeFile: vi.fn(),
  share: vi.fn(),
}))
vi.mock('./platform', () => ({ get isNativeApp() { return mocks.native } }))
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: mocks.writeFile },
  Directory: { Cache: 'CACHE' }, Encoding: { UTF8: 'utf8' },
}))
vi.mock('@capacitor/share', () => ({ Share: { share: mocks.share } }))
import { exportTransactionsCsv } from './exports'

describe('transaction exports across platforms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.native = false
    mocks.writeFile.mockResolvedValue({ uri: 'file:///cache/exports/ledger.csv' })
    mocks.share.mockResolvedValue({})
  })

  it('keeps browser downloads in the web app', async () => {
    const createObjectURL = vi.fn(() => 'blob:ledger')
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await exportTransactionsCsv([])
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(click).toHaveBeenCalledOnce()
    expect(mocks.writeFile).not.toHaveBeenCalled()
    click.mockRestore()
  })

  it('writes a private cache file and shares its URI on Android', async () => {
    mocks.native = true
    await exportTransactionsCsv([])
    expect(mocks.writeFile).toHaveBeenCalledWith(expect.objectContaining({
      directory: 'CACHE', encoding: 'utf8',
      path: expect.stringMatching(/^exports\/pocket-ledger-transactions-.*\.csv$/),
      data: '"date","title","type","category","account","amount","notes"',
    }))
    expect(mocks.share).toHaveBeenCalledWith(expect.objectContaining({ files: ['file:///cache/exports/ledger.csv'] }))
  })

  it('reports native write failures to the calling screen', async () => {
    mocks.native = true
    mocks.writeFile.mockRejectedValueOnce(new Error('Storage unavailable'))
    await expect(exportTransactionsCsv([])).rejects.toThrow('Storage unavailable')
    expect(mocks.share).not.toHaveBeenCalled()
  })
})
