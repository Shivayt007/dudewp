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
const props = { catalog: { movies: [movie], count: 1, page: 1, totalPages: 1 } };
const markup = renderToStaticMarkup(React.createElement(HomeCinema, props));
assert.ok(markup.includes('href="/watch/' + movie.id + '"'));
assert.ok(!markup.includes('href="/movie/'), "No intermediate detail links on homepage");
assert.ok(markup.includes("All movies") && markup.includes("1 movie"));
assert.equal((markup.match(/<article/g) || []).length, 1, "Each movie appears once");
for (const removed of ["New arrivals", "Most watched", "Explore all movies", "Continue watching", "Browse by language", "<select"]) {
  assert.ok(!markup.includes(removed), removed + " removed from the catalog");
}
const card = renderToStaticMarkup(React.createElement(MovieCard, { movie }));
assert.equal((card.match(/href="\/watch\//g) || []).length, 2, "Poster and title both open player");
const searched = renderToStaticMarkup(React.createElement(HomeCinema, { search: "A & B", catalog: { movies: [movie], count: 49, page: 2, totalPages: 3 } }));
assert.ok(searched.includes("Search results"));
assert.ok(searched.includes("search=A+%26+B&amp;page=3"), "Pagination preserves the escaped search");
assert.ok(searched.includes("Page 2 of 3"));
const empty = renderToStaticMarkup(React.createElement(HomeCinema, { search: "Missing", catalog: { movies: [], count: 0, page: 1, totalPages: 0 } }));
assert.ok(empty.includes("No matching movies") && empty.includes("View all movies"));
console.log("Homepage rendering passed: single catalog, direct player links, search pagination and empty state.");
