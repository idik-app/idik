export class FileWatcherClient {
  interval: any = null;

  start(callback: (changes: any) => void) {
    console.log("📡 FileWatcher client-mode aktif");

    this.interval = setInterval(() => {
      callback({
        status: "ok",
        timestamp: Date.now(),
      });
    }, 30000); // setiap 30 detik
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }
}
