import type { ComplianceStatus, Product, Supplier } from "./store";

export interface ComplianceResult {
  status: ComplianceStatus;
  issues: string[];
}

/** Materials that require specific certifications from the supplier. */
const MATERIAL_RULES: { match: RegExp; requires: string[]; label: string }[] = [
  { match: /organic\s*cotton/i, requires: ["GOTS"], label: "Organic Cotton" },
  { match: /recycled\s*polyester|rpet/i, requires: ["GRS", "RCS"], label: "Recycled Polyester" },
  { match: /wool/i, requires: ["RWS"], label: "Wool" },
  { match: /down|feather/i, requires: ["RDS"], label: "Down" },
  { match: /leather/i, requires: ["LWG"], label: "Leather" },
  { match: /viscose|rayon|lyocell|tencel/i, requires: ["FSC", "Canopy"], label: "Cellulosic" },
];

/** Materials banned outright. */
const BANNED_MATERIALS = [/\bpfas\b/i, /\bpfc\b/i, /\bazo\b/i, /\bchrome\s*vi\b/i];

/**
 * Compute a product's compliance status and any issues, based on the linked
 * supplier and the product's declared material composition.
 *
 * Rules (worst issue wins):
 *  - non-compliant: supplier non-compliant, banned material, or missing required cert
 *  - review:        supplier in review, or material declared without a recognized fiber
 *  - pending:       supplier pending, or no material declared
 *  - compliant:     supplier compliant and all material rules satisfied
 */
export function validateProduct(
  product: Pick<Product, "material">,
  supplier: Pick<Supplier, "status" | "certifications"> | undefined,
): ComplianceResult {
  const issues: string[] = [];
  let worst: ComplianceStatus = "compliant";
  const bump = (s: ComplianceStatus) => {
    const rank: Record<ComplianceStatus, number> = {
      compliant: 0, pending: 1, review: 2, "non-compliant": 3,
    };
    if (rank[s] > rank[worst]) worst = s;
  };

  if (!supplier) {
    issues.push("No supplier linked");
    bump("review");
  } else {
    if (supplier.status === "non-compliant") {
      issues.push("Supplier is non-compliant");
      bump("non-compliant");
    } else if (supplier.status === "review") {
      issues.push("Supplier under review");
      bump("review");
    } else if (supplier.status === "pending") {
      issues.push("Supplier pending verification");
      bump("pending");
    }
  }

  const material = product.material?.trim() ?? "";
  if (!material) {
    issues.push("Material composition not declared");
    bump("pending");
  } else {
    for (const banned of BANNED_MATERIALS) {
      if (banned.test(material)) {
        issues.push(`Banned substance detected: ${material.match(banned)?.[0]}`);
        bump("non-compliant");
      }
    }
    const certs = (supplier?.certifications ?? []).map((c) => c.toUpperCase());
    let matchedRule = false;
    for (const rule of MATERIAL_RULES) {
      if (rule.match.test(material)) {
        matchedRule = true;
        const missing = rule.requires.filter(
          (r) => !certs.some((c) => c.includes(r.toUpperCase())),
        );
        if (missing.length === rule.requires.length) {
          issues.push(`${rule.label} requires ${rule.requires.join(" or ")} certification`);
          bump("non-compliant");
        }
      }
    }
    if (!matchedRule && supplier?.status === "compliant") {
      issues.push("Unrecognized fiber — manual review recommended");
      bump("review");
    }
  }

  return { status: worst, issues };
}
