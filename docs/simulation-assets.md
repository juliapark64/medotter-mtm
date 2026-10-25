# Microsimulation artwork

These illustrative pixel-art assets were generated with the built-in image generation tool on October 25, 2026, using the user's two-floor clinic image as a visual reference. They depict fictional rooms and a generic synthetic-patient avatar, not observed patient characteristics. All identifiers, decisions, controls, and results are rendered by the application, not baked into the art.

- Room atlas: [`src/assets/simulation/physician-pharmacy-rooms.png`](../src/assets/simulation/physician-pharmacy-rooms.png). Two equal-height room strips; the top is the physician room and the bottom is the pharmacy. CSS selects each half without altering the original image.
- Transparent avatar: [`src/assets/simulation/synthetic-patient.png`](../src/assets/simulation/synthetic-patient.png). The same decorative avatar accompanies each paired synthetic ID; it does not assign an age, sex, ethnicity, or clinical profile to the modeled record.

Prompt specifications used:

1. **Rooms:** Use the supplied pixel-art clinic reference as style/composition guidance. Create two equal-height room strips stacked in an overall 3:2 image, each room 3:1. Top: physician consultation room with physician on the right. Bottom: recognizable pharmacy with medicine shelves and a dispensing counter, pharmacist on the right. Keep staff around 78% of room width with feet near 90% of room height. Leave a clear walkway on the left and center for a separately animated patient. Crisp muted pixel art. No UI, text, stars, portrait panels, or patient sprites.
2. **Patient:** One full-body adult in a three-quarter view facing right, casual teal shirt and dark trousers, medium warm skin, short dark hair, neutral standing pose, matching the reference's pixel style. True transparent background. No letters, frame, or ground shadow.

Generation mode: built-in image tool, not the fallback CLI. The room reference was used for the scene transformation; the avatar was generated with transparency. Final assets are copied into the repository and imported by the simulation page.
