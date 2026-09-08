/**
 * File: src/services/performance.ts
 * Performance module: indicators, indicator categories, goal types,
 * employee goals, review cycles, employee reviews (+ conduct flow).
 *
 * Convention for every entity:
 *   GET    /x/all            list
 *   GET    /x/single/:id     detail
 *   POST   /x/create         create
 *   PATCH  /x/edit/:id       update
 *   DELETE /x/delete/:id     delete
 */

import { createResourceHooks } from "@/hooks/useResource";
import type { Entity } from "@/lib/api/types";
import { makeResource, getOne, postJson, type ResourcePaths } from "./_http";

const BASE = "/performance";

/** Build the `/all /single /create /edit /delete` path set for an entity. */
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

export type ActiveStatus = "active" | "inactive";

export interface IndicatorCategory extends Entity {
  name: string;
  description?: string;
  status: ActiveStatus;
}

export interface PerformanceIndicator extends Entity {
  category_id: string | { _id?: string; name?: string };
  name: string;
  description?: string;
  measurement_unit?: string;
  target_value?: string;
  status: ActiveStatus;
}

export interface GoalType extends Entity {
  name: string;
  description?: string;
  status: ActiveStatus;
}

export type GoalProgressStatus = "not_started" | "in_progress" | "completed" | "overdue";

export interface EmployeeGoal extends Entity {
  employee_id: string | { _id?: string; name?: string };
  goal_type_id: string | { _id?: string; name?: string };
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  target?: string;
  progress?: number;
  status: GoalProgressStatus;
}

export type ReviewFrequency = "monthly" | "quarterly" | "semi-annual" | "annual";

export interface ReviewCycle extends Entity {
  name: string;
  frequency: ReviewFrequency;
  description?: string;
  status: ActiveStatus;
}

export type ReviewStatus = "pending" | "in_progress" | "completed";

export interface EmployeeReview extends Entity {
  employee_user_id: string | { _id?: string; name?: string };
  reviewer_id: string | { _id?: string; name?: string };
  review_cycle_id: string | { _id?: string; name?: string };
  review_date: string;
  status: ReviewStatus;
  pros?: string;
  cons?: string;
  ratings?: Record<string, number>;
}

// ─── Services ───────────────────────────────────────────────────────────────

export const indicatorCategoriesService = makeResource<IndicatorCategory>(crudPaths("indicator-categories"));
export const indicatorsService = makeResource<PerformanceIndicator>(crudPaths("indicators"));
export const goalTypesService = makeResource<GoalType>(crudPaths("goal-types"));
export const employeeGoalsService = makeResource<EmployeeGoal>(crudPaths("employee-goals"));
export const reviewCyclesService = makeResource<ReviewCycle>(crudPaths("review-cycles"));
export const employeeReviewsService = makeResource<EmployeeReview>(crudPaths("employee-reviews"));

// ─── Hooks ──────────────────────────────────────────────────────────────────

export const indicatorCategoryHooks = createResourceHooks("perf-indicator-categories", indicatorCategoriesService);
export const indicatorHooks = createResourceHooks("perf-indicators", indicatorsService);
export const goalTypeHooks = createResourceHooks("perf-goal-types", goalTypesService);
export const employeeGoalHooks = createResourceHooks("perf-employee-goals", employeeGoalsService);
export const reviewCycleHooks = createResourceHooks("perf-review-cycles", reviewCyclesService);
export const employeeReviewHooks = createResourceHooks("perf-employee-reviews", employeeReviewsService);

// ─── Employee review conduct flow ───────────────────────────────────────────

export const employeeReviewActions = {
  /** GET the conduct form (indicators to rate for this review). */
  getConductForm: (id: string) => getOne(`${BASE}/employee-reviews/conduct/${id}`),
  /** POST the submitted ratings + pros/cons. */
  submitRatings: (id: string, body: { ratings: Record<string, number>; pros?: string; cons?: string }) =>
    postJson(`${BASE}/employee-reviews/conduct/${id}`, body),
};
