/** Copies text, falling back to a hidden textarea when the async clipboard is refused. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    // Inside an open modal dialog only the dialog is focusable, so attach it there.
    (document.querySelector("dialog[open]") ?? document.body).append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}
