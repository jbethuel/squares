# Habits hold Active Spans, so Archiving can be undone

Archiving is a toggle on a Habit's own Screen rather than a two-tap confirmation on a screen of its own, and a toggle that only travels one way is a lie as a control. A Habit therefore stores a list of Active Spans — `{from, to}`, half-open, so the Day in `to` is the Day it was Archived and is not itself Active — instead of a `createdOn` and a nullable `archivedOn`. One pair of dates cannot describe a Habit that stopped and started again.

## Considered options

Moving `createdOn` forward on the way back in was cheaper and needed no migration, but it writes a first Day that is not true. Nothing reads that field today except the Active test, so the lie would sit undetected until something did.

A third field, `revivedOn`, survives exactly one cycle: Archive a second time and the first gap is overwritten. A toggle invites more than one cycle, which is what rules both of these out.

## Consequences

The stored record moves to `version: 2`. Files written by v1 are migrated on import into a single Span, `{from: createdOn, to: archivedOn}`. Refusing them was never an option — an Export is the only copy of the record that survives this app's storage being cleared, so a rejected file is a destroyed backup.

Taking a Habit out of the Archive never backdates it. The Days it spent Archived keep the Day Records that were sealed without it, and by ADR 0001 nothing rewrites those. The gap stays visible in the Heatmap forever. That is the honest outcome, not a defect for someone to fix later.
