// Tema tercihi anahtarı ve ilk boyamadan önce çalışan satır içi betik (FOUC önler).
// Sunucu bileşeni (layout) tarafından da içe aktarıldığı için "use client" içermez.

import { BRAND } from "./brand";

export const THEME_STORAGE_KEY = "akredite-theme";

// www → kanonik adres: kasa açılmadan, ilk boyamadan önce (www ve www'suz adres ayrı kasa sayılır)
export const THEME_BOOT_SCRIPT = `(function(){if(location.hostname==="www.${BRAND.host}"){location.replace("${BRAND.url}"+location.pathname+location.search+location.hash);return;}try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;
