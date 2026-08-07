import { runSimrsRecipe } from "../src/simrs/recipes.js";

const recipe = process.argv[2] || "erm_ri_perawat";

runSimrsRecipe({
  recipe,
  mode: "explore",
  holdMs: 60_000,
  onSteps: async (steps) => {
    console.log(
      "[explore-erm]",
      steps.map((s) => `${s.id}:${s.status}`).join(" | "),
    );
  },
})
  .then((r) => {
    console.log("OK", r.screenshot);
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
