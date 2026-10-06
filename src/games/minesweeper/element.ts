// The only Minesweeper code on the page's initial load: a tiny element that
// imports the game when it is connected. The window manager may move the
// window around the DOM, so a disconnect only pauses the game; the state
// survives a reconnect.

interface Controller {
  connect(): void;
  disconnect(): void;
}

class MineSweeper extends HTMLElement {
  #ctl?: Controller;
  #loading = false;

  connectedCallback() {
    if (this.#ctl) {
      this.#ctl.connect();
      return;
    }
    if (this.#loading) return;
    this.#loading = true;
    import('./game')
      .then((m) => {
        this.#ctl = m.mount(this);
        if (!this.isConnected) this.#ctl.disconnect();
      })
      .catch(() => {
        this.#loading = false;
      });
  }

  disconnectedCallback() {
    this.#ctl?.disconnect();
  }
}

if (!customElements.get('mine-sweeper')) customElements.define('mine-sweeper', MineSweeper);
