import { Resolution } from "@/lib/store/useFlowSheetStore";
import { format, addMinutes, startOfDay } from "date-fns";

export function calculateFluidBalance(
  data: Record<string, Record<string, string | number>>,
  endTime: Date
) {
  const start = startOfDay(endTime);
  let totalIntake = 0;
  let totalOutput = 0;

  // Parameters that count as Intake
  const intakeParams = ["infus_1", "syring_1"];
  // Parameters that count as Output
  const outputParams = ["urine"];

  // Loop through every minute of the day up to endTime
  for (let d = start; d <= endTime; d = addMinutes(d, 1)) {
    const ts = format(d, "yyyy-MM-dd'T'HH:mm:ss");

    intakeParams.forEach((id) => {
      const val = data[id]?.[ts];
      if (val) totalIntake += Number(val) / 60; // Assuming value is ml/hour
    });

    outputParams.forEach((id) => {
      const val = data[id]?.[ts];
      if (val) totalOutput += Number(val); // Assuming output is absolute ml per point
    });
  }

  return {
    intake: Math.round(totalIntake),
    output: Math.round(totalOutput),
    balance: Math.round(totalIntake - totalOutput),
  };
}
