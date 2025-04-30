import { createApp } from "vue";
import SolarWidget from "./components/SolarWidget.vue";
import "./style.scss";

class SolarScanner {
  constructor() {
    this.app = null;
    this.initializeWidget();
  }

  initializeWidget() {
    // Check if custom buttons exist
    const customButtons = document.querySelectorAll("[data-solar-scanner]");

    if (customButtons.length > 0) {
      customButtons.forEach((button) => {
        button.addEventListener("click", () => this.open());
      });
    } else {
      this.createDefaultButton();
    }
  }

  createDefaultButton() {
    const button = document.createElement("button");
    button.className = "solar-scanner-default-button";
    button.textContent = "Get Solar Quote";
    button.addEventListener("click", () => this.open());
    document.body.appendChild(button);
  }

  open() {
    if (!this.app) {
      // Create a container div
      const container = document.createElement("div");
      document.body.appendChild(container);

      // Mount Vue app
      this.app = createApp(SolarWidget);
      this.app.mount(container);
    } else {
      // If already created, just show it
      this.app._instance.exposed.open();
    }
  }
}

// Self-initializing when script loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.solarScanner = new SolarScanner();
  });
} else {
  window.solarScanner = new SolarScanner();
}
