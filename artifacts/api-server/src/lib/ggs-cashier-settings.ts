import { eq } from "drizzle-orm";
import { db, ggsCashierSettingsTable } from "@workspace/db";

export async function getGgsCashierSettings() {
  await db
    .insert(ggsCashierSettingsTable)
    .values({ id: 1 })
    .onConflictDoNothing();

  const [settings] = await db
    .select()
    .from(ggsCashierSettingsTable)
    .where(eq(ggsCashierSettingsTable.id, 1))
    .limit(1);

  if (!settings) {
    throw new Error("GGS cashier settings could not be initialized.");
  }

  return settings;
}
