(function () {
  "use strict";

  class TouchJoystick {
    constructor(root, knob) {
      this.root = root;
      this.knob = knob;
      this.vector = { x: 0, y: 0 };
      this.activePointerId = null;
      this.radius = 1;
      this.center = { x: 0, y: 0 };

      this.refreshBounds();
      this.bind();
      window.addEventListener("resize", () => this.refreshBounds(), { passive: true });
    }

    bind() {
      this.root.addEventListener("pointerdown", (event) => this.onPointerDown(event));
      this.root.addEventListener("pointermove", (event) => this.onPointerMove(event));
      this.root.addEventListener("pointerup", (event) => this.onPointerUp(event));
      this.root.addEventListener("pointercancel", (event) => this.onPointerUp(event));
      this.root.addEventListener("lostpointercapture", (event) => this.onPointerUp(event));
    }

    refreshBounds() {
      const rect = this.root.getBoundingClientRect();
      this.radius = Math.max(1, rect.width / 2);
      this.center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }

    onPointerDown(event) {
      this.activePointerId = event.pointerId;
      this.root.setPointerCapture(event.pointerId);
      this.onPointerMove(event);
    }

    onPointerMove(event) {
      if (this.activePointerId !== event.pointerId) return;
      event.preventDefault();

      const dx = event.clientX - this.center.x;
      const dy = event.clientY - this.center.y;
      const distance = Math.hypot(dx, dy);
      const clampedDistance = Math.min(distance, this.radius);
      const angle = Math.atan2(dy, dx);
      const knobX = Math.cos(angle) * clampedDistance;
      const knobY = Math.sin(angle) * clampedDistance;

      this.vector = {
        x: knobX / this.radius,
        y: knobY / this.radius
      };
      this.knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
    }

    onPointerUp(event) {
      if (this.activePointerId !== event.pointerId) return;
      this.activePointerId = null;
      this.vector = { x: 0, y: 0 };
      this.knob.style.transform = "translate(-50%, -50%)";
    }

    read() {
      return { x: this.vector.x, y: this.vector.y };
    }
  }

  window.MuseumControls = { TouchJoystick };
})();
