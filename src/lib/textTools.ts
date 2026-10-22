/** Bologna bilgi paketinden yapıştırılan metni satır satır ÖÇ listesine ayıklar. */
export function parseOutcomeLines(text: string): string[] {
  return text
    .split(/\r?\n|(?=\s(?:ÖÇ|OÇ|LO)\s*-?\s*\d+\s*[:.)-])/)
    .map((l) => l.trim())
    .map((l) =>
      l
        .replace(/^(?:öğrenme\s+çıktısı|ogrenme\s+ciktisi|learning\s+outcome)\s*\d*\s*[:.)-]?\s*/i, "")
        .replace(/^(?:ÖÇ|OÇ|ÖK|LO|DÖÇ)\s*-?\s*\d+\s*[:.)-]?\s*/i, "")
        .replace(/^\(?\d{1,2}\s*[.)-]\s*/, "")
        .replace(/^[•●▪■◦\-–*]\s*/, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((l) => l.length > 6 && !/^(öğrenme çıktıları|dersin öğrenme çıktıları|bu dersi başarıyla)/i.test(l));
}

const LATEX_MAP: [RegExp, string][] = [
  [/\\left(?![a-zA-Z])|\\right(?![a-zA-Z])/g, ""],
  [/\\rightarrow|\\to/g, "→"],
  [/\\leftarrow/g, "←"],
  [/\\Rightarrow/g, "⇒"],
  [/\\Leftrightarrow|\\iff/g, "⇔"],
  [/\\leq|\\le/g, "≤"],
  [/\\geq|\\ge/g, "≥"],
  [/\\neq|\\ne/g, "≠"],
  [/\\times/g, "×"],
  [/\\cdot/g, "·"],
  [/\\div/g, "÷"],
  [/\\pm/g, "±"],
  [/\\infty/g, "∞"],
  [/\\sum/g, "Σ"],
  [/\\prod/g, "Π"],
  [/\\int/g, "∫"],
  [/\\sqrt\{([^}]*)\}/g, "√($1)"],
  [/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)"],
  [/\\in/g, "∈"],
  [/\\notin/g, "∉"],
  [/\\subseteq/g, "⊆"],
  [/\\subset/g, "⊂"],
  [/\\cup/g, "∪"],
  [/\\cap/g, "∩"],
  [/\\emptyset/g, "∅"],
  [/\\forall/g, "∀"],
  [/\\exists/g, "∃"],
  [/\\alpha/g, "α"],
  [/\\beta/g, "β"],
  [/\\gamma/g, "γ"],
  [/\\delta/g, "δ"],
  [/\\lambda/g, "λ"],
  [/\\mu/g, "μ"],
  [/\\pi/g, "π"],
  [/\\sigma/g, "σ"],
  [/\\theta/g, "θ"],
  [/\\omega/g, "ω"],
  [/\\Delta/g, "Δ"],
  [/\\\{/g, "{"],
  [/\\\}/g, "}"],
  [/\\quad|\\qquad/g, "   "],
  [/\\[;,:!]/g, " "],
  [/\^\{([^}]*)\}/g, "^($1)"],
  [/_\{([^}]*)\}/g, "_$1"],
  [/\\text\{([^}]*)\}/g, "$1"],
  [/\\mathrm\{([^}]*)\}/g, "$1"],
];

/** Word çıktısı için LaTeX ifadesini okunabilir Unicode metne çevirir. */
export function latexToPlain(expr: string): string {
  let s = expr;
  for (const [re, rep] of LATEX_MAP) s = s.replace(re, rep);
  return s.replace(/\s{2,}/g, "  ").trim();
}
