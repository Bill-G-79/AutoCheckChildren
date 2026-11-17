"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => AutoCheckChildrenPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// sync.ts
var taskPattern = /^([ \t]*(?:[-*+]|\d+[.)])[ \t]+\[)([ xX])(\].*)$/;
function getTask(line) {
  var _a, _b;
  const match = taskPattern.exec(line);
  if (!match) return null;
  const indentationText = (_b = (_a = /^[ \t]*/.exec(line)) == null ? void 0 : _a[0]) != null ? _b : "";
  let indentation = 0;
  for (const character of indentationText) {
    indentation = character === "	" ? indentation + (4 - indentation % 4) : indentation + 1;
  }
  return {
    checked: match[2].toLowerCase() === "x",
    indentation,
    prefix: match[1],
    suffix: match[3],
    checkboxCharacter: match[1].length
  };
}
function findChildCheckboxChanges(previousContent, currentContent) {
  var _a, _b;
  const previousLines = previousContent.split("\n");
  const currentLines = currentContent.split("\n");
  const changedParents = [];
  for (let line = 0; line < Math.min(previousLines.length, currentLines.length); line++) {
    const previousTask = getTask(previousLines[line]);
    const currentTask = getTask(currentLines[line]);
    if (previousTask && currentTask && previousTask.prefix === currentTask.prefix && previousTask.suffix === currentTask.suffix && previousTask.checked !== currentTask.checked) {
      changedParents.push({ line, task: currentTask });
    }
  }
  const changes = /* @__PURE__ */ new Map();
  for (const parent of changedParents) {
    for (let line = parent.line + 1; line < currentLines.length; line++) {
      const childLine = currentLines[line];
      if (childLine.trim() === "") continue;
      const indentationText = (_b = (_a = /^[ \t]*/.exec(childLine)) == null ? void 0 : _a[0]) != null ? _b : "";
      let indentation = 0;
      for (const character of indentationText) {
        indentation = character === "	" ? indentation + (4 - indentation % 4) : indentation + 1;
      }
      if (indentation <= parent.task.indentation) break;
      const childTask = getTask(childLine);
      if (childTask && childTask.checked !== parent.task.checked) {
        changes.set(line, {
          line,
          character: childTask.checkboxCharacter,
          state: parent.task.checked ? "x" : " "
        });
      }
    }
  }
  return [...changes.values()];
}

// main.ts
var AutoCheckChildrenPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.snapshots = /* @__PURE__ */ new WeakMap();
    this.applying = /* @__PURE__ */ new WeakSet();
  }
  onload() {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      this.rememberLeaf(leaf);
    }
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        if (leaf) this.rememberLeaf(leaf);
      })
    );
    this.registerEvent(
      this.app.workspace.on("editor-change", (editor) => {
        this.handleEditorChange(editor);
      })
    );
  }
  rememberLeaf(leaf) {
    if (leaf.view instanceof import_obsidian.MarkdownView) {
      this.snapshots.set(leaf.view.editor, leaf.view.editor.getValue());
    }
  }
  handleEditorChange(editor) {
    if (this.applying.has(editor)) return;
    const previous = this.snapshots.get(editor);
    const current = editor.getValue();
    this.snapshots.set(editor, current);
    if (previous === void 0) return;
    const changes = findChildCheckboxChanges(previous, current);
    if (changes.length === 0) return;
    this.applying.add(editor);
    try {
      for (const change of changes.sort((a, b) => b.line - a.line)) {
        editor.replaceRange(
          change.state,
          { line: change.line, ch: change.character },
          { line: change.line, ch: change.character + 1 }
        );
      }
    } finally {
      this.applying.delete(editor);
      this.snapshots.set(editor, editor.getValue());
    }
  }
};
