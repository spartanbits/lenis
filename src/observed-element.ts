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

export class ObservedElement {
  private resizeObserver: ResizeObserver | undefined
  public element: HTMLElement | Window
  public width: number
  public height: number

  constructor(element: HTMLElement | Window) {
    this.element = element

    if (element === window) {
      this.width = 0
      this.height = 0
      window.addEventListener('resize', this.onWindowResize)
      this.onWindowResize()
    } else {
      this.width = (this.element as HTMLElement).offsetWidth
      this.height = (this.element as HTMLElement).offsetHeight

      this.resizeObserver = new ResizeObserver(this.onResize)
      this.resizeObserver.observe(this.element as HTMLElement)
    }
  }

  destroy() {
    window.removeEventListener('resize', this.onWindowResize)
    this.resizeObserver?.disconnect()
  }

  private onResize = ([entry]: any[]) => {
    if (entry) {
      const { width, height } = entry.contentRect
      this.width = width
      this.height = height
    }
  }

  private onWindowResize = () => {
    this.width = window.innerWidth
    this.height = window.innerHeight
  }
}
