/**
 * Handing a file to the device.
 *
 * ADR 0004: the file is the only copy of the year that survives this app's
 * storage being cleared, so handing it over has to work on the device the app
 * is actually installed on. A blob-URL `<a download>` does not: in a
 * home-screen web app on iOS, WebKit never downloads it. It shows a full-screen
 * "Open in…" handoff listing whatever apps claim the type, with no way back
 * into the app — the user has to relaunch. See WebKit bug 236943.
 *
 * The OS share sheet is the path that works there, and iOS does accept a file
 * typed `application/json` through it — measured on iOS 18.7, alongside
 * `text/plain` and an untyped file, so no disguise is needed.
 *
 * Hence: share where the device can share, download where it cannot. In
 * practice that means the share sheet on a phone and the download on a desktop
 * browser, and no screen has to know which it got.
 */

function canShare(file: File): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    // Some engines throw rather than answer. Treat that as a no and download.
    return false;
  }
}

function download(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  // Two details that look removable and are not. Some engines ignore a click
  // on an anchor that was never in the document; and the click only *starts*
  // the read, so revoking on the next line can cancel the download before the
  // blob has been read. The element goes straight away, the URL waits.
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Resolves true when the file reached the device, false when the user backed
 * out of the share sheet. A dismissed sheet means nothing left the device, and
 * a caller that reports success there would be telling the user their year is
 * safe somewhere it is not.
 */
export async function handOff(file: File): Promise<boolean> {
  if (!canShare(file)) {
    download(file);
    return true;
  }
  try {
    await navigator.share({ files: [file] });
    return true;
  } catch {
    return false;
  }
}
