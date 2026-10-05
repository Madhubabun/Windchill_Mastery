/** Renders pre-compiled lesson markdown (trusted: built from repository content). */
export function Html({ html, inline = false, className = "" }: { html: string; inline?: boolean; className?: string }) {
  if (inline) return <span className={`prose-wm ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
  return <div className={`prose-wm ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
