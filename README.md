# ✈️ Air Traffic Control System Using Prim's Algorithm

## 1. Introduction

The Air Traffic Control System is a Python-based mini-project developed using Prim's Algorithm.

The project represents airports as nodes and flight routes as edges in a graph. It finds the Minimum Spanning Tree (MST) to connect all airports with minimum total distance.

## 2. Objectives

- To understand Graph Theory.
- To implement Prim's Algorithm.
- To find the minimum-distance airport network.
- To understand Minimum Spanning Tree (MST).
- To display airport routes and their distances.

## 3. Features

- Display airport information.
- Display available flight routes.
- Calculate minimum-distance connections.
- Apply Prim's Algorithm.
- Display optimized routes.
- Calculate total minimum distance.
- Simple and user-friendly dashboard.

## 4. Technologies Used

| Technology | Purpose |
|---|---|
| Python | Backend programming |
| Flask | Web application |
| HTML | Frontend structure |
| CSS | Frontend design |
| JavaScript | Frontend interaction |
| SQLite | Database |
| Prim's Algorithm | Route optimization |

## 5. Algorithm Used

**Prim's Algorithm**

Prim's Algorithm is a greedy algorithm used to find the Minimum Spanning Tree of a connected, weighted graph.

It selects the minimum-weight edges while connecting all vertices without creating cycles.

### Working Steps

1. Select a starting airport.
2. Mark it as visited.
3. Find the minimum-distance connection to an unvisited airport.
4. Add the selected connection to the network.
5. Repeat until all airports are connected.
6. Calculate the total minimum distance.

## 6. Sample Airports

- Delhi (DEL)
- Mumbai (BOM)
- Chennai (MAA)
- Kolkata (CCU)
- Bengaluru (BLR)

## 7. Installation and Execution

### Step 1: Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

### Step 2: Open the project folder

```bash
cd AirTrafficControl
```

### Step 3: Install dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Run the application

```bash
python app.py
```

### Step 5: Open in browser

```text
http://127.0.0.1:5000/
```

## 8. Expected Result

The application displays airport information, available flight routes, and the optimized airport network using Prim's Algorithm.

It calculates the minimum total distance required to connect all airports in the network.

## 9. Applications

- Airport network planning.
- Transportation network optimization.
- Graph-based route planning.
- Network connectivity analysis.

## 10. Future Enhancements

- Interactive airport maps.
- Weather information.
- Flight delay prediction.
- Airport capacity optimization.
- Improved route visualization.

## 11. Conclusion

The Air Traffic Control System demonstrates the practical implementation of Graph Theory and Prim's Algorithm using Python.

The project helps understand how minimum spanning tree algorithms can optimize connections in transportation networks.

---

**Project Type:** DAA Mini Project  
**Algorithm:** Prim's Algorithm  
**Language:** Python
