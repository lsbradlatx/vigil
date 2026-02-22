export function ThemeScript() {
  // Runs before React hydration to avoid theme flash.
  const code = `(function(){try{var k="vigil_theme";var t=localStorage.getItem(k)||"system";var r=t==="system"?(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;document.documentElement.dataset.theme=r;}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

