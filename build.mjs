import { cp, mkdir, rm } from "node:fs/promises";

// Sites 배포용 정적 번들입니다. 로컬에서는 기존처럼 index.html을 직접 열면 됩니다.
const output = new URL("./dist/", import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(new URL("./dist/vendor/", import.meta.url), { recursive: true });

for (const file of ["index.html", "style.css", "main.js"]) {
  await cp(new URL(`./${file}`, import.meta.url), new URL(`./dist/${file}`, import.meta.url));
}
await cp(
  new URL("./vendor/three.min.js", import.meta.url),
  new URL("./dist/vendor/three.min.js", import.meta.url)
);

console.log("Static game bundle created in dist/");
