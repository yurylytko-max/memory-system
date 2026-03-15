import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement("canvas")
        const maxWidth = 1200

        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = height * (maxWidth / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        ctx?.drawImage(img, 0, 0, width, height)

        const compressed = canvas.toDataURL("image/jpeg", 0.7)

        resolve(compressed)
      }

      img.src = event.target?.result as string
    }

    reader.readAsDataURL(file)
  })
}