// Single source of truth for the weekly rhythm, workout split, and
// exactly when push reminders should fire. dayIndex: 0=Sun ... 6=Sat.

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

// Reminder table: (dayIndex, hour, minute) -> push notification payload.
// Times are evaluated in the TIMEZONE env var (default America/New_York).
// The cron route matches the current slot against this table, so adding
// or moving a reminder only means editing this array.
export const REMINDERS = [
  { day: 1, hour: 8, minute: 30, title: "Numbers & Plan", body: "Check weekend sales & traffic. Set this week's one priority." },
  { day: 2, hour: 8, minute: 30, title: "Content Day", body: "Draft 2-3 social posts." },
  { day: 3, hour: 8, minute: 30, title: "Research Day", body: "Your trend digest is ready to review." },
  { day: 4, hour: 8, minute: 30, title: "Community Day", body: "Replies, reviews, comments." },
  { day: 5, hour: 8, minute: 30, title: "Product Dev Day", body: "Work the next drop." },
  { day: 1, hour: 17, minute: 30, title: "Workout — Glutes", body: "Hip thrusts, RDLs, split squats, kickbacks, walking lunges." },
  { day: 2, hour: 17, minute: 30, title: "Workout — Core", body: "Plank, dead bug, bicycle crunches, Russian twists, hollow hold." },
  { day: 4, hour: 17, minute: 30, title: "Workout — Glutes", body: "Hip thrusts, RDLs, split squats, kickbacks, walking lunges." },
  { day: 5, hour: 17, minute: 30, title: "Workout — Core", body: "Plank, dead bug, bicycle crunches, Russian twists, hollow hold." },
  { day: 6, hour: 10, minute: 0, title: "Velvet Circle Dev", body: "Pick up the next feature in progress." },
];

export function todayKey(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
