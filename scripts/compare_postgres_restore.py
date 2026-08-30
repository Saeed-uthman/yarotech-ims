"""Read-only comparison of the live and rehearsal PostgreSQL databases."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import psycopg


CHECKS = {
    "users": "SELECT COUNT(*) FROM accounts_user",
    "products": "SELECT COUNT(*) FROM products_product",
    "product_variants": "SELECT COUNT(*) FROM products_productvariant",
    "current_stock_units": "SELECT COALESCE(SUM(current_stock), 0) FROM products_productvariant",
    "customers": "SELECT COUNT(*) FROM customers_customer",
    "sales": "SELECT COUNT(*) FROM sales_sale",
    "sales_total": "SELECT COALESCE(SUM(total_amount), 0) FROM sales_sale",
    "outstanding_debt": "SELECT COALESCE(SUM(outstanding_amount), 0) FROM sales_sale WHERE status = 'COMPLETED'",
    "purchases": "SELECT COUNT(*) FROM purchases_stockpurchase",
    "purchase_total": "SELECT COALESCE(SUM(total_amount), 0) FROM purchases_stockpurchase",
    "ledger_transactions": "SELECT COUNT(*) FROM accountability_accountabilitytransaction",
    "ledger_money_in": "SELECT COALESCE(SUM(amount), 0) FROM accountability_accountabilitytransaction WHERE direction = 'IN' AND status = 'COMPLETED'",
    "ledger_money_out": "SELECT COALESCE(SUM(amount), 0) FROM accountability_accountabilitytransaction WHERE direction = 'OUT' AND status = 'COMPLETED'",
    "document_sequences": "SELECT COUNT(*) FROM common_documentsequence",
}


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if path.exists():
        for raw in path.read_text(encoding="utf-8-sig").splitlines():
            line = raw.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                values[key.strip()] = value.strip().strip("\"'")
    return values


def collect(connection: psycopg.Connection) -> dict[str, object]:
    results: dict[str, object] = {}
    with connection.cursor() as cursor:
        for name, query in CHECKS.items():
            cursor.execute(query)
            results[name] = cursor.fetchone()[0]
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("rehearsal_database")
    args = parser.parse_args()
    rehearsal = args.rehearsal_database.strip()
    root = Path(__file__).resolve().parents[1]
    environment = read_env(root / ".env")
    for key, value in read_env(root / "alamaan_backend" / ".env").items():
        environment.setdefault(key, value)
    live = environment.get("DB_NAME", "")
    if not rehearsal or rehearsal == live:
        raise ValueError("Comparison requires a separate rehearsal database.")

    connection_options = {
        "host": environment.get("DB_HOST", "127.0.0.1"),
        "port": environment.get("DB_PORT", "5432"),
        "user": environment.get("DB_USER", ""),
        "password": environment.get("DB_PASSWORD", ""),
        "connect_timeout": 10,
    }
    with psycopg.connect(dbname=live, **connection_options) as live_connection:
        live_values = collect(live_connection)
    with psycopg.connect(dbname=rehearsal, **connection_options) as rehearsal_connection:
        restored_values = collect(rehearsal_connection)

    mismatches = 0
    for name in CHECKS:
        matches = live_values[name] == restored_values[name]
        print(f"{'OK' if matches else 'MISMATCH':8} {name}: live={live_values[name]} restored={restored_values[name]}")
        mismatches += 0 if matches else 1
    if mismatches:
        print(f"Restore reconciliation failed with {mismatches} mismatch(es).", file=sys.stderr)
        return 1
    print("Restore reconciliation passed: all critical counts and totals match.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Restore comparison failed: {error}", file=sys.stderr)
        raise SystemExit(1)
