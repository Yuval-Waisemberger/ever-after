import type { ActionState } from "@/lib/actions/state";
export async function saveBudgetItem(): Promise<ActionState> { return { status: "success", message: "Fixture expense saved." }; }
export async function setTotalBudget(): Promise<ActionState> { return { status: "success", message: "Fixture budget saved." }; }
export async function savePayment(): Promise<ActionState> { return { status: "error", message: "The payment could not be saved. Refresh the budget and review its active commitment." }; }
