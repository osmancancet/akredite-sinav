// Tema tercihi anahtarı ve ilk boyamadan önce çalışan satır içi betik (FOUC önler).
// Sunucu bileşeni (layout) tarafından da içe aktarıldığı için "use client" içermez.

export const THEME_STORAGE_KEY = "akredite-theme";

export const THEME_BOOT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;
