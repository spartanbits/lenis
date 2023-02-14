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
import { Animate, EasingFunction } from './animate'
import { clamp, clampedModulo } from './maths'
import { ObservedElement } from './observed-element'
import { ScrollEvent, VirtualScroll } from './virtual-scroll.js'

// Technical explaination
// - listen to 'wheel' events
// - prevent event to prevent scroll
// - normalize wheel delta
// - add delta to targetScroll
// - animate scroll to targetScroll (smooth context)
// - if animation is not running, listen to 'scroll' events (native context)

type Orientation = 'vertical' | 'horizontal'
type GestureOrientation = 'vertical' | 'horizontal' | 'both'
type ScrollToOptions = {
  offset?: number
  immediate?: boolean
  lock?: boolean
  duration?: number
  easing?: EasingFunction
  lerp?: number | null
  onComplete?: () => void
  force?: boolean // scroll even if stopped
  programmatic?: boolean // called from outside of the class
}

type LenisOptions = {
  wrapper?: Window | HTMLElement
  content?: HTMLElement
  smoothWheel?: boolean
  smoothTouch?: boolean
  duration?: number
  easing?: EasingFunction
  lerp?: number | null
  infinite?: boolean
  orientation?: Orientation
  gestureOrientation?: GestureOrientation
  touchMultiplier?: number
  wheelMultiplier?: number
  normalizeWheel?: boolean
}

export type ScrollState = {
  scroll: number
  progress: number
  velocity: number
  limit: number
}

export type UnsubscribeListener = () => void

export type ScrollStateCallback = (state: ScrollState) => void

class Lenis {
  // isScrolling = true when scroll is animating
  // isStopped = true if user should not be able to scroll - enable/disable programatically
  // isSmooth = true if scroll should be animated
  // isLocked = same as isStopped but enabled/disabled when scroll reaches target

  private options: LenisOptions
  private wrapper: ObservedElement
  private content: ObservedElement
  private targetScroll: number
  private animatedScroll: number
  private animate: Animate
  private velocity: number
  private emitter: Emitter
  private virtualScroll: VirtualScroll
  private isLocked: boolean
  private time: number
  private scrollState: ScrollState
  private __isSmooth: boolean
  private __isScrolling: boolean
  private __isStopped: boolean

  constructor({
    wrapper = window,
    content = document.documentElement,
    smoothWheel = true,
    smoothTouch = false,
    duration, // in seconds
    easing = t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    lerp = duration ? null : 0.1,
    infinite = false,
    orientation = 'vertical', // vertical, horizontal
    gestureOrientation = 'vertical', // vertical, horizontal, both
    touchMultiplier = 2,
    wheelMultiplier = 1,
    normalizeWheel = true,
  }: LenisOptions = {}) {
    // if wrapper is html or body, fallback to window
    if (wrapper === document.documentElement || wrapper === document.body) {
      wrapper = window
    }

    this.options = {
      wrapper,
      content,
      smoothWheel,
      smoothTouch,
      duration,
      easing,
      lerp,
      infinite,
      gestureOrientation,
      orientation,
      touchMultiplier,
      wheelMultiplier,
      normalizeWheel,
    }

    this.wrapper = new ObservedElement(wrapper)
    this.content = new ObservedElement(content)
    this.rootElement.classList.add('lenis')

    this.isStopped = false
    this.isSmooth = smoothWheel || smoothTouch
    this.isScrolling = false
    this.targetScroll = this.animatedScroll = this.actualScroll
    this.animate = new Animate()
    this.emitter = createNanoEvents()
    this.isLocked = false
    this.time = 0
    this.velocity = 0
    this.scrollState = {
      scroll: 0,
      progress: 0,
      limit: 0,
      velocity: 0,
    }
    this.__isScrolling = false
    this.__isSmooth = this.isSmooth
    this.__isStopped = false

    this.wrapper.element.addEventListener('scroll', this.onScroll, {
      passive: false,
    })

    this.virtualScroll = new VirtualScroll(wrapper, {
      touchMultiplier,
      wheelMultiplier,
      normalizeWheel,
    })
    this.virtualScroll.on('scroll', this.onVirtualScroll)
  }

  public destroy() {
    this.emitter.events = {}

    this.wrapper.element.removeEventListener('scroll', this.onScroll, {
      passive: false,
    } as any)

    this.virtualScroll.destroy()
  }

  public addScrollStateListener = (
    callback: ScrollStateCallback
  ): UnsubscribeListener => {
    return this.on('scroll', callback)
  }

  public removeScrollStateListener = (callback: ScrollStateCallback) => {
    this.off('scroll', callback)
  }

  private on(event: string, callback: (...args: any) => void) {
    return this.emitter.on(event, callback)
  }

  private off(event: string, callback: (...args: any) => void) {
    this.emitter.events[event] = this.emitter.events[event]?.filter(
      i => callback !== i
    )
  }

  setScroll(scroll: number) {
    // apply scroll value immediately
    if (this.isHorizontal) {
      this.rootElement.scrollLeft = scroll
    } else {
      this.rootElement.scrollTop = scroll
    }
  }

  onVirtualScroll = ({ type, deltaX, deltaY, event }: ScrollEvent) => {
    // keep zoom feature
    if ((event as TouchEvent) && (event as TouchEvent).ctrlKey) return

    // keep previous/next page gesture on trackpads
    if (
      (this.options.gestureOrientation === 'vertical' && deltaY === 0) ||
      (this.options.gestureOrientation === 'horizontal' && deltaX === 0)
    )
      return

    // catch if scrolling on nested scroll elements
    if (
      !!event
        .composedPath()
        .find(
          node =>
            (node as HTMLElement) &&
            (node as HTMLElement)?.hasAttribute?.('data-lenis-prevent')
        )
    )
      return

    if (this.isStopped || this.isLocked) {
      event.preventDefault()
      return
    }

    this.isSmooth =
      (this.options.smoothTouch && type === 'touch') ||
      (this.options.smoothWheel && type === 'wheel') ||
      false

    if (!this.isSmooth) {
      this.isScrolling = false
      this.animate.stop()
      return
    }

    event.preventDefault()

    let delta = deltaY
    if (this.options.gestureOrientation === 'both') {
      delta = deltaX + deltaY
    } else if (this.options.gestureOrientation === 'horizontal') {
      delta = deltaX
    }

    this.scrollTo(this.targetScroll + delta, { programmatic: false })
  }

  emit = () => {
    this.updateScrollState()
    this.emitter.emit('scroll', this.scrollState)
  }

  private updateScrollState = () => {
    this.scrollState.progress = this.progress
    this.scrollState.velocity = this.velocity
    this.scrollState.scroll = this.scroll
    this.scrollState.limit = this.limit
  }

  private resetScrollState = () => {
    this.scrollState.progress = 0
    this.scrollState.velocity = 0
    this.scrollState.scroll = 0
    this.scrollState.limit = 0
  }

  onScroll = () => {
    if (!this.isScrolling) {
      this.animatedScroll = this.targetScroll = this.actualScroll
      this.velocity = 0
      this.emit()
    }
  }

  reset = () => {
    this.isLocked = false
    this.isScrolling = false
    this.velocity = 0
    this.resetScrollState()
  }

  start = () => {
    this.isStopped = false

    this.reset()
  }

  stop = () => {
    this.isStopped = true
    this.animate.stop()

    this.reset()
  }

  raf = (time: number) => {
    const deltaTime = time - (this.time || time)
    this.time = time

    this.animate.advance(deltaTime * 0.001)
  }

  scrollTo = (
    target: number | string | HTMLElement,
    {
      offset = 0,
      immediate = false,
      lock = false,
      duration = this.options.duration,
      easing = this.options.easing,
      lerp = !duration ? this.options.lerp : null,
      onComplete,
      force = false, // scroll even if stopped
      programmatic = true, // called from outside of the class
    }: ScrollToOptions = {}
  ) => {
    if (this.isStopped && !force) return

    // keywords
    if (
      typeof target === 'string' &&
      ['top', 'left', 'start'].includes(target)
    ) {
      target = 0
    } else if (
      typeof target === 'string' &&
      ['bottom', 'right', 'end'].includes(target)
    ) {
      target = this.limit
    } else if (typeof target !== 'number') {
      let node: HTMLElement | null = null

      if (typeof target === 'string') {
        // CSS selector
        node = document.querySelector(target)
      } else if ((target as HTMLElement) && (target as HTMLElement)?.nodeType) {
        // Node element
        node = target as HTMLElement
      }

      if (node) {
        if (this.wrapper.element !== window) {
          // nested scroll offset correction
          const wrapperRect = (this.wrapper
            .element as HTMLElement).getBoundingClientRect()
          offset -= this.isHorizontal ? wrapperRect.left : wrapperRect.top
        }

        const rect = node.getBoundingClientRect()

        target =
          (this.isHorizontal ? rect.left : rect.top) + this.animatedScroll
      }
    }

    if (typeof target !== 'number') return

    target += offset
    target = Math.round(target)

    if (this.options.infinite) {
      if (programmatic) {
        this.targetScroll = this.animatedScroll = this.scroll
      }
    } else {
      target = clamp(0, target, this.limit)
    }

    if (immediate) {
      this.animatedScroll = this.targetScroll = target
      this.setScroll(this.scroll)
      this.animate.stop()
      this.reset()
      this.emit()
      onComplete?.()
      return
    }

    if (!programmatic) {
      this.targetScroll = target
    }

    this.animate.fromTo(this.animatedScroll, target, {
      duration,
      easing,
      lerp,
      onUpdate: (value, { completed }) => {
        // started
        if (lock) this.isLocked = true
        this.isScrolling = true
        this.velocity = value - this.animatedScroll

        // updated
        this.animatedScroll = value
        this.setScroll(this.scroll)

        if (programmatic) {
          // wheel during programmatic should stop it
          this.targetScroll = value
        }

        // completed
        if (completed) {
          if (lock) this.isLocked = false
          requestAnimationFrame(() => {
            //avoid double scroll event
            this.isScrolling = false
          })
          this.velocity = 0
          onComplete?.()
        }

        this.emit()
      },
    })
  }

  get rootElement(): HTMLElement {
    return this.wrapper.element === window
      ? (this.content.element as HTMLElement)
      : (this.wrapper.element as HTMLElement)
  }

  get limit() {
    return Math.round(
      this.isHorizontal
        ? this.content.width - this.wrapper.width
        : this.content.height - this.wrapper.height
    )
  }

  get isHorizontal() {
    return this.options.orientation === 'horizontal'
  }

  get actualScroll() {
    // value browser takes into account
    return this.isHorizontal
      ? this.rootElement.scrollLeft
      : this.rootElement.scrollTop
  }

  get scroll() {
    return this.options.infinite
      ? clampedModulo(this.animatedScroll, this.limit)
      : this.animatedScroll
  }

  get progress() {
    return this.scroll / this.limit
  }

  get isSmooth() {
    return this.__isSmooth
  }

  set isSmooth(value) {
    if (this.__isSmooth !== value) {
      this.rootElement.classList.toggle('lenis-smooth', value)
      this.__isSmooth = value
    }
  }

  get isScrolling() {
    return this.__isScrolling
  }

  set isScrolling(value) {
    if (this.__isScrolling !== value) {
      this.rootElement.classList.toggle('lenis-scrolling', value)
      this.__isScrolling = value
    }
  }

  get isStopped() {
    return this.__isStopped
  }

  set isStopped(value) {
    if (this.__isStopped !== value) {
      this.rootElement.classList.toggle('lenis-stopped', value)
      this.__isStopped = value
    }
  }
}

export { Lenis }
