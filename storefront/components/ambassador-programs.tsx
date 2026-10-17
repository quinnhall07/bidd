// Ambassador programs: brands fund a rep on each campus, Bidd matches students and pays out per piece sold.
// Demo seed content only: none of these are real deals.
export type Program = {
  id: string;
  brand: string;
  photo: string;
  pitch: string;
  perks: string[];
  payout_cents: number;
  spots: number;
  /** Drops the rep promotes; payout counts pieces sold through their code. */
  drops: string;
};

export const PROGRAMS: Program[] = [
  {
    id: "liquid-death",
    brand: "Liquid Death",
    photo: "/merch/liquid-death.jpg",
    pitch: "Rep the Philanthropy week drop. Host the tasting table at your chapter's event.",
    perks: ["Event kit for one philanthropy night", "Two pieces from the drop", "Your own drop code"],
    payout_cents: 500,
    spots: 3,
    drops: "Liquid Death × Philanthropy week",
  },
  {
    id: "white-fox",
    brand: "White Fox",
    photo: "/photos/pexels-5450671.jpg",
    pitch: "Style the Bid Day collab for your chapter and post the fit check on drop day.",
    perks: ["Early access to every campus drop", "Seasonal try-on box", "Your own drop code"],
    payout_cents: 400,
    spots: 2,
    drops: "White Fox × Bid Day",
  },
  {
    id: "porchlight",
    brand: "Porchlight Coffee",
    photo: "/photos/pexels-14641437.jpg",
    pitch: "Bring cold brew to finals-week study nights and promote the tote drop.",
    perks: ["Coffee for one chapter study night a month", "Tote and tee", "Your own drop code"],
    payout_cents: 300,
    spots: 4,
    drops: "Porchlight × Finals week",
  },
  {
    id: "field-day",
    brand: "Field Day Athletic",
    photo: "/photos/pexels-19895956.jpg",
    pitch: "Run the tailgate table for the big-game drop and hand out pieces at the Exchange Spot.",
    perks: ["Gameday tailgate kit", "Sideline-cut crewneck", "Your own drop code"],
    payout_cents: 600,
    spots: 2,
    drops: "Field Day × Gameday",
  },
];
