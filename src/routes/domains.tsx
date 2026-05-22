import React, { useState, useMemo } from "react";

function normalizeInput(text: string) {
  return text
    .split(/[,\n\r\t ]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isDomainValid(d: string) {
  // basic domain validation (labels + TLD)
  const re = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
  return re.test(d);
}

export default function DomainsPage(): JSX.Element {
  const [text, setText] = useState("");
  const [limit] = useState(500);
  const domains = useMemo(() => normalizeInput(text), [text]);
  const unique = useMemo(() => Array.from(new Set(domains)).slice(0, limit), [domains, limit]);
  const invalid = useMemo(() => unique.filter((d) => !isDomainValid(d)), [unique]);

  function handleValidate() {
    // simply trigger the derived lists by updating state
    setText((t) => t.trim());
  }

  function exportCSV() {
    const csv = unique.join("\n");
    const blob = new Blob([csv], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "domains.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(unique.join("\n"));
      alert("Copied " + unique.length + " domains to clipboard");
    } catch (e) {
      alert("Copy failed — your browser may block clipboard access");
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Add or Paste Domains</h1>

      <textarea
        aria-label="domains"
        placeholder="Paste up to 500 domains, one per line or separated by commas"
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={styles.textarea}
      />

      <div style={styles.row}>
        <button onClick={handleValidate} style={styles.primaryBtn}>
          Validate
        </button>
        <button onClick={exportCSV} style={styles.secondaryBtn}>
          Export (.txt)
        </button>
        <button onClick={copyAll} style={styles.secondaryBtn}>
          Copy
        </button>
      </div>

      <div style={styles.stats}>
        <div>Total parsed: {domains.length}</div>
        <div>
          Unique (first {limit}): {unique.length}
        </div>
        <div style={{ color: invalid.length ? "#c00" : "#080" }}>Invalid: {invalid.length}</div>
      </div>

      {invalid.length > 0 && (
        <details style={styles.details}>
          <summary style={styles.summary}>Invalid domains ({invalid.length})</summary>
          <pre style={styles.invalidList}>{invalid.join("\n")}</pre>
        </details>
      )}

      <details style={styles.details}>
        <summary style={styles.summary}>Transfer & Verification Tips</summary>
        <div style={styles.tipBlock}>
          <h3 style={{ marginTop: 0 }}>Verify for email sending (recommended)</h3>
          <ol>
            <li>Add your domain in Resend (or mail provider) dashboard.</li>
            <li>Copy the provided DNS TXT/CNAME records (SPF, DKIM).</li>
            <li>Add those records at your DNS registrar (Cloudflare/GoDaddy/etc.).</li>
            <li>Wait for DNS propagation and click Verify in dashboard.</li>
          </ol>

          <h3>Transfer domains (only if you want to move registrars)</h3>
          <ol>
            <li>Unlock the domain at the current registrar.</li>
            <li>Disable WHOIS privacy if active.</li>
            <li>Request the EPP/Auth code from current registrar.</li>
            <li>Initiate transfer at new registrar and provide the auth code.</li>
          </ol>

          <p style={{ fontSize: 13, color: "#666" }}>
            Note: Transfers take time and are not required for email verification.
          </p>
        </div>
      </details>

      <div style={{ height: 40 }} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 900,
    margin: "16px auto",
    padding: 16,
    boxSizing: "border-box",
  },
  h1: { fontSize: 20, marginBottom: 12 },
  textarea: {
    width: "100%",
    minHeight: 180,
    padding: 12,
    fontSize: 16,
    borderRadius: 8,
    border: "1px solid #ddd",
    boxSizing: "border-box",
    resize: "vertical",
  },
  row: {
    display: "flex",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  primaryBtn: {
    background: "#0b69ff",
    color: "white",
    border: "none",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 15,
  },
  secondaryBtn: {
    background: "#f2f4f8",
    border: "1px solid #d6dbe6",
    padding: "10px 12px",
    borderRadius: 8,
    fontSize: 15,
  },
  stats: {
    display: "flex",
    gap: 12,
    marginTop: 12,
    flexWrap: "wrap",
    fontSize: 14,
  },
  details: {
    marginTop: 16,
    background: "#fff",
    borderRadius: 8,
    padding: 12,
    border: "1px solid #eee",
  },
  summary: { fontSize: 16, cursor: "pointer" },
  tipBlock: { fontSize: 14, lineHeight: 1.5 },
  invalidList: { whiteSpace: "pre-wrap", color: "#c00" },
};
