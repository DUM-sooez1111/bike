import { cp, mkdir, rm, writeFile } from "node:fs/promises";

// Sites 배포용 정적 번들입니다. 로컬에서는 기존처럼 index.html을 직접 열면 됩니다.
const output = new URL("./dist/", import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(new URL("./dist/client/vendor/", import.meta.url), { recursive: true });
await mkdir(new URL("./dist/server/", import.meta.url), { recursive: true });
await mkdir(new URL("./dist/.openai/", import.meta.url), { recursive: true });

for (const file of ["index.html", "style.css", "main.js"]) {
  await cp(new URL(`./${file}`, import.meta.url), new URL(`./dist/client/${file}`, import.meta.url));
}
await cp(
  new URL("./vendor/three.min.js", import.meta.url),
  new URL("./dist/client/vendor/three.min.js", import.meta.url)
);
await cp(
  new URL("./.openai/hosting.json", import.meta.url),
  new URL("./dist/.openai/hosting.json", import.meta.url)
);

// App Garden이 요구하는 Worker 호환 서버 엔트리입니다.
// 모든 요청은 함께 업로드된 정적 클라이언트 자산으로 전달됩니다.
await writeFile(
  new URL("./dist/server/index.js", import.meta.url),
  `export default {
  async fetch(request, env) {
    if (!env?.ASSETS?.fetch) {
      return new Response("Static asset binding is unavailable.", { status: 500 });
    }
    return env.ASSETS.fetch(request);
  }
};
`,
  "utf8"
);

console.log("Static game bundle created in dist/");
