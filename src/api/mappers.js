// Traduce entre el camelCase de la app y el snake_case de Postgres.
// Tener esto en UN solo lugar es lo que evita el bug original:
// campos que la app usaba (measures, stepsHistory...) y que el guardado olvidaba.

export const clientFromDb = (r) => ({
  id: r.id,
  coachId: r.coach_id,
  name: r.name ?? '',
  email: r.email ?? '',
  phone: r.phone ?? '',
  age: r.age,
  height: r.height,
  occupation: r.occupation ?? '',
  goal: r.goal ?? '',
  status: r.status ?? 'active',
  plan: r.plan,
  startDate: r.start_date,
  endDate: r.end_date,
  welcomeVideoUrl: r.welcome_video_url ?? '',
  avatar: r.avatar ?? null,
  routine: r.routine ?? null,
  diet: r.diet ?? null,
  calendarTasks: r.calendar_tasks ?? {},
  questionnaires: r.questionnaires ?? [],
  responses: r.responses ?? [],
  loadRecords: r.load_records ?? [],
  measures: r.measures ?? [],
  stepsHistory: r.steps_history ?? [],
  sessions: r.sessions ?? {},
  foodPhotos: r.food_photos ?? {},
  achievements: r.achievements ?? [],
})

export const clientToDb = (c) => ({
  id: c.id,
  coach_id: c.coachId,
  name: c.name ?? '',
  email: c.email ?? '',
  phone: c.phone ?? '',
  age: c.age ?? null,
  height: c.height ?? null,
  occupation: c.occupation ?? '',
  goal: c.goal ?? '',
  status: c.status ?? 'active',
  plan: c.plan ?? null,
  start_date: c.startDate ?? null,
  end_date: c.endDate ?? null,
  welcome_video_url: c.welcomeVideoUrl ?? '',
  avatar: c.avatar ?? null,
  routine: c.routine ?? null,
  diet: c.diet ?? null,
  calendar_tasks: c.calendarTasks ?? {},
  questionnaires: c.questionnaires ?? [],
  responses: c.responses ?? [],
  load_records: c.loadRecords ?? [],
  measures: c.measures ?? [],
  steps_history: c.stepsHistory ?? [],
  sessions: c.sessions ?? {},
  food_photos: c.foodPhotos ?? {},
  achievements: c.achievements ?? [],
})

export const programFromDb = (r) => ({ id: r.id, coachId: r.coach_id, name: r.name, days: r.days ?? [] })
export const programToDb = (p, coachId) => ({ id: p.id, coach_id: coachId, name: p.name, days: p.days ?? [] })

export const dietPlanFromDb = (r) => ({ id: r.id, coachId: r.coach_id, name: r.name, macros: r.macros ?? {}, meals: r.meals ?? [] })
export const dietPlanToDb = (d, coachId) => ({ id: d.id, coach_id: coachId, name: d.name, macros: d.macros ?? {}, meals: d.meals ?? [] })

export const questionnaireFromDb = (r) => ({ id: r.id, coachId: r.coach_id, title: r.title, questions: r.questions ?? [] })
export const questionnaireToDb = (q, coachId) => ({ id: q.id, coach_id: coachId, title: q.title, questions: q.questions ?? [] })

export const foodFromDb = (r) => ({
  id: r.id, coachId: r.coach_id, name: r.name, category: r.category ?? '', unit: r.unit ?? '',
  portionG: r.portion_g, defaultQty: r.default_qty ?? 1,
  kcal: r.kcal ?? 0, protein: r.protein ?? 0, carbs: r.carbs ?? 0, fat: r.fat ?? 0,
})
export const foodToDb = (f, coachId) => ({
  id: f.id, coach_id: coachId, name: f.name, category: f.category ?? '', unit: f.unit ?? '',
  portion_g: f.portionG ?? null, default_qty: f.defaultQty ?? 1,
  // Regla del PDF: las kcal se derivan de los macros, no se capturan a mano.
  kcal: kcalFromMacros(f), protein: f.protein ?? 0, carbs: f.carbs ?? 0, fat: f.fat ?? 0,
})

/** P×4 + C×4 + G×9 — fuente única de verdad para las calorías. */
export const kcalFromMacros = ({ protein = 0, carbs = 0, fat = 0 }) =>
  Math.round(Number(protein) * 4 + Number(carbs) * 4 + Number(fat) * 9)

export const recipeFromDb = (r) => ({
  id: r.id, coachId: r.coach_id, title: r.title, mealTime: r.meal_time ?? '',
  difficulty: r.difficulty ?? '', tags: r.tags ?? [], imageUrl: r.image_url,
  ingredients: r.ingredients ?? [], steps: r.steps ?? [], macros: r.macros ?? {}, author: r.author ?? '',
})
export const recipeToDb = (r, coachId) => ({
  id: r.id, coach_id: coachId, title: r.title, meal_time: r.mealTime ?? '',
  difficulty: r.difficulty ?? '', tags: r.tags ?? [], image_url: r.imageUrl ?? null,
  ingredients: r.ingredients ?? [], steps: r.steps ?? [], macros: r.macros ?? {}, author: r.author ?? '',
})

export const documentFromDb = (r) => ({
  id: r.id, coachId: r.coach_id, clientId: r.client_id, title: r.title,
  category: r.category ?? '', description: r.description ?? '',
  storagePath: r.storage_path, fileName: r.file_name, fileSize: r.file_size,
  createdAt: r.created_at,
})

export const exerciseFromDb = (r) => ({
  id: r.id, coachId: r.coach_id, name: r.name, category: r.category ?? '', videoUrl: r.video_url,
})
