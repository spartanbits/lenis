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

import { Lenis } from './lenis'

export class ScrollSnap {
  private lenis: Lenis
  private elements: HTMLElement[] = []

  constructor(lenis: Lenis) {
    this.lenis = lenis
    this.init()

    lenis.on('scroll', this.onScroll)
  }

  private init() {
    this.elements = Array.from(
      document.querySelectorAll('[data-lenis-scroll-snap-align]')
    )
  }

  private onScroll = ({
    scroll,
    velocity,
  }: {
    scroll: number
    velocity: number
  }) => {
    if (Math.abs(velocity) > 0.1) return

    // find the closest element according to the scroll position
    const elements = this.elements
      .map(element => {
        const rect = element.getBoundingClientRect()
        const top = rect.top + scroll
        // const bottom = rect.bottom + scroll
        // const center = top + rect.height / 2
        const distance = Math.abs(top - scroll)
        // const distance = top - scroll
        return { element, distance, rect }
      })
      //   .filter((element) => element.distance > 0)
      .sort((a, b) => a.distance - b.distance)
      .filter(element => element.distance < window.innerHeight)

    const element = elements?.[0]
    if (!element) return
    this.lenis.scrollTo(element.element)

    console.log(elements[0])
  }
}
