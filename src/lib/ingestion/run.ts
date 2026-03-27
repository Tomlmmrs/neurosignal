// Runnable with: tsx src/lib/ingestion/run.ts
import { runAllSources } from "./pipeline";

async function main() {
  console.log("=".repeat(60));
  console.log("NeuroSignal - Ingestion Pipeline");
  console.log("=".repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log();

  const results = await runAllSources();

  console.log();
  console.log("-".repeat(60));
  console.log("Results Summary:");
  console.log("-".repeat(60));

  let totalNew = 0;
  let totalFetched = 0;
  let totalErrors = 0;

  for (const result of results) {
    const status = result.errors.length > 0 ? "WARN" : "OK";
    console.log(
      `  [${status}] ${result.source}: ${result.new} new / ${result.fetched} fetched`
    );
    if (result.errors.length > 0) {
      for (const err of result.errors) {
        console.log(`        Error: ${err}`);
      }
    }
    totalNew += result.new;
    totalFetched += result.fetched;
    totalErrors += result.errors.length;
  }

  console.log("-".repeat(60));
  console.log(
    `Total: ${totalNew} new items from ${totalFetched} fetched across ${results.length} sources`
  );
  if (totalErrors > 0) {
    console.log(`Errors: ${totalErrors}`);
  }
  console.log(`Finished at: ${new Date().toISOString()}`);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
