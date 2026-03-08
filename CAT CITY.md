CAT CITY
Core Game Design Document (MVP)

Version: 0.1
Author: Initial Concept Draft
Scope: Single-player frontend MVP with extensibility for future online features


--------------------------------------------------
1. GAME OVERVIEW
--------------------------------------------------

Cat City is a lightweight strategy simulation game designed primarily for web and mobile browsers. 
The player designs a small city layout for cats by placing a limited number of interactive objects 
before the simulation begins. After placement, the simulation runs automatically and the player 
observes how cats move through the environment.

The goal of the player is to create efficient behavioral loops where cats repeatedly satisfy their 
needs with minimal wasted movement. Good layouts create natural paths and cycles that maximize 
cat happiness and score.

The game is intentionally designed with extremely simple rules but deep emergent strategy.

Core design philosophy:

- Simple mechanics
- Emergent complexity through spatial layout
- Short sessions (3–5 minutes)
- Minimal player actions during simulation
- Highly observable system behavior


--------------------------------------------------
2. CORE GAME LOOP
--------------------------------------------------

1. Player enters build phase.
2. Player places a limited number of facilities on a small grid map.
3. Player starts simulation.
4. Cats spawn gradually and move through the city automatically.
5. Cats interact with facilities to satisfy needs.
6. Efficient layouts produce repeated need-satisfaction loops.
7. Simulation ends after a fixed duration.
8. Final score and statistics are displayed.


--------------------------------------------------
3. MAP STRUCTURE
--------------------------------------------------

Map type:
Grid-based.

Recommended MVP size:
7 x 7 tiles.

Each tile may contain:
- One facility
- Empty space
- A cat passing through

Cats can move in four directions (up, down, left, right).

Movement is tile-based.


--------------------------------------------------
4. FACILITIES (MVP SET)
--------------------------------------------------

The MVP version uses only four facility types.

1. Fish Bowl
2. Cat Bed
3. Laser Pointer
4. Cardboard Tunnel

These are sufficient to create meaningful route planning and strategy.


--------------------------------------------------
4.1 Fish Bowl
--------------------------------------------------

Purpose:
Satisfies cat hunger.

Behavior:
- Cat stops and eats.
- Eating clears hunger value.
- Cat gains points.

Rules:
- Only one cat can use a fish bowl at a time.
- Other cats may wait nearby for a limited time.


--------------------------------------------------
4.2 Cat Bed
--------------------------------------------------

Purpose:
Satisfies cat sleepiness.

Behavior:
- Cat stops and sleeps.
- Sleep clears sleepiness value.
- Cat gains points.

Rules:
- Only one cat can use a bed at a time.
- Waiting cats may queue briefly.


--------------------------------------------------
4.3 Laser Pointer
--------------------------------------------------

Purpose:
Controls directional movement of cats.

Placement:
When placed, the player selects a direction:
UP / DOWN / LEFT / RIGHT

Behavior:
When a cat enters the tile with a laser pointer:
- The cat tends to follow the direction of the laser.

Laser influence:
- Strong guidance but not absolute.
- If following the laser would cause extreme detours, cats may ignore it.

Design purpose:
Laser pointers allow players to guide traffic flow and create routes.


--------------------------------------------------
4.4 Cardboard Tunnel
--------------------------------------------------

Purpose:
Teleportation shortcut between two points.

Placement:
Tunnels are placed in pairs.

Behavior:
- Cat entering one tunnel exits from the paired tunnel.
- Exit direction is the tile immediately adjacent to the exit.

Rules:
- Short cooldown prevents infinite loop bouncing.
- Tunnels allow creation of compact travel loops.


--------------------------------------------------
5. CAT BEHAVIOR SYSTEM
--------------------------------------------------

Cats operate using a simple needs-based decision system.

Each cat tracks two needs:

- Hunger
- Sleepiness

Needs increase over time.

When a need exceeds a threshold, the cat searches for a facility to satisfy that need.


--------------------------------------------------
5.1 Cat Needs
--------------------------------------------------

Hunger
Sleepiness

Values increase gradually during the simulation.

When a need exceeds a threshold:
the cat seeks the appropriate facility.


--------------------------------------------------
5.2 Cat Decision Logic
--------------------------------------------------

Priority order:

1. If hunger is high → seek Fish Bowl
2. If sleepiness is high → seek Cat Bed
3. Otherwise → wander or follow nearby guidance (laser)

Cats select targets based on:

- shortest path
- facility availability
- queue length
- potential loop opportunity
- laser guidance


--------------------------------------------------
6. CORE STRATEGY MECHANIC: NEED LOOPS
--------------------------------------------------

The most important mechanic in Cat City is the "Need Loop".

If a cat satisfies two different needs within a short time window,
the cat receives a bonus.

Example loop:

Eat → Sleep
Sleep → Eat

If this happens quickly enough, the cat triggers a loop bonus.

Loop bonuses greatly increase score.

Well-designed layouts allow cats to repeatedly cycle between
fish bowls and beds.


--------------------------------------------------
7. LOOP BONUS SYSTEM
--------------------------------------------------

Loop Definition:

A loop occurs when:

- Cat satisfies need A
- Then satisfies need B within a short time window.

Example:

Fish Bowl → Cat Bed
or
Cat Bed → Fish Bowl

Loop bonuses increase score significantly.

Repeated loops without interruption may generate larger bonuses.


--------------------------------------------------
8. CAT MOVEMENT
--------------------------------------------------

Cats move tile-by-tile.

Movement behavior:

- Seek facility when need threshold is reached
- Follow shortest path
- May be influenced by laser pointers
- May teleport through tunnels

If a facility is busy:
- cat may wait briefly
- cat may choose a different facility


--------------------------------------------------
9. SPAWNING SYSTEM
--------------------------------------------------

Cats spawn gradually during the simulation.

Spawn behavior:

- Spawn locations are randomly selected from map edges
- Cats enter the map and begin wandering

Total cats per match:
Small number (example: 8–12).

This ensures simulation remains readable.


--------------------------------------------------
10. SCORING SYSTEM
--------------------------------------------------

Points are gained from:

- satisfying needs
- completing loops
- repeated loop chains
- efficient movement
- intelligent tunnel usage

Score categories include:

Basic actions
Loop bonuses
Efficiency bonuses


--------------------------------------------------
11. SIMULATION LENGTH
--------------------------------------------------

Typical match duration:

180 seconds (3 minutes)

Simulation speed options:

1x
2x
4x
8x


--------------------------------------------------
12. PLAYER PHASES
--------------------------------------------------

Build Phase
Player places facilities.

Simulation Phase
Game runs automatically.

Result Phase
Score summary shown.


--------------------------------------------------
13. USER INTERFACE FEATURES
--------------------------------------------------

Build Interface
- drag-and-place facilities
- rotate laser direction
- place tunnel pairs

Simulation Interface
- time remaining
- current score
- simulation speed controls

Result Interface
- total score
- loops completed
- best cat performance
- efficiency statistics


--------------------------------------------------
14. VISUALIZATION
--------------------------------------------------

Cats move across the grid.

Facilities have simple visual identities.

Optional visual indicators:

- loop triggers
- path heatmaps
- tunnel travel animation
- laser direction arrows


--------------------------------------------------
15. FUTURE EXPANSION OPTIONS
--------------------------------------------------

The system is intentionally designed to support easy expansion.

Possible future additions:

New facilities
- Yarn Toy
- Cat Tree
- Catnip Patch
- Fountain

New needs
- Play
- Social

Cat personality types
- Lazy cat
- Hyper cat
- Explorer cat

New environmental mechanics
- district bonuses
- attraction zones

Online features
- asynchronous city sharing
- ghost layouts
- shared cat visitors
- leaderboards


--------------------------------------------------
16. NETWORK EXTENSIBILITY (FUTURE)
--------------------------------------------------

Although the MVP is a static frontend application,
the architecture should leave space for optional backend services.

Possible API endpoints:

POST /game/start
POST /game/result
GET /leaderboard
GET /daily-map
POST /ghost-layout

Future multiplayer features may include:

- daily challenge layouts
- ghost city simulations
- player score comparison
- community puzzle maps


--------------------------------------------------
17. DESIGN PRINCIPLES
--------------------------------------------------

Cat City follows several strict design principles:

1. Mechanics must remain simple.
2. Strategy must come from spatial layout.
3. Player input should be minimal during simulation.
4. Observing the system should be enjoyable.
5. Each match should be short and replayable.


--------------------------------------------------
18. SUMMARY
--------------------------------------------------

Cat City is a minimalist strategy simulation where the player
builds an automated cat city that runs itself.

By placing only a few simple facilities, players attempt to create
efficient loops that allow cats to repeatedly satisfy needs and
generate score.

The game focuses on:

- layout strategy
- movement routing
- emergent system behavior

The MVP version intentionally limits mechanics to four facilities,
allowing players to quickly understand the system while still
discovering surprisingly deep optimization strategies.
