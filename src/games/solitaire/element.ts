// <klondike-solitaire>: registration only. The rules and the renderer load
// with import() the first time the element connects, so the desktop pays
// nothing for Solitaire until its window opens.

interface App { connect(): void; disconnect(): void }

class KlondikeSolitaire extends HTMLElement {
  private app?: App;
  private loading = false;

  connectedCallback() {
    if (this.app) return this.app.connect();
    if (this.loading) return;
    this.loading = true;
    import('./renderer')
      .then((m) => {
        this.app = m.mount(this);
        if (!this.isConnected) this.app.disconnect();
      })
      .catch(() => { this.loading = false; });
  }

  disconnectedCallback() { this.app?.disconnect(); }
}

if (!customElements.get('klondike-solitaire')) customElements.define('klondike-solitaire', KlondikeSolitaire);
