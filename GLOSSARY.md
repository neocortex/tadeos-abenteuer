# Tadeos Abenteuer

The adventure on the island: what the story is made of, in the words the code should use.

## Language

**Quest**:
One of the twelve steps of the story, in a fixed order.
_Avoid_: Stage, level, chapter

**Milestone**:
The number of the current quest, and the value a save keeps.
_Avoid_: Using it as a word for the quest itself

**Challenge**:
A scene the player plays and wins, away from the walkable island. A quest may have one.
_Avoid_: Minigame, level

**Side game**:
A villager's optional challenge that is not part of the story and earns a prize hat.
_Avoid_: Bonus level

**Gate**:
The place on the island where a quest's challenge starts.
_Avoid_: Entrance, trigger

**Stage**:
A challenge's own set: what stands in that scene.
_Avoid_: Using it for the island or for a quest

**Director**:
The module that decides what the camera shows and who is in shot.
_Avoid_: Stage, camera manager

**Quest flow**:
The way a quest is arrived at, played and completed, whichever way the game was started.
_Avoid_: Progression, story manager

**Probe**:
The game's interface for E2E tests: what a test may read and do.
_Avoid_: Test hook, backdoor
