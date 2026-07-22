"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/types";

const MAX_RESULTS = 20;

export default function ProductAutocomplete({
  products,
  onSelect,
  placeholder,
  autoFocus,
}: {
  products: Product[];
  onSelect: (product: Product) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, MAX_RESULTS);
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS);
  }, [products, query]);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectProduct(product: Product) {
    onSelect(product);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const product = results[highlighted];
      if (product) selectProduct(product);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        className="input"
        placeholder={placeholder ?? "Digite o nome ou código do produto..."}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && results.length > 0 && (
        <ul
          className="absolute z-10 mt-1 w-full max-h-72 overflow-auto rounded-lg border shadow-lg text-sm"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
        >
          {results.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2"
                style={i === highlighted ? { backgroundColor: "var(--surface-2)" } : undefined}
                onMouseEnter={() => setHighlighted(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectProduct(p)}
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-xs tabular" style={{ color: "var(--ink-soft)" }}>
                  {p.code} · estoque: {p.currentStock} {p.unit}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() !== "" && results.length === 0 && (
        <div
          className="absolute z-10 mt-1 w-full rounded-lg border shadow-lg text-sm px-3 py-2"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--ink-soft)" }}
        >
          Nenhum produto encontrado.
        </div>
      )}
    </div>
  );
}
