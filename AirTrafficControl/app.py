"""Flask application for the Air Traffic Control System mini-project."""

import os
import re
import sqlite3
from pathlib import Path

from flask import Flask, jsonify, render_template, request

from algorithm import prim_mst
from database import close_db, get_db, init_db


CODE_PATTERN = re.compile(r"^[A-Za-z0-9]{3,5}$")


def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        DATABASE=os.environ.get(
            "AIR_TRAFFIC_DATABASE", str(Path(app.instance_path) / "air_traffic.db")
        )
    )
    if test_config:
        app.config.update(test_config)

    Path(app.instance_path).mkdir(parents=True, exist_ok=True)
    app.teardown_appcontext(close_db)
    with app.app_context():
        init_db()

    @app.get("/")
    def dashboard():
        return render_template("index.html", page="dashboard")

    @app.get("/airports")
    def airport_page():
        return render_template("airports.html", page="airports")

    @app.get("/routes")
    def routes_page():
        return render_template("routes.html", page="routes")

    @app.get("/analytics")
    def analytics_page():
        return render_template("analytics.html", page="analytics")

    @app.get("/api/airports")
    def list_airports():
        rows = get_db().execute(
            "SELECT id, name, code, capacity, location FROM airports ORDER BY name"
        ).fetchall()
        return jsonify([dict(row) for row in rows])

    @app.post("/api/airports")
    def add_airport():
        data = request.get_json(silent=True) or {}
        name = str(data.get("name", "")).strip()
        code = str(data.get("code", "")).strip().upper()
        location = str(data.get("location", "")).strip()
        capacity = parse_positive_integer(data.get("capacity"))
        if not name or not location or not CODE_PATTERN.fullmatch(code) or capacity is None:
            return api_error(
                "Provide an airport name, a 3–5 character airport code, "
                "a location, and a positive whole-number capacity."
            )
        try:
            db = get_db()
            cursor = db.execute(
                "INSERT INTO airports (name, code, capacity, location) VALUES (?, ?, ?, ?)",
                (name, code, capacity, location),
            )
            db.commit()
        except sqlite3.IntegrityError:
            return api_error("That airport code is already in use.", 409)
        return jsonify({"id": cursor.lastrowid, "message": "Airport added."}), 201

    @app.delete("/api/airports/<int:airport_id>")
    def delete_airport(airport_id):
        db = get_db()
        cursor = db.execute("DELETE FROM airports WHERE id = ?", (airport_id,))
        db.commit()
        if cursor.rowcount == 0:
            return api_error("Airport not found.", 404)
        return jsonify({"message": "Airport deleted. Its routes were removed too."})

    @app.get("/api/routes")
    def list_routes():
        rows = get_db().execute(
            """
            SELECT r.id, r.source_id, r.destination_id, r.distance, r.status,
                   source.name AS source_name, source.code AS source_code,
                   destination.name AS destination_name,
                   destination.code AS destination_code
            FROM routes r
            JOIN airports source ON source.id = r.source_id
            JOIN airports destination ON destination.id = r.destination_id
            ORDER BY source.name, destination.name
            """
        ).fetchall()
        return jsonify([dict(row) for row in rows])

    @app.post("/api/routes")
    def add_route():
        data = request.get_json(silent=True) or {}
        source_id = parse_positive_integer(data.get("source_id"))
        destination_id = parse_positive_integer(data.get("destination_id"))
        distance = parse_positive_integer(data.get("distance"))
        status = str(data.get("status", "Available")).strip().title()
        if (
            source_id is None
            or destination_id is None
            or source_id == destination_id
            or distance is None
            or status not in {"Available", "Restricted"}
        ):
            return api_error(
                "Select two different airports and provide a positive distance and valid status."
            )
        db = get_db()
        airport_ids = {
            row["id"]
            for row in db.execute(
                "SELECT id FROM airports WHERE id IN (?, ?)",
                (source_id, destination_id),
            )
        }
        if airport_ids != {source_id, destination_id}:
            return api_error("Both selected airports must exist.", 404)
        duplicate = db.execute(
            """
            SELECT id FROM routes
            WHERE (source_id = ? AND destination_id = ?)
               OR (source_id = ? AND destination_id = ?)
            """,
            (source_id, destination_id, destination_id, source_id),
        ).fetchone()
        if duplicate:
            return api_error("A route between these airports already exists.", 409)
        cursor = db.execute(
            """
            INSERT INTO routes (source_id, destination_id, distance, status)
            VALUES (?, ?, ?, ?)
            """,
            (source_id, destination_id, distance, status),
        )
        db.commit()
        return jsonify({"id": cursor.lastrowid, "message": "Route added."}), 201

    @app.delete("/api/routes/<int:route_id>")
    def delete_route(route_id):
        db = get_db()
        cursor = db.execute("DELETE FROM routes WHERE id = ?", (route_id,))
        db.commit()
        if cursor.rowcount == 0:
            return api_error("Route not found.", 404)
        return jsonify({"message": "Route deleted."})

    @app.post("/api/optimize")
    def optimize():
        data = request.get_json(silent=True) or {}
        db = get_db()
        airports = [
            dict(row)
            for row in db.execute(
                "SELECT id, name, code FROM airports ORDER BY name"
            ).fetchall()
        ]
        if not airports:
            return api_error("Add at least one airport before optimizing.", 400)
        start_id = parse_positive_integer(data.get("start_id"))
        if start_id is None:
            return api_error("Select a valid starting airport.", 400)
        routes = [
            dict(row)
            for row in db.execute(
                """
                SELECT r.id, r.source_id, r.destination_id, r.distance, r.status,
                       source.name AS source_name, source.code AS source_code,
                       destination.name AS destination_name,
                       destination.code AS destination_code
                FROM routes r
                JOIN airports source ON source.id = r.source_id
                JOIN airports destination ON destination.id = r.destination_id
                """
            ).fetchall()
        ]
        try:
            result = prim_mst(airports, routes, start_id)
        except ValueError as error:
            return api_error(str(error), 400)
        response = {
            **result,
            "airports": airports,
            "start_id": start_id,
            "message": (
                "Optimal network calculated."
                if result["connected"]
                else "The available routes cannot connect every airport."
            ),
        }
        return jsonify(response), 200 if result["connected"] else 409

    @app.get("/api/statistics")
    def statistics():
        db = get_db()
        airport_count = db.execute("SELECT COUNT(*) FROM airports").fetchone()[0]
        available = db.execute(
            "SELECT COUNT(*) FROM routes WHERE status = 'Available'"
        ).fetchone()[0]
        restricted = db.execute(
            "SELECT COUNT(*) FROM routes WHERE status = 'Restricted'"
        ).fetchone()[0]
        airports = [
            dict(row)
            for row in db.execute(
                "SELECT id, name, code, capacity FROM airports ORDER BY name"
            ).fetchall()
        ]
        routes = [
            dict(row)
            for row in db.execute(
                """
                SELECT r.id, r.source_id, r.destination_id, r.distance, r.status,
                       source.name AS source_name, source.code AS source_code,
                       destination.name AS destination_name,
                       destination.code AS destination_code
                FROM routes r
                JOIN airports source ON source.id = r.source_id
                JOIN airports destination ON destination.id = r.destination_id
                ORDER BY r.distance
                """
            ).fetchall()
        ]
        if airports:
            network = prim_mst(airports, routes, airports[0]["id"])
        else:
            network = {
                "connected": False,
                "routes": [],
                "total_distance": 0,
                "connected_airports": 0,
            }
        return jsonify(
            {
                "total_airports": airport_count,
                "available_routes": available,
                "restricted_routes": restricted,
                "total_network_distance": (
                    network["total_distance"] if network["connected"] else None
                ),
                "connected_airports": network["connected_airports"],
                "network_connected": network["connected"],
                "airports": airports,
                "routes": routes,
            }
        )

    return app


def parse_positive_integer(value):
    """Return a positive integer or None for invalid form/API input."""
    if isinstance(value, bool):
        return None
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    return number if number > 0 and str(value).strip() == str(number) else None


def api_error(message, status=400):
    return jsonify({"error": message}), status


app = create_app()


if __name__ == "__main__":
    app.run()
