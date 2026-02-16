import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Download,
  Upload,
  Search,
  RefreshCcw,
} from "lucide-react";

/**
 * Seller Operating System — Plain React + Vite
 * - No shadcn imports
 * - Looks like a SaaS dashboard
 * - Saves to LocalStorage
 * - CSV import/export for each module
 */

const STORAGE_KEY = "seller_os_plain_v1";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});
const num = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safe(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function uid() {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCSV(rows, headers) {
  const esc = (s) => {
    const str = String(s ?? "");
    if (/[\n\r,"]/g.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const head = headers.map(esc).join(",");
  const body = rows
    .map((r) => headers.map((h) => esc(r[h])).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

function parseCSV(text) {
  const rows = [];
  let i = 0;
  let field = "";
  let row = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    if (row.length === 1 && row[0] === "") {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (c === "\n") {
      pushField();
      pushRow();
      i += 1;
      continue;
    }
    if (c === "\r") {
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }

  pushField();
  pushRow();
  return rows;
}

function calcProductDerived(p) {
  const qty = safe(p.qtySold);
  const sell = safe(p.sellPrice);
  const buy = safe(p.buyCost);
  const fees = safe(p.fees);
  const other = safe(p.otherCosts);
  const sales = qty * sell;
  const cogs = qty * buy;
  const profit = sales - cogs - fees - other;
  const roi = cogs > 0 ? profit / cogs : 0;
  return { sales, cogs, profit, roi };
}

function calcInventoryDerived(i) {
  const stock = safe(i.currentStock);
  const daily = safe(i.avgDailySales);
  const daysLeft = daily > 0 ? stock / daily : 0;
  const rp = safe(i.reorderPointDays);
  const reorderNeeded = daily > 0 && daysLeft <= rp;
  const suggested = reorderNeeded ? Math.max(0, Math.ceil(daily * 30 - stock)) : 0;
  return { daysLeft, reorderNeeded, suggested };
}

const starter = {
  brandName: "ANW Seller OS",
  products: [
    {
      id: uid(),
      date: todayISO(),
      channel: "Amazon",
      sku: "SKU-001",
      asin: "B000TEST",
      productName: "",
      qtySold: 1,
      sellPrice: 19.99,
      buyCost: 9.5,
      fees: 4.2,
      otherCosts: 0,
      category: "Wholesale",
      notes: "Replace with your own data",
    },
  ],
  inventory: [
    {
      id: uid(),
      sku: "SKU-001",
      productName: "",
      supplier: "Supplier Ltd",
      currentStock: 25,
      avgDailySales: 1,
      reorderPointDays: 14,
      notes: "Edit this",
    },
  ],
  suppliers: [
    {
      id: uid(),
      supplierName: "",
      contact: "John Smith",
      email: "supplier@email.com",
      phone: "",
      moq: 0,
      leadTimeDays: 7,
      notes: "Edit this",
    },
  ],
  expenses: [
    {
      id: uid(),
      date: todayISO(),
      description: "",
      category: "Software",
      amount: 19.99,
    },
  ],
};

function useStoredState() {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return starter;
      const parsed = JSON.parse(raw);
      return { ...starter, ...parsed };
    } catch {
      return starter;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  return [state, setState];
}

/* ---------- UI (plain) ---------- */

const styles = {
  page: {
    minHeight: "100vh",
    overflowX: "hidden",
    background:
      "radial-gradient(1200px 600px at 20% 0%, rgba(110,231,255,.10), transparent 60%), radial-gradient(900px 500px at 80% 10%, rgba(87,242,135,.08), transparent 60%), #0b1220",
    color: "#e6edf6",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  },
  container: {
  width: "100%",
  maxWidth: "100%",
  margin: 0,
  padding: "20px 24px",
},
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  logo: {
    height: 40,
    width: 40,
    borderRadius: 14,
    background: "rgba(110,231,255,.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },
  badge: {
    fontSize: 12,
    color: "#9fb0c3",
    border: "1px solid rgba(255,255,255,.10)",
    padding: "4px 10px",
    borderRadius: 999,
  },
  tabs: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  tab: (active) => ({
    cursor: "pointer",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.10)",
    background: active ? "rgba(110,231,255,.16)" : "rgba(255,255,255,.06)",
    color: "#e6edf6",
    fontWeight: 600,
  }),
  card: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03))",
    padding: 16,
  },
  grid: (n) => ({
    display: "grid",
    gridTemplateColumns: `repeat(${n}, minmax(0,1fr))`,
    gap: 12,
  }),
  btn: (primary) => ({
    cursor: "pointer",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.10)",
    padding: "10px 12px",
    background: primary ? "rgba(110,231,255,.16)" : "rgba(255,255,255,.06)",
    color: "#e6edf6",
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  }),
  input: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.18)",
    color: "#e6edf6",
    padding: "10px 12px",
    outline: "none",
  },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    fontSize: 12,
    color: "#9fb0c3",
    borderBottom: "1px solid rgba(255,255,255,.10)",
    padding: "10px 8px",
  },
  td: {
    borderBottom: "1px solid rgba(255,255,255,.08)",
    padding: "10px 8px",
    fontSize: 14,
    verticalAlign: "top",
  },
  right: { textAlign: "right" },
  danger: { color: "#ff6b6b", fontWeight: 800 },
  ok: { color: "#57f287", fontWeight: 800 },
};

function Metric({ label, value, sub }) {
  return (
    <div style={styles.card}>
      <div style={{ fontSize: 12, color: "#9fb0c3", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{value}</div>
      {sub ? (
        <div style={{ fontSize: 12, color: "#9fb0c3", marginTop: 6 }}>{sub}</div>
      ) : null}
    </div>
  );
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        zIndex: 50,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(980px, 100%)",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,.10)",
          background: "#0f1b2f",
          padding: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{title}</div>
          <button style={styles.btn(false)} onClick={onClose}>
            Close
            <button style={styles.btn(true)} onClick={() => (window.location.href = PAY_LINK)}>
  Buy Access
</button>
          </button>
        </div>
        <div style={{ height: 10 }} />
        {children}
      </div>
    </div>
  );
}

function CSVButtons({ label, headers, rows, onImportRows }) {
  const inputId = useMemo(() => `csv_${uid()}`, []);
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button
        style={styles.btn(false)}
        onClick={() => downloadText(`${label}.csv`, toCSV(rows, headers))}
      >
        <Download size={16} /> Export CSV
      </button>

      <input
        id={inputId}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          const parsed = parseCSV(text);
          if (parsed.length < 2) return;
          const [head, ...body] = parsed;

          const map = headers.map((h) => head.indexOf(h));
          const imported = body
            .filter((r) => r.some((x) => String(x ?? "").trim() !== ""))
            .map((r) => {
              const obj = { id: uid() };
              headers.forEach((h, idx) => {
                const col = map[idx];
                obj[h] = col >= 0 ? r[col] : "";
              });
              return obj;
            });

          onImportRows(imported);
          e.target.value = "";
        }}
      />

      <button
        style={styles.btn(false)}
        onClick={() => document.getElementById(inputId)?.click()}
      >
        <Upload size={16} /> Import CSV
      </button>
    </div>
  );
}

/* ---------- Forms ---------- */

function ProductForm({ initial, onSave }) {
  const [v, setV] = useState(
    initial ?? {
      id: uid(),
      date: todayISO(),
      channel: "Amazon",
      sku: "",
      asin: "",
      productName: "",
      qtySold: 1,
      sellPrice: 0,
      buyCost: 0,
      fees: 0,
      otherCosts: 0,
      category: "",
      notes: "",
    }
  );

  const d = useMemo(() => calcProductDerived(v), [v]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {[
        ["Date", "date", "date"],
        ["Channel", "channel", "text"],
        ["SKU", "sku", "text"],
        ["ASIN", "asin", "text"],
      ].map(([label, key, type]) => (
        <div key={key}>
          <div style={{ fontSize: 12, color: "#9fb0c3", fontWeight: 700 }}>
            {label}
          </div>
          <input
            style={styles.input}
            type={type}
            value={v[key]}
            onChange={(e) => setV({ ...v, [key]: e.target.value })}
          />
        </div>
      ))}

      <div style={{ gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 12, color: "#9fb0c3", fontWeight: 700 }}>
          Product Name
        </div>
        <input
          style={styles.input}
          value={v.productName}
          onChange={(e) => setV({ ...v, productName: e.target.value })}
        />
      </div>

      {[
        ["Qty Sold", "qtySold"],
        ["Sell Price", "sellPrice"],
        ["Buy Cost", "buyCost"],
        ["Fees", "fees"],
        ["Other Costs", "otherCosts"],
      ].map(([label, key]) => (
        <div key={key}>
          <div style={{ fontSize: 12, color: "#9fb0c3", fontWeight: 700 }}>
            {label}
          </div>
          <input
            style={styles.input}
            type="number"
            step="0.01"
            value={v[key]}
            onChange={(e) => setV({ ...v, [key]: safe(e.target.value) })}
          />
        </div>
      ))}

      <div>
        <div style={{ fontSize: 12, color: "#9fb0c3", fontWeight: 700 }}>
          Category
        </div>
        <input
          style={styles.input}
          value={v.category}
          onChange={(e) => setV({ ...v, category: e.target.value })}
          placeholder="Wholesale / OA / RA"
        />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 12, color: "#9fb0c3", fontWeight: 700 }}>
          Notes
        </div>
        <textarea
          style={{ ...styles.input, minHeight: 84 }}
          value={v.notes}
          onChange={(e) => setV({ ...v, notes: e.target.value })}
        />
      </div>

      <div style={{ gridColumn: "1 / -1", ...styles.card }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span style={styles.badge}>Sales: {currency.format(d.sales)}</span>
          <span style={styles.badge}>COGS: {currency.format(d.cogs)}</span>
          <span style={styles.badge}>
            Profit:{" "}
            <span style={d.profit < 0 ? styles.danger : styles.ok}>
              {currency.format(d.profit)}
            </span>
          </span>
          <span style={styles.badge}>ROI: {num.format(d.roi * 100)}%</span>
        </div>
      </div>

      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
        <button style={styles.btn(true)} onClick={() => onSave(v)}>
          Save
        </button>
      </div>
    </div>
  );
}

function InventoryForm({ initial, onSave }) {
  const [v, setV] = useState(
    initial ?? {
      id: uid(),
      sku: "",
      productName: "",
      supplier: "",
      currentStock: 0,
      avgDailySales: 0,
      reorderPointDays: 14,
      notes: "",
    }
  );
  const d = useMemo(() => calcInventoryDerived(v), [v]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {[
        ["SKU", "sku"],
        ["Supplier", "supplier"],
      ].map(([label, key]) => (
        <div key={key}>
          <div style={{ fontSize: 12, color: "#9fb0c3", fontWeight: 700 }}>
            {label}
          </div>
          <input
            style={styles.input}
            value={v[key]}
            onChange={(e) => setV({ ...v, [key]: e.target.value })}
          />
        </div>
      ))}

      <div style={{ gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 12, color: "#9fb0c3", fontWeight: 700 }}>
          Product Name
        </div>
        <input
          style={styles.input}
          value={v.productName}
          onChange={(e) => setV({ ...v, productName: e.target.value })}
        />
      </div>

      {[
        ["Current Stock", "currentStock"],
        ["Avg Daily Sales", "avgDailySales"],
        ["Reorder Point (Days)", "reorderPointDays"],
      ].map(([label, key]) => (
        <div key={key}>
          <div style={{ fontSize: 12, color: "#9fb0c3", fontWeight: 700 }}>
            {label}
          </div>
          <input
            style={styles.input}
            type="number"
            step="0.01"
            value={v[key]}
            onChange={(e) => setV({ ...v, [key]: safe(e.target.value) })}
          />
        </div>
      ))}

      <div style={{ gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 12, color: "#9fb0c3", fontWeight: 700 }}>
          Notes
        </div>
        <textarea
          style={{ ...styles.input, minHeight: 84 }}
          value={v.notes}
          onChange={(e) => setV({ ...v, notes: e.target.value })}
        />
      </div>

      <div style={{ gridColumn: "1 / -1", ...styles.card }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span style={styles.badge}>
            Days Left:{" "}
            <span style={d.daysLeft <= 3 && d.daysLeft > 0 ? styles.danger : {}}>
              {d.daysLeft > 0 ? num.format(d.daysLeft) : "—"}
            </span>
          </span>
          <span style={styles.badge}>
            Reorder:{" "}
            <span style={d.reorderNeeded ? styles.danger : styles.ok}>
              {d.reorderNeeded ? "YES" : "NO"}
            </span>
          </span>
          <span style={styles.badge}>
            Suggested Qty: {d.reorderNeeded ? num.format(d.suggested) : "—"}
          </span>
        </div>
      </div>

      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
        <button style={styles.btn(true)} onClick={() => onSave(v)}>
          Save
        </button>
      </div>
    </div>
  );
}

function SupplierForm({ initial, onSave }) {
  const [v, setV] = useState(
    initial ?? {
      id: uid(),
      supplierName: "",
      contact: "",
      email: "",
      phone: "",
      moq: 0,
      leadTimeDays: 7,
      notes: "",
    }
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {[
        ["Supplier Name", "supplierName"],
        ["Contact", "contact"],
        ["Email", "email"],
        ["Phone", "phone"],
        ["MOQ", "moq"],
        ["Lead Time (days)", "leadTimeDays"],
      ].map(([label, key]) => (
        <div key={key}>
          <div style={{ fontSize: 12, color: "#9fb0c3", fontWeight: 700 }}>
            {label}
          </div>
          <input
            style={styles.input}
            type={key === "moq" || key === "leadTimeDays" ? "number" : "text"}
            value={v[key]}
            onChange={(e) =>
              setV({ ...v, [key]: key === "moq" || key === "leadTimeDays" ? safe(e.target.value) : e.target.value })
            }
          />
        </div>
      ))}

      <div style={{ gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 12, color: "#9fb0c3", fontWeight: 700 }}>
          Notes
        </div>
        <textarea
          style={{ ...styles.input, minHeight: 84 }}
          value={v.notes}
          onChange={(e) => setV({ ...v, notes: e.target.value })}
        />
      </div>

      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
        <button style={styles.btn(true)} onClick={() => onSave(v)}>
          Save
        </button>
      </div>
    </div>
  );
}

function ExpenseForm({ initial, onSave }) {
  const [v, setV] = useState(
    initial ?? {
      id: uid(),
      date: todayISO(),
      description: "",
      category: "",
      amount: 0,
    }
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <div>
        <div style={{ fontSize: 12, color: "#9fb0c3", fontWeight: 700 }}>Date</div>
        <input
          style={styles.input}
          type="date"
          value={v.date}
          onChange={(e) => setV({ ...v, date: e.target.value })}
        />
      </div>
      <div>
        <div style={{ fontSize: 12, color: "#9fb0c3", fontWeight: 700 }}>Amount</div>
        <input
          style={styles.input}
          type="number"
          step="0.01"
          value={v.amount}
          onChange={(e) => setV({ ...v, amount: safe(e.target.value) })}
        />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 12, color: "#9fb0c3", fontWeight: 700 }}>
          Description
        </div>
        <input
          style={styles.input}
          value={v.description}
          onChange={(e) => setV({ ...v, description: e.target.value })}
        />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 12, color: "#9fb0c3", fontWeight: 700 }}>
          Category
        </div>
        <input
          style={styles.input}
          value={v.category}
          onChange={(e) => setV({ ...v, category: e.target.value })}
          placeholder="Software / Shipping / Tools…"
        />
      </div>

      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
        <button style={styles.btn(true)} onClick={() => onSave(v)}>
          Save
        </button>
      </div>
    </div>
  );
}

/* ---------- Tabs ---------- */

function Dashboard({ data, setData }) {
  const totals = useMemo(() => {
    let sales = 0,
      profit = 0,
      cogs = 0,
      units = 0;
    for (const p of data.products) {
      const d = calcProductDerived(p);
      sales += d.sales;
      profit += d.profit;
      cogs += d.cogs;
      units += safe(p.qtySold);
    }
    const roi = cogs > 0 ? profit / cogs : 0;

    let reorder = 0;
    for (const i of data.inventory) if (calcInventoryDerived(i).reorderNeeded) reorder += 1;

    const expenses = data.expenses.reduce((a, e) => a + safe(e.amount), 0);
    const trueProfit = profit - expenses;

    return { sales, profit, roi, units, reorder, expenses, trueProfit };
  }, [data]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...styles.card, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: "-.02em" }}>
            Dashboard
          </div>
          <div style={{ fontSize: 13, color: "#9fb0c3" }}>
            Your business at a glance — like software, not a spreadsheet.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        </div>
      </div>

      <div style={styles.grid(4)}>
        <Metric label="Total Sales" value={currency.format(totals.sales)} />
        <Metric label="Net Profit" value={currency.format(totals.profit)} sub={totals.profit < 0 ? "You're losing money overall" : ""} />
        <Metric label="True Profit" value={currency.format(totals.trueProfit)} sub="Profit minus overheads" />
        <Metric label="Average ROI" value={`${num.format(totals.roi * 100)}%`} />
      </div>

      <div style={styles.grid(3)}>
        <Metric label="Units Sold" value={num.format(totals.units)} />
        <Metric label="Reorder Alerts" value={num.format(totals.reorder)} sub={totals.reorder > 0 ? "Check Inventory tab" : "All good"} />
        <Metric label="Expenses" value={currency.format(totals.expenses)} />
      </div>
    </div>
  );
}

function Products({ data, setData }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data.products;
    return data.products.filter((p) =>
      [p.channel, p.sku, p.asin, p.productName, p.category, p.notes]
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [q, data.products]);

  const totals = useMemo(() => {
    let sales = 0, profit = 0, cogs = 0, units = 0;
    for (const p of data.products) {
      const d = calcProductDerived(p);
      sales += d.sales; profit += d.profit; cogs += d.cogs; units += safe(p.qtySold);
    }
    const roi = cogs > 0 ? profit / cogs : 0;
    return { sales, profit, roi, units };
  }, [data.products]);

  const headers = ["date","channel","sku","asin","productName","qtySold","sellPrice","buyCost","fees","otherCosts","category","notes"];

  function upsert(row) {
    setData((prev) => {
      const list = [...prev.products];
      const idx = list.findIndex((x) => x.id === row.id);
      if (idx >= 0) list[idx] = row;
      else list.unshift(row);
      return { ...prev, products: list };
    });
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...styles.card, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: "-.02em" }}>Products</div>
          <div style={{ fontSize: 13, color: "#9fb0c3" }}>Track sales, profit, ROI, and fees.</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", minWidth: 260 }}>
            <div style={{ position: "absolute", left: 10, top: 11, color: "#9fb0c3" }}>
              <Search size={16} />
            </div>
            <input
              style={{ ...styles.input, paddingLeft: 34 }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search SKU / ASIN / name…"
            />
          </div>
          <button
            style={styles.btn(true)}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus size={16} /> Add
          </button>

          <CSVButtons
            label="products"
            headers={headers}
            rows={data.products.map((p) => {
              const o = {};
              headers.forEach((h) => (o[h] = p[h] ?? ""));
              return o;
            })}
            onImportRows={(rows) => {
              const cleaned = rows.map((r) => ({
                id: r.id,
                date: r.date || todayISO(),
                channel: r.channel || "Amazon",
                sku: r.sku || "",
                asin: r.asin || "",
                productName: r.productName || "",
                qtySold: safe(r.qtySold),
                sellPrice: safe(r.sellPrice),
                buyCost: safe(r.buyCost),
                fees: safe(r.fees),
                otherCosts: safe(r.otherCosts),
                category: r.category || "",
                notes: r.notes || "",
              }));
              setData((prev) => ({ ...prev, products: cleaned.concat(prev.products) }));
            }}
          />
        </div>
      </div>

      <div style={styles.grid(4)}>
        <Metric label="Total Sales" value={currency.format(totals.sales)} />
        <Metric label="Total Profit" value={currency.format(totals.profit)} sub={totals.profit < 0 ? "Overall loss" : ""} />
        <Metric label="Average ROI" value={`${num.format(totals.roi * 100)}%`} />
        <Metric label="Units Sold" value={num.format(totals.units)} />
      </div>

      <div style={styles.card}>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Channel</th>
                <th style={styles.th}>SKU</th>
                <th style={styles.th}>ASIN</th>
                <th style={styles.th}>Product</th>
                <th style={{ ...styles.th, ...styles.right }}>Qty</th>
                <th style={{ ...styles.th, ...styles.right }}>Sales</th>
                <th style={{ ...styles.th, ...styles.right }}>Profit</th>
                <th style={{ ...styles.th, ...styles.right }}>ROI</th>
                <th style={{ ...styles.th, ...styles.right }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const d = calcProductDerived(p);
                return (
                  <tr key={p.id}>
                    <td style={styles.td}>{p.date}</td>
                    <td style={styles.td}>{p.channel}</td>
                    <td style={styles.td}><b>{p.sku}</b></td>
                    <td style={styles.td} title={p.asin} style={{...styles.td, color:"#9fb0c3"}}>{p.asin}</td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 800 }}>{p.productName}</div>
                      <div style={{ fontSize: 12, color: "#9fb0c3" }}>{p.category || "—"}</div>
                    </td>
                    <td style={{ ...styles.td, ...styles.right }}>{num.format(safe(p.qtySold))}</td>
                    <td style={{ ...styles.td, ...styles.right }}>{currency.format(d.sales)}</td>
                    <td style={{ ...styles.td, ...styles.right, fontWeight: 900, ...(d.profit < 0 ? styles.danger : {}) }}>
                      {currency.format(d.profit)}
                    </td>
                    <td style={{ ...styles.td, ...styles.right }}>{num.format(d.roi * 100)}%</td>
                    <td style={{ ...styles.td, ...styles.right }}>
                      <button
                        style={styles.btn(false)}
                        onClick={() => {
                          setEditing(p);
                          setOpen(true);
                        }}
                      >
                        <Pencil size={16} />
                      </button>{" "}
                      <button
                        style={styles.btn(false)}
                        onClick={() =>
                          setData((prev) => ({
                            ...prev,
                            products: prev.products.filter((x) => x.id !== p.id),
                          }))
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={10}>
                    <span style={{ color: "#9fb0c3" }}>No rows found.</span>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        title={editing ? "Edit product row" : "Add product row"}
        onClose={() => setOpen(false)}
      >
        <ProductForm
          initial={editing}
          onSave={(row) => {
            upsert(row);
            setOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}

function Inventory({ data, setData }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data.inventory;
    return data.inventory.filter((i) =>
      [i.sku, i.productName, i.supplier, i.notes].join(" ").toLowerCase().includes(s)
    );
  }, [q, data.inventory]);

  const totals = useMemo(() => {
    let low = 0, reorder = 0;
    for (const i of data.inventory) {
      const d = calcInventoryDerived(i);
      if (d.daysLeft > 0 && d.daysLeft <= 7) low += 1;
      if (d.reorderNeeded) reorder += 1;
    }
    return { items: data.inventory.length, low, reorder };
  }, [data.inventory]);

  const headers = ["sku","productName","supplier","currentStock","avgDailySales","reorderPointDays","notes"];

  function upsert(row) {
    setData((prev) => {
      const list = [...prev.inventory];
      const idx = list.findIndex((x) => x.id === row.id);
      if (idx >= 0) list[idx] = row;
      else list.unshift(row);
      return { ...prev, inventory: list };
    });
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...styles.card, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: "-.02em" }}>Inventory</div>
          <div style={{ fontSize: 13, color: "#9fb0c3" }}>Reorder alerts and suggested quantities.</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", minWidth: 260 }}>
            <div style={{ position: "absolute", left: 10, top: 11, color: "#9fb0c3" }}>
              <Search size={16} />
            </div>
            <input
              style={{ ...styles.input, paddingLeft: 34 }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search SKU / product…"
            />
          </div>
          <button
            style={styles.btn(true)}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus size={16} /> Add
          </button>

          <CSVButtons
            label="inventory"
            headers={headers}
            rows={data.inventory.map((i) => {
              const o = {};
              headers.forEach((h) => (o[h] = i[h] ?? ""));
              return o;
            })}
            onImportRows={(rows) => {
              const cleaned = rows.map((r) => ({
                id: r.id,
                sku: r.sku || "",
                productName: r.productName || "",
                supplier: r.supplier || "",
                currentStock: safe(r.currentStock),
                avgDailySales: safe(r.avgDailySales),
                reorderPointDays: safe(r.reorderPointDays) || 14,
                notes: r.notes || "",
              }));
              setData((prev) => ({ ...prev, inventory: cleaned.concat(prev.inventory) }));
            }}
          />
        </div>
      </div>

      <div style={styles.grid(3)}>
        <Metric label="Items" value={num.format(totals.items)} />
        <Metric label="≤ 7 days left" value={num.format(totals.low)} />
        <Metric label="Reorder Needed" value={num.format(totals.reorder)} />
      </div>

      <div style={styles.card}>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>SKU</th>
                <th style={styles.th}>Product</th>
                <th style={styles.th}>Supplier</th>
                <th style={{ ...styles.th, ...styles.right }}>Stock</th>
                <th style={{ ...styles.th, ...styles.right }}>Avg Daily</th>
                <th style={{ ...styles.th, ...styles.right }}>Days Left</th>
                <th style={{ ...styles.th, ...styles.right }}>Reorder</th>
                <th style={{ ...styles.th, ...styles.right }}>Suggested Qty</th>
                <th style={{ ...styles.th, ...styles.right }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const d = calcInventoryDerived(i);
                const days = d.daysLeft;
                const daysStyle =
                  days <= 3 && days > 0 ? styles.danger : days <= 7 && days > 0 ? { color: "#ffcc66", fontWeight: 900 } : {};
                return (
                  <tr key={i.id}>
                    <td style={styles.td}><b>{i.sku}</b></td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 800 }}>{i.productName}</div>
                      <div style={{ fontSize: 12, color: "#9fb0c3" }}>{i.notes || ""}</div>
                    </td>
                    <td style={{ ...styles.td, color: "#9fb0c3" }}>{i.supplier}</td>
                    <td style={{ ...styles.td, ...styles.right }}>{num.format(safe(i.currentStock))}</td>
                    <td style={{ ...styles.td, ...styles.right }}>{num.format(safe(i.avgDailySales))}</td>
                    <td style={{ ...styles.td, ...styles.right, ...daysStyle }}>
                      {days > 0 ? num.format(days) : "—"}
                    </td>
                    <td style={{ ...styles.td, ...styles.right }}>
                      <span style={d.reorderNeeded ? styles.danger : styles.ok}>
                        {d.reorderNeeded ? "YES" : "NO"}
                      </span>
                    </td>
                    <td style={{ ...styles.td, ...styles.right }}>{d.reorderNeeded ? num.format(d.suggested) : "—"}</td>
                    <td style={{ ...styles.td, ...styles.right }}>
                      <button
                        style={styles.btn(false)}
                        onClick={() => {
                          setEditing(i);
                          setOpen(true);
                        }}
                      >
                        <Pencil size={16} />
                      </button>{" "}
                      <button
                        style={styles.btn(false)}
                        onClick={() =>
                          setData((prev) => ({
                            ...prev,
                            inventory: prev.inventory.filter((x) => x.id !== i.id),
                          }))
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={9}>
                    <span style={{ color: "#9fb0c3" }}>No rows found.</span>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title={editing ? "Edit inventory row" : "Add inventory row"} onClose={() => setOpen(false)}>
        <InventoryForm
          initial={editing}
          onSave={(row) => {
            upsert(row);
            setOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}

function Suppliers({ data, setData }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data.suppliers;
    return data.suppliers.filter((x) =>
      [x.supplierName, x.contact, x.email, x.phone, x.notes].join(" ").toLowerCase().includes(s)
    );
  }, [q, data.suppliers]);

  const headers = ["supplierName","contact","email","phone","moq","leadTimeDays","notes"];

  function upsert(row) {
    setData((prev) => {
      const list = [...prev.suppliers];
      const idx = list.findIndex((x) => x.id === row.id);
      if (idx >= 0) list[idx] = row;
      else list.unshift(row);
      return { ...prev, suppliers: list };
    });
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...styles.card, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: "-.02em" }}>Suppliers</div>
          <div style={{ fontSize: 13, color: "#9fb0c3" }}>Contacts, MOQs, lead times, notes.</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", minWidth: 260 }}>
            <div style={{ position: "absolute", left: 10, top: 11, color: "#9fb0c3" }}>
              <Search size={16} />
            </div>
            <input
              style={{ ...styles.input, paddingLeft: 34 }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search suppliers…"
            />
          </div>
          <button
            style={styles.btn(true)}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus size={16} /> Add
          </button>

          <CSVButtons
            label="suppliers"
            headers={headers}
            rows={data.suppliers.map((s) => {
              const o = {};
              headers.forEach((h) => (o[h] = s[h] ?? ""));
              return o;
            })}
            onImportRows={(rows) => {
              const cleaned = rows.map((r) => ({
                id: r.id,
                supplierName: r.supplierName || "",
                contact: r.contact || "",
                email: r.email || "",
                phone: r.phone || "",
                moq: safe(r.moq),
                leadTimeDays: safe(r.leadTimeDays),
                notes: r.notes || "",
              }));
              setData((prev) => ({ ...prev, suppliers: cleaned.concat(prev.suppliers) }));
            }}
          />
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Supplier</th>
                <th style={styles.th}>Contact</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Phone</th>
                <th style={{ ...styles.th, ...styles.right }}>MOQ</th>
                <th style={{ ...styles.th, ...styles.right }}>Lead Time</th>
                <th style={styles.th}>Notes</th>
                <th style={{ ...styles.th, ...styles.right }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td style={styles.td}><b>{s.supplierName}</b></td>
                  <td style={styles.td}>{s.contact}</td>
                  <td style={{ ...styles.td, color: "#9fb0c3" }}>{s.email}</td>
                  <td style={{ ...styles.td, color: "#9fb0c3" }}>{s.phone}</td>
                  <td style={{ ...styles.td, ...styles.right }}>{num.format(safe(s.moq))}</td>
                  <td style={{ ...styles.td, ...styles.right }}>{num.format(safe(s.leadTimeDays))}d</td>
                  <td style={{ ...styles.td, color: "#9fb0c3" }}>{s.notes}</td>
                  <td style={{ ...styles.td, ...styles.right }}>
                    <button style={styles.btn(false)} onClick={() => { setEditing(s); setOpen(true); }}>
                      <Pencil size={16} />
                    </button>{" "}
                    <button
                      style={styles.btn(false)}
                      onClick={() => setData((prev) => ({ ...prev, suppliers: prev.suppliers.filter((x) => x.id !== s.id) }))}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={8}>
                    <span style={{ color: "#9fb0c3" }}>No suppliers found.</span>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title={editing ? "Edit supplier" : "Add supplier"} onClose={() => setOpen(false)}>
        <SupplierForm
          initial={editing}
          onSave={(row) => {
            upsert(row);
            setOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}

function Expenses({ data, setData }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data.expenses;
    return data.expenses.filter((x) =>
      [x.description, x.category].join(" ").toLowerCase().includes(s)
    );
  }, [q, data.expenses]);

  const totals = useMemo(() => {
    const expenseTotal = data.expenses.reduce((a, e) => a + safe(e.amount), 0);
    const netProfit = data.products.reduce((a, p) => a + calcProductDerived(p).profit, 0);
    return { expenseTotal, netProfit, trueProfit: netProfit - expenseTotal };
  }, [data]);

  const headers = ["date","description","category","amount"];

  function upsert(row) {
    setData((prev) => {
      const list = [...prev.expenses];
      const idx = list.findIndex((x) => x.id === row.id);
      if (idx >= 0) list[idx] = row;
      else list.unshift(row);
      return { ...prev, expenses: list };
    });
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...styles.card, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: "-.02em" }}>Expenses</div>
          <div style={{ fontSize: 13, color: "#9fb0c3" }}>Track overheads for true profit.</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", minWidth: 260 }}>
            <div style={{ position: "absolute", left: 10, top: 11, color: "#9fb0c3" }}>
              <Search size={16} />
            </div>
            <input
              style={{ ...styles.input, paddingLeft: 34 }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search expenses…"
            />
          </div>
          <button
            style={styles.btn(true)}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus size={16} /> Add
          </button>

          <CSVButtons
            label="expenses"
            headers={headers}
            rows={data.expenses.map((e) => {
              const o = {};
              headers.forEach((h) => (o[h] = e[h] ?? ""));
              return o;
            })}
            onImportRows={(rows) => {
              const cleaned = rows.map((r) => ({
                id: r.id,
                date: r.date || todayISO(),
                description: r.description || "",
                category: r.category || "",
                amount: safe(r.amount),
              }));
              setData((prev) => ({ ...prev, expenses: cleaned.concat(prev.expenses) }));
            }}
          />
        </div>
      </div>

      <div style={styles.grid(3)}>
        <Metric label="Total Expenses" value={currency.format(totals.expenseTotal)} />
        <Metric label="Net Profit" value={currency.format(totals.netProfit)} />
        <Metric label="True Profit" value={currency.format(totals.trueProfit)} sub="Profit minus overheads" />
      </div>

      <div style={styles.card}>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Category</th>
                <th style={{ ...styles.th, ...styles.right }}>Amount</th>
                <th style={{ ...styles.th, ...styles.right }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td style={styles.td}>{e.date}</td>
                  <td style={styles.td}><b>{e.description}</b></td>
                  <td style={{ ...styles.td, color: "#9fb0c3" }}>{e.category}</td>
                  <td style={{ ...styles.td, ...styles.right }}>{currency.format(safe(e.amount))}</td>
                  <td style={{ ...styles.td, ...styles.right }}>
                    <button style={styles.btn(false)} onClick={() => { setEditing(e); setOpen(true); }}>
                      <Pencil size={16} />
                    </button>{" "}
                    <button
                      style={styles.btn(false)}
                      onClick={() => setData((prev) => ({ ...prev, expenses: prev.expenses.filter((x) => x.id !== e.id) }))}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={5}>
                    <span style={{ color: "#9fb0c3" }}>No expenses found.</span>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title={editing ? "Edit expense" : "Add expense"} onClose={() => setOpen(false)}>
        <ExpenseForm
          initial={editing}
          onSave={(row) => {
            upsert(row);
            setOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}

/* ---------- App ---------- */

export default function App() {
  const [data, setData] = useStoredState();
  const [tab, setTab] = useState("dashboard");
  const PAY_LINK = "https://buy.stripe.com/7sY28kabRbLQgyhe0Lak000";
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem("seller_os_unlocked") === "1");



  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topbar}>
          <div style={styles.brand}>
            <div style={styles.logo}>
              {String(data.brandName || "S").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 900 }}>{data.brandName}</div>
              <div style={{ fontSize: 12, color: "#9fb0c3" }}>
                Web dashboard • Local save • CSV import/export
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ minWidth: 240 }}>
              <input
                style={styles.input}
                value={data.brandName}
                onChange={(e) => setData((p) => ({ ...p, brandName: e.target.value }))}
                placeholder="Brand name"
              />
            </div>
            <span style={styles.badge}>Everything saves automatically</span>
          </div>
        </div>

        <div style={styles.tabs}>
          {[
            ["dashboard", "Dashboard"],
            ["products", "Products"],
            ["inventory", "Inventory"],
            ["suppliers", "Suppliers"],
            ["expenses", "Expenses"],
          ].map(([k, label]) => (
            <button key={k} style={styles.tab(tab === k)} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>

        {tab === "dashboard" ? <Dashboard data={data} setData={setData} /> : null}
        {tab === "products" ? <Products data={data} setData={setData} /> : null}
        {tab === "inventory" ? <Inventory data={data} setData={setData} /> : null}
        {tab === "suppliers" ? <Suppliers data={data} setData={setData} /> : null}
        {tab === "expenses" ? <Expenses data={data} setData={setData} /> : null}

        <div style={{ marginTop: 16, fontSize: 12, color: "#9fb0c3" }}>
          Next step (when you’re ready): add user logins + database so it works across devices.
        </div>
      </div>
    </div>
  );
}
if (!unlocked) {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 950 }}>Seller OS</h1>
          <p style={styles.hint}>
            Purchase access to unlock the app.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button style={styles.btn(true)} onClick={() => (window.location.href = PAY_LINK)}>
              Buy Access
            </button>

            <button
              style={styles.btn(false)}
              onClick={() => {
                // temporary manual unlock (for you/testing)
                localStorage.setItem("seller_os_unlocked", "1");
                setUnlocked(true);
              }}
            >
              I already paid (unlock)
            </button>
          </div>

          <p style={{ ...styles.hint, marginTop: 12 }}>
            Next upgrade: automatic unlock with login + Stripe webhook (real paywall).
          </p>
        </div>
      </div>
    </div>
  );
}
