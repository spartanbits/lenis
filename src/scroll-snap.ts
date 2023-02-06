import Lenis from '.';

export class ScrollSnap {
  private lenis: Lenis;
  private elements: HTMLElement[] = [];

  constructor(lenis: Lenis) {
    this.lenis = lenis;
    this.init();

    lenis.on('scroll', this.onScroll);
  }

  private init() {
    this.elements = Array.from(
      document.querySelectorAll('[data-lenis-scroll-snap-align]')
    );
  }

  private onScroll = ({
    scroll,
    velocity,
  }: {
    scroll: number;
    velocity: number;
  }) => {
    if (Math.abs(velocity) > 0.1) return;

    // find the closest element according to the scroll position
    const elements = this.elements
      .map(element => {
        const rect = element.getBoundingClientRect();
        const top = rect.top + scroll;
        // const bottom = rect.bottom + scroll
        // const center = top + rect.height / 2
        const distance = Math.abs(top - scroll);
        // const distance = top - scroll
        return { element, distance, rect };
      })
      //   .filter((element) => element.distance > 0)
      .sort((a, b) => a.distance - b.distance)
      .filter(element => element.distance < window.innerHeight);

    const element = elements?.[0];
    if (!element) return;
    this.lenis.scrollTo(element.element);

    console.log(elements[0]);
  };
}
