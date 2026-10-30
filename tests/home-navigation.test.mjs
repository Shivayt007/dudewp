import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire, Module } from "node:module";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
async function loadComponent(name, dependencies = {}) {
  const filename = fileURLToPath(new URL("../components/" + name + ".tsx", import.meta.url));
  const source = await readFile(filename, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } });
  const mod = new Module(filename);
  mod.require = specifier => {
    if (specifier === "next/link") return { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) };
    if (dependencies[specifier]) return { __esModule: true, default: dependencies[specifier] };
    return require(specifier);
  };
  mod._compile(compiled.outputText, filename);
  return mod.exports.default;
}
const Poster = () => React.createElement("img", { alt: "poster" });
const MovieCard = await loadComponent("MovieCard", { "./Poster": Poster });
const HomeCinema = await loadComponent("HomeCinema", { "./MovieCard": MovieCard });
const movie = {
  id: "000000000000000000000001", title: "Example Movie", year: 2026, genres: ["Thriller"], rating: 8,
  files: [{ quality: "720p", language: "Tamil+English" }], language: "Tamil", duration_seconds: 7200,
  poster_url: "", backdrop_url: "", description: "A test fixture.", views: 1,
};
const markup = renderToStaticMarkup(React.createElement(HomeCinema, {
  catalog: { movies: [movie], count: 1, totalPages: 1 }, recent: [movie], popular: [movie],
  filters: { genres: ["Thriller"], years: [2026] },
  query: { search: "", genre: "", year: 0, sort: "latest", page: 1 },
}));
assert.ok(markup.includes('href="/watch/' + movie.id + '"'));
assert.ok(!markup.includes('href="/movie/'), "No intermediate detail links on homepage");
assert.ok(markup.includes("New arrivals") && markup.includes("Explore all movies"));
assert.ok(markup.includes("Tamil") && markup.includes("English"));
assert.ok(!markup.includes("Continue watching"), "No invented playback history");
const card = renderToStaticMarkup(React.createElement(MovieCard, { movie, rank: 1 }));
assert.equal((card.match(/href="\/watch\//g) || []).length, 2, "Poster and title both open player");
console.log("Homepage rendering passed: direct player links, real language filters, no fabricated history.");
