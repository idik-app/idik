"use client";

/**
 * FileWatcher — pantau perubahan file (stub untuk Kernel)
 */
export class FileWatcher {
  private watching = false;

  startWatching() {
    this.watching = true;
  }

  stopWatching() {
    this.watching = false;
  }
}
