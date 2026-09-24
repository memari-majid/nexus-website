/**
 * Forward Deployed Engineers — a Nexus service line alongside consulting and
 * NVIDIA DLI training. Nexus both TRAINS FDEs and PROVIDES them to customers.
 *
 * Keep the framing honest: an FDE builds a custom solution with the client;
 * it is not a staffing-agency body-shop pitch and not the same as a workshop.
 */

export const FDE = {
  label: "Forward Deployed Engineers",
  short: "FDE",
  tagline: "We don't just train your team. We can embed an engineer to build the solution.",
  what:
    "A Forward Deployed Engineer works on your front line, inside your environment, to build the custom AI solution your problem actually needs, not a generic product. The name comes from military forward-deployed units: a core team sets strategy and builds the base capability, and forward-deployed engineers take it to the field and execute.",
  offering:
    "Nexus both trains Forward Deployed Engineers and provides them. We place an engineer with your team to design the right solution, prove it with a working prototype so people trust it, and support the move from prototype to production, feeding what we learn on the ground back into the build.",
  whenItFits: [
    "Off-the-shelf AI does not fit your workflow and you need something custom.",
    "The models perform well but your team is hesitant to adopt them.",
    "You need a solution taken from idea to a prototype to production, with someone accountable on-site.",
  ],
  vsTraining:
    "Training upskills your team on the NVIDIA DLI curriculum; an FDE engagement builds and ships a custom solution with you. Many customers do both: train the team, then embed an engineer to deliver.",
  originNote:
    "Popularized by Palantir and OpenAI for exactly this: custom AI solutions built at the customer's side that earn real adoption.",
} as const;
