import { createNanoEvents, Emitter } from 'nanoevents';
import { clamp } from './maths';

export type TouchType = {
  x: number | null;
  y: number | null;
};

export type ScrollType = 'touch' | 'wheel';

export type ScrollEvent = {
  type: ScrollType;
  deltaX: number;
  deltaY: number;
  event: Event;
};

export class VirtualScroll {
  private element: HTMLElement | Window;
  private wheelMultiplier: number;
  private touchMultiplier: number;
  private normalizeWheel: boolean;
  private touchStart: TouchType;
  private emitter: Emitter;

  constructor(
    element: HTMLElement | Window,
    { wheelMultiplier = 1, touchMultiplier = 2, normalizeWheel = false }
  ) {
    this.element = element;
    this.wheelMultiplier = wheelMultiplier;
    this.touchMultiplier = touchMultiplier;
    this.normalizeWheel = normalizeWheel;

    this.touchStart = {
      x: null,
      y: null,
    };

    this.emitter = createNanoEvents();

    this.element.addEventListener('wheel', this.onWheel as EventListener, {
      passive: false,
    });
    this.element.addEventListener(
      'touchstart',
      this.onTouchStart as EventListener,
      {
        passive: false,
      }
    );
    this.element.addEventListener(
      'touchmove',
      this.onTouchMove as EventListener,
      {
        passive: false,
      }
    );
  }

  public on(event: string, callback: (args: ScrollEvent) => void) {
    return this.emitter.on(event, callback);
  }

  public destroy() {
    this.emitter.events = {};

    this.element.removeEventListener(
      'wheel',
      this.onWheel as EventListener,
      {
        passive: false,
      } as any
    );
    this.element.removeEventListener(
      'touchstart',
      this.onTouchStart as EventListener,
      {
        passive: false,
      } as any
    );
    this.element.removeEventListener(
      'touchmove',
      this.onTouchMove as EventListener,
      {
        passive: false,
      } as any
    );
  }

  private onTouchStart = (event: TouchEvent) => {
    if (!event.targetTouches) return;
    const { pageX, pageY } = event.targetTouches[0];

    this.touchStart.x = pageX;
    this.touchStart.y = pageY;
  };

  private onTouchMove = (event: TouchEvent) => {
    if (!event.targetTouches) return;
    const { pageX, pageY } = event.targetTouches[0];

    const deltaX = -(pageX - (this.touchStart.x || 0)) * this.touchMultiplier;
    const deltaY = -(pageY - (this.touchStart.y || 0)) * this.touchMultiplier;

    this.touchStart.x = pageX;
    this.touchStart.y = pageY;

    this.emitter.emit('scroll', {
      type: 'touch',
      deltaX,
      deltaY,
      event,
    });
  };

  private onWheel = (event: WheelEvent) => {
    let { deltaX, deltaY } = event;

    if (this.normalizeWheel) {
      deltaX = clamp(-100, deltaX, 100);
      deltaY = clamp(-100, deltaY, 100);
    }

    deltaX *= this.wheelMultiplier;
    deltaY *= this.wheelMultiplier;

    this.emitter.emit('scroll', { type: 'wheel', deltaX, deltaY, event });
  };
}
