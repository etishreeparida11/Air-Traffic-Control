"""SQLite setup and small database helpers for the air traffic demo."""

import sqlite3
from pathlib import Path

from flask import current_app, g


def get_db():
    """Return the request-scoped SQLite connection."""
    if "db" not in g:
        g.db = sqlite3.connect(current_app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(_error=None):
    """Close the request-scoped database connection."""
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Create tables and insert the illustrative network on first run."""
    database_path = Path(current_app.config["DATABASE"])
    database_path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(database_path)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS airports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT NOT NULL UNIQUE COLLATE NOCASE,
            capacity INTEGER NOT NULL CHECK (capacity > 0),
            location TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS routes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INTEGER NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
            destination_id INTEGER NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
            distance INTEGER NOT NULL CHECK (distance > 0),
            status TEXT NOT NULL DEFAULT 'Available'
                CHECK (status IN ('Available', 'Restricted')),
            CHECK (source_id <> destination_id)
        );
        """
    )

    airport_count = db.execute("SELECT COUNT(*) FROM airports").fetchone()[0]
    if airport_count == 0:
        airports = [
            ("Delhi", "DEL", 100, "New Delhi, India"),
            ("Mumbai", "BOM", 90, "Mumbai, India"),
            ("Chennai", "MAA", 80, "Chennai, India"),
            ("Kolkata", "CCU", 70, "Kolkata, India"),
            ("Bengaluru", "BLR", 85, "Bengaluru, India"),
        ]
        db.executemany(
            "INSERT INTO airports (name, code, capacity, location) VALUES (?, ?, ?, ?)",
            airports,
        )
        airport_ids = {
            row["code"]: row["id"]
            for row in db.execute("SELECT id, code FROM airports")
        }
        routes = [
            ("DEL", "BOM", 1150, "Available"),
            ("DEL", "CCU", 1310, "Available"),
            ("DEL", "BLR", 1740, "Available"),
            ("BOM", "MAA", 1030, "Available"),
            ("BOM", "BLR", 840, "Available"),
            ("MAA", "BLR", 290, "Available"),
            ("MAA", "CCU", 1360, "Restricted"),
            ("CCU", "BLR", 1560, "Available"),
        ]
        db.executemany(
            """
            INSERT INTO routes (source_id, destination_id, distance, status)
            VALUES (?, ?, ?, ?)
            """,
            [
                (airport_ids[source], airport_ids[destination], distance, status)
                for source, destination, distance, status in routes
            ],
        )
    db.commit()
    db.close()
