export class ObservedElement {
  private resizeObserver: ResizeObserver | undefined;
  public element: HTMLElement | Window;
  public width: number;
  public height: number;

  constructor(element: HTMLElement | Window) {
    this.element = element;

    if (element === window) {
      this.width = 0;
      this.height = 0;
      window.addEventListener('resize', this.onWindowResize);
      this.onWindowResize();
    } else {
      this.width = (this.element as HTMLElement).offsetWidth;
      this.height = (this.element as HTMLElement).offsetHeight;

      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(this.element as HTMLElement);
    }
  }

  destroy() {
    window.removeEventListener('resize', this.onWindowResize);
    this.resizeObserver?.disconnect();
  }

  private onResize = ([entry]: any[]) => {
    if (entry) {
      const { width, height } = entry.contentRect;
      this.width = width;
      this.height = height;
    }
  };

  private onWindowResize = () => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  };
}
