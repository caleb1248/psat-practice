import { readFileSync, writeFileSync } from "fs";
const filenames = [
  "rw-cs",
  "rw-ei",
  "rw-ii",
  "rw-sec",
  "math-alg",
  "math-adv",
  "math-pro",
  "math-geo",
]
  .map((v) => ["easy", "medium", "hard"].map((d) => `${v}-${d}.html`))
  .flat();

const script = readFileSync("./script.html", "utf-8");
const styles = readFileSync("./styles.html", "utf-8");

for (const f of filenames) {
  writeFileSync("out/" + f, styles + readFileSync(f, "utf-8") + script);
}
