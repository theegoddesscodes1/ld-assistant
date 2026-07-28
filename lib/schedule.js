// Single source of truth for the weekly rhythm and workout split.
// dayIndex: 0=Sun ... 6=Sat.

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const RHYTHM = [
  { focus: "Open", detail: "No fixed task today — rest, or catch up on whatever slipped." },
  { focus: "Numbers & Plan", detail: "Check the weekend's sales and traffic. Set this week's one priority." },
  { focus: "Content", detail: "Draft two or three social posts." },
  { focus: "Research", detail: "Your trend digest lands today — review it and log any ideas." },
  { focus: "Community", detail: "Replies, reviews, comments — the unglamorous stuff that compounds." },
  { focus: "Product Dev", detail: "Work the next drop." },
  { focus: "Velvet Circle Dev", detail: "Pick up the next feature in progress — check the Velvet Circle page for where you left off." },
];

export const WORKOUT = [
  { focus: "Rest", exercises: [] },
  {
    focus: "Glutes",
    exercises: [
      { name: "Hip Thrusts", sets: "4 x 10-12" },
      { name: "Romanian Deadlifts", sets: "3 x 8-10" },
      { name: "Bulgarian Split Squats", sets: "3 x 10-12 / leg" },
      { name: "Cable or Band Kickbacks", sets: "3 x 12-15" },
      { name: "Walking Lunges", sets: "3 x 12 / leg" },
    ],
  },
  {
    focus: "Core",
    exercises: [
      { name: "Plank", sets: "3 x 30-60 sec" },
      { name: "Dead Bug", sets: "3 x 10-12 / side" },
      { name: "Bicycle Crunches", sets: "3 x 15-20" },
      { name: "Russian Twists", sets: "3 x 15-20" },
      { name: "Hollow Body Hold", sets: "3 x 20-30 sec" },
    ],
  },
  { focus: "Rest / Active Recovery", exercises: [] },
  {
    focus: "Glutes",
    exercises: [
      { name: "Hip Thrusts", sets: "4 x 10-12" },
      { name: "Romanian Deadlifts", sets: "3 x 8-10" },
      { name: "Bulgarian Split Squats", sets: "3 x 10-12 / leg" },
      { name: "Cable or Band Kickbacks", sets: "3 x 12-15" },
      { name: "Walking Lunges", sets: "3 x 12 / leg" },
    ],
  },
  {
    focus: "Core",
    exercises: [
      { name: "Plank", sets: "3 x 30-60 sec" },
      { name: "Dead Bug", sets: "3 x 10-12 / side" },
      { name: "Bicycle Crunches", sets: "3 x 15-20" },
      { name: "Russian Twists", sets: "3 x 15-20" },
      { name: "Hollow Body Hold", sets: "3 x 20-30 sec" },
    ],
  },
  {
    focus: "Optional Full Body / Walk",
    exercises: [
      { name: "Brisk Walk", sets: "20-30 min" },
      { name: "Squats", sets: "3 x 12" },
      { name: "Push-Ups", sets: "3 x 8-12" },
      { name: "Plank", sets: "2 x 45 sec" },
    ],
  },
];

export function todayKey(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}