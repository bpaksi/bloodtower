import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { DialogFrame } from "./DialogFrame";

/**
 * The in-game waiting dialog (visuals step 9; R3-UI-10 layer 3, R3-UI-30): a text-only play moment
 * shows as a small centred dialog over the landing painting, with the prompt band inside it.
 *
 * The frame keeps the DEC-705 border (DialogFrame measures it). A long moment starts compact and
 * grows to the default size only when the text is actually cut. It never scrolls.
 * `children` is the prompt band.
 */
export function WaitingDialog({ text, children }: { text: string; children: ReactNode }) {
  const [grown, setGrown] = useState(false);
  const [pass, setPass] = useState(0);
  const textRef = useRef<HTMLParagraphElement>(null);

  // A new screen size or a late font changes the line breaks: measure again from compact.
  useEffect(() => {
    const again = () => setPass((n) => n + 1);
    window.addEventListener("resize", again);
    void document.fonts?.ready.then(again);
    return () => window.removeEventListener("resize", again);
  }, []);

  // Start every measurement from compact, then grow once if the text is cut at that size.
  // biome-ignore lint/correctness/useExhaustiveDependencies: text and pass are the triggers
  useLayoutEffect(() => setGrown(false), [text, pass]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: text and pass are the triggers
  useLayoutEffect(() => {
    // The moment text and the prompt both keep their lines at the compact width, or the frame grows.
    const frame = textRef.current?.closest("[data-waiting-dialog]");
    const cut = [textRef.current, frame?.querySelector<HTMLElement>("[data-next-band] b")].some(
      (el) => el != null && el.scrollHeight > el.clientHeight + 4,
    );
    if (!grown && cut) setGrown(true);
  }, [text, pass, grown]);

  return (
    <DialogFrame
      size={grown ? "default" : "compact"}
      className="bt-ink-in bt-wait"
      data-waiting-dialog=""
      role="status"
    >
      <p className="bt-wait-text" data-moment-caption="" ref={textRef}>
        {text}
      </p>
      {children}
    </DialogFrame>
  );
}
