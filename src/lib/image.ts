import { dominantColor } from './color'

const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = rej
    i.src = src
  })

const readFile = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(f)
  })

/** Compresses a photo, extracts its main color and a square "fabric" crop for 3D texturing. */
export async function processClothPhoto(file: File) {
  const src = await readFile(file)
  const img = await loadImg(src)
  const max = 420
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const c = document.createElement('canvas')
  c.width = Math.round(img.naturalWidth * scale)
  c.height = Math.round(img.naturalHeight * scale)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  const photo = c.toDataURL('image/jpeg', 0.78)

  const f = document.createElement('canvas')
  f.width = f.height = 128
  const side = Math.min(img.naturalWidth, img.naturalHeight) * 0.35
  f.getContext('2d')!.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 128, 128)
  const fabric = f.toDataURL('image/jpeg', 0.8)

  return { photo, fabric, color: dominantColor(img) }
}
