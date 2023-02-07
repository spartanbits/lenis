import { clamp, lerp } from './maths'

export type EasingFunction = (t: number) => number

export type OnUpdateCallback = (
  value: number,
  { completed }: { completed: boolean }
) => void

export class Animate {
  private isRunning: boolean
  private lerp: number | null | undefined
  private value: number
  private from: number
  private to: number
  private currentTime: number
  private duration: number
  private easing: EasingFunction
  private onUpdate: OnUpdateCallback | undefined

  constructor() {
    this.isRunning = false
    this.lerp = 0
    this.value = 0
    this.to = 0
    this.from = 0
    this.currentTime = 0
    this.duration = 0
    this.easing = n => n
  }

  advance(deltaTime: number) {
    if (!this.isRunning) return

    let completed = false

    if (this.lerp) {
      this.value = lerp(this.value, this.to, this.lerp)
      if (Math.round(this.value) === this.to) {
        this.value = this.to
        completed = true
      }
    } else {
      this.currentTime += deltaTime
      const linearProgress = clamp(0, this.currentTime / this.duration, 1)

      completed = linearProgress >= 1
      const easedProgress = completed ? 1 : this.easing(linearProgress)
      this.value = this.from + (this.to - this.from) * easedProgress
    }

    this.onUpdate?.(this.value, { completed })

    if (completed) {
      this.stop()
    }
  }

  stop() {
    this.isRunning = false
  }

  fromTo(
    from: number,
    to: number,
    {
      lerp = 0.1,
      duration = 1,
      easing = t => t,
      onUpdate,
    }: {
      lerp?: number | null
      duration?: number
      easing?: EasingFunction
      onUpdate: OnUpdateCallback
    }
  ) {
    this.from = this.value = from
    this.to = to
    this.lerp = lerp
    this.duration = duration
    this.easing = easing
    this.currentTime = 0
    this.isRunning = true

    this.onUpdate = onUpdate
  }
}
