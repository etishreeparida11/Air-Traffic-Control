"""Prim's minimum spanning tree implementation using Python's heapq."""

import heapq


def prim_mst(airports, routes, start_id):
    """Build the reachable minimum spanning tree from start_id.

    Restricted routes are excluded. The return value also reports unreachable
    airport IDs so the API can clearly identify a disconnected network.
    """
    airport_ids = {airport["id"] for airport in airports}
    if start_id not in airport_ids:
        raise ValueError("Starting airport does not exist.")

    # Store every available route in both directions.
    adjacency = {airport_id: [] for airport_id in airport_ids}
    for route in routes:
        if route["status"] != "Available":
            continue
        source = route["source_id"]
        destination = route["destination_id"]
        adjacency[source].append((route["distance"], destination, route))
        adjacency[destination].append((route["distance"], source, route))

    visited = {start_id}
    queue = []
    # The heap gives us the shortest route to check next.
    for distance, neighbor, route in adjacency[start_id]:
        heapq.heappush(queue, (distance, route["id"], neighbor, route))

    selected_routes = []
    total_distance = 0
    while queue and len(visited) < len(airport_ids):
        distance, _route_id, destination, route = heapq.heappop(queue)
        if destination in visited:
            continue
        # Add each new airport using its shortest available connection.
        visited.add(destination)
        selected_routes.append(route)
        total_distance += distance
        for edge_distance, neighbor, edge in adjacency[destination]:
            if neighbor not in visited:
                heapq.heappush(
                    queue, (edge_distance, edge["id"], neighbor, edge)
                )

    return {
        "connected": len(visited) == len(airport_ids),
        "routes": selected_routes,
        "total_distance": total_distance,
        "connected_airports": len(visited),
        "unreachable_airports": sorted(airport_ids - visited),
    }
