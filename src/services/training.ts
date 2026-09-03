/**
 * File: src/services/training.ts
 * Training module: training types, trainers, trainings, and the nested
 * training tasks + feedbacks.
 */

import { createResourceHooks } from "@/hooks/useResource";
import type { Entity } from "@/lib/api/types";
import {
  makeResource,
  getList,
  getOne,
  postJson,
  patchJson,
  deleteJson,
  type ResourcePaths,
} from "./_http";

const BASE = "/training";

function crudPaths(entity: string): ResourcePaths {
  const root = `${BASE}/${entity}`;
  return {
    list: `${root}/all`,
    single: (id) => `${root}/single/${id}`,
    create: `${root}/create`,
    update: (id) => `${root}/edit/${id}`,
    remove: (id) => `${root}/delete/${id}`,
    updateMethod: "patch",
  };
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TrainingType extends Entity {
  name: string;
  description?: string;
  branch_id?: string | { _id?: string; branch_name?: string };
  department_id?: string | { _id?: string; department_name?: string };
}

export interface Trainer extends Entity {
  name: string;
  contact?: string;
  email?: string;
  experience?: string;
  branch_id?: string | { _id?: string; branch_name?: string };
  department_id?: string | { _id?: string; department_name?: string };
  expertise?: string;
  qualification?: string;
}

export type TrainingStatus = "scheduled" | "ongoing" | "completed" | "cancelled";

export interface Training extends Entity {
  title: string;
  description?: string;
  training_type_id?: string | { _id?: string; name?: string };
  trainer_id?: string | { _id?: string; name?: string };
  branch_id?: string | { _id?: string; branch_name?: string };
  department_id?: string | { _id?: string; department_name?: string };
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  max_participants?: number;
  cost?: number;
  status: TrainingStatus;
}

export interface TrainingTask extends Entity {
  training_id?: string;
  title: string;
  description?: string;
  due_date?: string;
  assigned_to?: string | { _id?: string; name?: string };
  status?: "pending" | "completed" | string;
}

export interface TrainingFeedback extends Entity {
  task_id?: string;
  rating: number;
  comments?: string;
}

// ─── Services + hooks ───────────────────────────────────────────────────────

export const trainingTypesService = makeResource<TrainingType>(crudPaths("training-types"));
export const trainersService = makeResource<Trainer>(crudPaths("trainers"));
export const trainingsService = makeResource<Training>(crudPaths("trainings"));

export const trainingTypeHooks = createResourceHooks("training-types", trainingTypesService);
export const trainerHooks = createResourceHooks("trainers", trainersService);
export const trainingHooks = createResourceHooks("trainings", trainingsService);

// ─── Nested training tasks ──────────────────────────────────────────────────

export const trainingTasks = {
  listByTraining: (trainingId: string, params?: { page?: number; limit?: number }) =>
    getList<TrainingTask>(`${BASE}/trainings/${trainingId}/tasks/all`, params),
  create: (trainingId: string, body: Partial<TrainingTask>) =>
    postJson<TrainingTask>(`${BASE}/trainings/${trainingId}/tasks/create`, body),
  single: (taskId: string) => getOne<TrainingTask>(`${BASE}/tasks/single/${taskId}`),
  edit: (taskId: string, body: Partial<TrainingTask>) =>
    patchJson<TrainingTask>(`${BASE}/tasks/edit/${taskId}`, body),
  complete: (taskId: string) => patchJson(`${BASE}/tasks/complete/${taskId}`),
  remove: (taskId: string) => deleteJson(`${BASE}/tasks/delete/${taskId}`),
};

// ─── Nested task feedbacks ──────────────────────────────────────────────────

export const trainingFeedbacks = {
  listByTask: (taskId: string, params?: { page?: number; limit?: number }) =>
    getList<TrainingFeedback>(`${BASE}/tasks/${taskId}/feedbacks/all`, params),
  create: (taskId: string, body: { rating: number; comments?: string }) =>
    postJson<TrainingFeedback>(`${BASE}/tasks/${taskId}/feedbacks/create`, body),
};
