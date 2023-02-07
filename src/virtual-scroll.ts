/**
MIT License

Copyright (c) 2023 Studio Freight

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

https://github.com/studio-freight/lenis
**/

import { createNanoEvents, Emitter } from 'nanoevents'
import { clamp } from './maths'

export type TouchType = {
  x: number | null
  y: number | null
}

export type ScrollType = 'touch' | 'wheel'

export type ScrollEvent = {
  type: ScrollType
  deltaX: number
  deltaY: number
  event: Event
}

export class VirtualScroll {
  private element: HTMLElement | Window
  private wheelMultiplier: number
  private touchMultiplier: number
  private normalizeWheel: boolean
  private touchStart: TouchType
  private emitter: Emitter

  constructor(
    element: HTMLElement | Window,
    { wheelMultiplier = 1, touchMultiplier = 2, normalizeWheel = false }
  ) {
    this.element = element
    this.wheelMultiplier = wheelMultiplier
    this.touchMultiplier = touchMultiplier
    this.normalizeWheel = normalizeWheel

    this.touchStart = {
      x: null,
      y: null,
    }

    this.emitter = createNanoEvents()

    this.element.addEventListener('wheel', this.onWheel as EventListener, {
      passive: false,
    })
    this.element.addEventListener(
      'touchstart',
      this.onTouchStart as EventListener,
      {
        passive: false,
      }
    )
    this.element.addEventListener(
      'touchmove',
      this.onTouchMove as EventListener,
      {
        passive: false,
      }
    )
  }

  public on(event: string, callback: (args: ScrollEvent) => void) {
    return this.emitter.on(event, callback)
  }

  public destroy() {
    this.emitter.events = {}

    this.element.removeEventListener(
      'wheel',
      this.onWheel as EventListener,
      {
        passive: false,
      } as any
    )
    this.element.removeEventListener(
      'touchstart',
      this.onTouchStart as EventListener,
      {
        passive: false,
      } as any
    )
    this.element.removeEventListener(
      'touchmove',
      this.onTouchMove as EventListener,
      {
        passive: false,
      } as any
    )
  }

  private onTouchStart = (event: TouchEvent) => {
    const { pageX, pageY } = event.targetTouches
      ? event.targetTouches[0]
      : (event as any)

    this.touchStart.x = pageX
    this.touchStart.y = pageY
  }

  private onTouchMove = (event: TouchEvent) => {
    const { pageX, pageY } = event.targetTouches
      ? event.targetTouches[0]
      : (event as any)

    const deltaX = -(pageX - (this.touchStart.x || 0)) * this.touchMultiplier
    const deltaY = -(pageY - (this.touchStart.y || 0)) * this.touchMultiplier

    this.touchStart.x = pageX
    this.touchStart.y = pageY

    this.emitter.emit('scroll', {
      type: 'touch',
      deltaX,
      deltaY,
      event,
    })
  }

  private onWheel = (event: WheelEvent) => {
    let { deltaX, deltaY } = event

    if (this.normalizeWheel) {
      deltaX = clamp(-100, deltaX, 100)
      deltaY = clamp(-100, deltaY, 100)
    }

    deltaX *= this.wheelMultiplier
    deltaY *= this.wheelMultiplier

    this.emitter.emit('scroll', { type: 'wheel', deltaX, deltaY, event })
  }
}
