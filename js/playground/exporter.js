var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createExporter = void 0;
    const createExporter = (sandbox, monaco, ui) => {
        function getScriptTargetText(option) {
            return monaco.languages.typescript.ScriptTarget[option];
        }
        function getJsxEmitText(option) {
            if (option === monaco.languages.typescript.JsxEmit.None) {
                return undefined;
            }
            return monaco.languages.typescript.JsxEmit[option];
        }
        function getModuleKindText(option) {
            if (option === monaco.languages.typescript.ModuleKind.None) {
                return undefined;
            }
            return monaco.languages.typescript.ModuleKind[option];
        }
        // These are the compiler's defaults, and we want a diff from
        // these before putting it in the issue
        const defaultCompilerOptionsForTSC = {
            esModuleInterop: false,
            strictNullChecks: false,
            strict: false,
            strictFunctionTypes: false,
            strictPropertyInitialization: false,
            strictBindCallApply: false,
            noImplicitAny: false,
            noImplicitThis: false,
            noImplicitReturns: false,
            checkJs: false,
            allowJs: false,
            experimentalDecorators: false,
            emitDecoratorMetadata: false,
        };
        function getValidCompilerOptions(options) {
            const { target: targetOption, jsx: jsxOption, module: moduleOption } = options, restOptions = __rest(options, ["target", "jsx", "module"]);
            const targetText = getScriptTargetText(targetOption);
            const jsxText = getJsxEmitText(jsxOption);
            const moduleText = getModuleKindText(moduleOption);
            const opts = Object.assign(Object.assign(Object.assign(Object.assign({}, restOptions), (targetText && { target: targetText })), (jsxText && { jsx: jsxText })), (moduleText && { module: moduleText }));
            const diffFromTSCDefaults = Object.entries(opts).reduce((acc, [key, value]) => {
                if (opts[key] && value != defaultCompilerOptionsForTSC[key]) {
                    // @ts-ignore
                    acc[key] = opts[key];
                }
                return acc;
            }, {});
            return diffFromTSCDefaults;
        }
        // Based on https://github.com/stackblitz/core/blob/master/sdk/src/generate.ts
        function createHiddenInput(name, value) {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = name;
            input.value = value;
            return input;
        }
        function createProjectForm(project) {
            const form = document.createElement("form");
            form.method = "POST";
            form.setAttribute("style", "display:none;");
            form.appendChild(createHiddenInput("project[title]", project.title));
            form.appendChild(createHiddenInput("project[description]", project.description));
            form.appendChild(createHiddenInput("project[template]", project.template));
            if (project.tags) {
                project.tags.forEach((tag) => {
                    form.appendChild(createHiddenInput("project[tags][]", tag));
                });
            }
            if (project.dependencies) {
                form.appendChild(createHiddenInput("project[dependencies]", JSON.stringify(project.dependencies)));
            }
            if (project.settings) {
                form.appendChild(createHiddenInput("project[settings]", JSON.stringify(project.settings)));
            }
            Object.keys(project.files).forEach(path => {
                form.appendChild(createHiddenInput(`project[files][${path}]`, project.files[path]));
            });
            return form;
        }
        const typescriptVersion = sandbox.ts.version;
        // prettier-ignore
        const stringifiedCompilerOptions = JSON.stringify({ compilerOptions: getValidCompilerOptions(sandbox.getCompilerOptions()) }, null, '  ');
        // TODO: pull deps
        function openProjectInStackBlitz() {
            const project = {
                title: "Playground Export - ",
                description: "123",
                template: "typescript",
                files: {
                    "index.ts": sandbox.getText(),
                    "tsconfig.json": stringifiedCompilerOptions,
                },
                dependencies: {
                    typescript: typescriptVersion,
                },
            };
            const form = createProjectForm(project);
            form.action = "https://stackblitz.com/run?view=editor";
            // https://github.com/stackblitz/core/blob/master/sdk/src/helpers.ts#L9
            // + buildProjectQuery(options);
            form.target = "_blank";
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
        }
        function openInBugWorkbench() {
            const hash = `#code/${sandbox.lzstring.compressToEncodedURIComponent(sandbox.getText())}`;
            document.location.assign(`/dev/bug-workbench/${hash}`);
        }
        function openInTSAST() {
            const hash = `#code/${sandbox.lzstring.compressToEncodedURIComponent(sandbox.getText())}`;
            document.location.assign(`https://ts-ast-viewer.com/${hash}`);
        }
        function openProjectInCodeSandbox() {
            const files = {
                "package.json": {
                    content: {
                        name: "TypeScript Playground Export",
                        version: "0.0.0",
                        description: "TypeScript playground exported Sandbox",
                        dependencies: {
                            typescript: typescriptVersion,
                        },
                    },
                },
                "index.ts": {
                    content: sandbox.getText(),
                },
                "tsconfig.json": {
                    content: stringifiedCompilerOptions,
                },
            };
            // Using the v1 get API
            const parameters = sandbox.lzstring
                .compressToBase64(JSON.stringify({ files }))
                .replace(/\+/g, "-") // Convert '+' to '-'
                .replace(/\//g, "_") // Convert '/' to '_'
                .replace(/=+$/, ""); // Remove ending '='
            const url = `https://codesandbox.io/api/v1/sandboxes/define?view=editor&parameters=${parameters}`;
            document.location.assign(url);
            // Alternative using the http URL API, which uses POST. This has the trade-off where
            // the async nature of the call means that the redirect at the end triggers
            // popup security mechanisms in browsers because the function isn't blessed as
            // being a direct result of a user action.
            // fetch("https://codesandbox.io/api/v1/sandboxes/define?json=1", {
            //   method: "POST",
            //   body: JSON.stringify({ files }),
            //   headers: {
            //     Accept: "application/json",
            //     "Content-Type": "application/json"
            //   }
            // })
            // .then(x => x.json())
            // .then(data => {
            //   window.open('https://codesandbox.io/s/' + data.sandbox_id, '_blank');
            // });
        }
        function codify(code, ext) {
            return "```" + ext + "\n" + code + "\n```\n";
        }
        function makeMarkdown() {
            return __awaiter(this, void 0, void 0, function* () {
                const query = sandbox.createURLQueryWithCompilerOptions(sandbox);
                const fullURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}${query}`;
                const jsSection = sandbox.config.useJavaScript
                    ? ""
                    : `
<details><summary><b>Output</b></summary>

${codify(yield sandbox.getRunnableJS(), "ts")}

</details>
`;
                return `
${codify(sandbox.getText(), "ts")}

${jsSection}

<details><summary><b>Compiler Options</b></summary>

${codify(stringifiedCompilerOptions, "json")}

</details>

**Playground Link:** [Provided](${fullURL})
      `;
            });
        }
        function copyAsMarkdownIssue(e) {
            return __awaiter(this, void 0, void 0, function* () {
                e.persist();
                const markdown = yield makeMarkdown();
                ui.showModal(markdown, document.getElementById("exports-dropdown"), "Markdown Version of Playground Code for GitHub Issue", undefined, e);
                return false;
            });
        }
        function copyForChat(e) {
            const query = sandbox.createURLQueryWithCompilerOptions(sandbox);
            const fullURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}${query}`;
            const chat = `[Playground Link](${fullURL})`;
            ui.showModal(chat, document.getElementById("exports-dropdown"), "Markdown for chat", undefined, e);
            return false;
        }
        function copyForChatWithPreview(e) {
            e.persist();
            const query = sandbox.createURLQueryWithCompilerOptions(sandbox);
            const fullURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}${query}`;
            const ts = sandbox.getText();
            const preview = ts.length > 200 ? ts.substring(0, 200) + "..." : ts.substring(0, 200);
            const code = "```\n" + preview + "\n```\n";
            const chat = `${code}\n[Playground Link](${fullURL})`;
            ui.showModal(chat, document.getElementById("exports-dropdown"), "Markdown code", undefined, e);
            return false;
        }
        function exportAsTweet() {
            const query = sandbox.createURLQueryWithCompilerOptions(sandbox);
            const fullURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}${query}`;
            document.location.assign(`http://www.twitter.com/share?url=${fullURL}`);
        }
        return {
            openProjectInStackBlitz,
            openProjectInCodeSandbox,
            copyAsMarkdownIssue,
            copyForChat,
            copyForChatWithPreview,
            openInTSAST,
            openInBugWorkbench,
            exportAsTweet,
        };
    };
    exports.createExporter = createExporter;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwb3J0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wbGF5Z3JvdW5kL3NyYy9leHBvcnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFLTyxNQUFNLGNBQWMsR0FBRyxDQUFDLE9BQWdCLEVBQUUsTUFBc0MsRUFBRSxFQUFNLEVBQUUsRUFBRTtRQUNqRyxTQUFTLG1CQUFtQixDQUFDLE1BQVc7WUFDdEMsT0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDekQsQ0FBQztRQUVELFNBQVMsY0FBYyxDQUFDLE1BQVc7WUFDakMsSUFBSSxNQUFNLEtBQUssTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRTtnQkFDdkQsT0FBTyxTQUFTLENBQUE7YUFDakI7WUFDRCxPQUFPLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNwRCxDQUFDO1FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxNQUFXO1lBQ3BDLElBQUksTUFBTSxLQUFLLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUU7Z0JBQzFELE9BQU8sU0FBUyxDQUFBO2FBQ2pCO1lBQ0QsT0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdkQsQ0FBQztRQUVELDZEQUE2RDtRQUM3RCx1Q0FBdUM7UUFDdkMsTUFBTSw0QkFBNEIsR0FBb0I7WUFDcEQsZUFBZSxFQUFFLEtBQUs7WUFDdEIsZ0JBQWdCLEVBQUUsS0FBSztZQUN2QixNQUFNLEVBQUUsS0FBSztZQUNiLG1CQUFtQixFQUFFLEtBQUs7WUFDMUIsNEJBQTRCLEVBQUUsS0FBSztZQUNuQyxtQkFBbUIsRUFBRSxLQUFL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T0FBTyxLQUFLLENBQUE7UUFDZCxDQUFDO1FBRUQsU0FBUyxhQUFhO1lBQ3BCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxpQ0FBaUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNoRSxNQUFNLE9BQU8sR0FBRyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxHQUFHLEtBQUssRUFBRSxDQUFBO1lBRS9HLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLG9DQUFvQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQ3pFLENBQUM7UUFFRCxPQUFPO1lBQ0wsdUJBQXVCO1lBQ3ZCLHdCQUF3QjtZQUN4QixtQkFBbUI7WUFDbkIsV0FBVztZQUNYLHNCQUFzQjtZQUN0QixXQUFXO1lBQ1gsa0JBQWtCO1lBQ2xCLGFBQWE7U0FDZCxDQUFBO0lBQ0gsQ0FBQyxDQUFBO0lBcFJZLFFBQUEsY0FBYyxrQkFvUjFCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVUkgfSBmcm9tIFwiLi9jcmVhdGVVSVwiXG5cbnR5cGUgU2FuZGJveCA9IGltcG9ydChcIkB0eXBlc2NyaXB0L3NhbmRib3hcIikuU2FuZGJveFxudHlwZSBDb21waWxlck9wdGlvbnMgPSBpbXBvcnQoXCJtb25hY28tZWRpdG9yXCIpLmxhbmd1YWdlcy50eXBlc2NyaXB0LkNvbXBpbGVyT3B0aW9uc1xuXG5leHBvcnQgY29uc3QgY3JlYXRlRXhwb3J0ZXIgPSAoc2FuZGJveDogU2FuZGJveCwgbW9uYWNvOiB0eXBlb2YgaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKSwgdWk6IFVJKSA9PiB7XG4gIGZ1bmN0aW9uIGdldFNjcmlwdFRhcmdldFRleHQob3B0aW9uOiBhbnkpIHtcbiAgICByZXR1cm4gbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LlNjcmlwdFRhcmdldFtvcHRpb25dXG4gIH1cblxuICBmdW5jdGlvbiBnZXRKc3hFbWl0VGV4dChvcHRpb246IGFueSkge1xuICAgIGlmIChvcHRpb24gPT09IG1vbmFjby5sYW5ndWFnZXMudHlwZXNjcmlwdC5Kc3hFbWl0Lk5vbmUpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWRcbiAgICB9XG4gICAgcmV0dXJuIG1vbmFjby5sYW5ndWFnZXMudHlwZXNjcmlwdC5Kc3hFbWl0W29wdGlvbl1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE1vZHVsZUtpbmRUZXh0KG9wdGlvbjogYW55KSB7XG4gICAgaWYgKG9wdGlvbiA9PT0gbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0Lk1vZHVsZUtpbmQuTm9uZSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZFxuICAgIH1cbiAgICByZXR1cm4gbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0Lk1vZHVsZUtpbmRbb3B0aW9uXVxuICB9XG5cbiAgLy8gVGhlc2UgYXJlIHRoZSBjb21waWxlcidzIGRlZmF1bHRzLCBhbmQgd2Ugd2FudCBhIGRpZmYgZnJvbVxuICAvLyB0aGVzZSBiZWZvcmUgcHV0dGluZyBpdCBpbiB0aGUgaXNzdWVcbiAgY29uc3QgZGVmYXVsdENvbXBpbGVyT3B0aW9uc0ZvclRTQzogQ29tcGlsZXJPcHRpb25zID0ge1xuICAgIGVzTW9kdWxlSW50ZXJvcDogZmFsc2UsXG4gICAgc3RyaWN0TnVsbENoZWNrczogZmFsc2UsXG4gICAgc3RyaWN0OiBmYWxzZSxcbiAgICBzdHJpY3RGdW5jdGlvblR5cGVzOiBmYWxzZSxcbiAgICBzdHJpY3RQcm9wZXJ0eUluaXRpYWxpemF0aW9uOiBmYWxzZSxcbiAgICBzdHJpY3RCaW5kQ2FsbEFwcGx5OiBmYWxzZSxcbiAgICBub0ltcGxpY2l0QW55OiBmYWxzZSxcbiAgICBub0ltcGxpY2l0VGhpczogZmFsc2UsXG4gICAgbm9JbXBsaWNpdFJldHVybnM6IGZhbHNlLFxuICAgIGNoZWNrSnM6IGZhbHNlLFxuICAgIGFsbG93SnM6IGZhbHNlLFxuICAgIGV4cGVyaW1lbnRhbERlY29yYXRvcnM6IGZhbHNlLFxuICAgIGVtaXREZWNvcmF0b3JNZXRhZGF0YTogZmFsc2UsXG4gIH1cblxuICBmdW5jdGlvbiBnZXRWYWxpZENvbXBpbGVyT3B0aW9ucyhvcHRpb25zOiBDb21waWxlck9wdGlvbnMpIHtcbiAgICBjb25zdCB7IHRhcmdldDogdGFyZ2V0T3B0aW9uLCBqc3g6IGpzeE9wdGlvbiwgbW9kdWxlOiBtb2R1bGVPcHRpb24sIC4uLnJlc3RPcHRpb25zIH0gPSBvcHRpb25zXG5cbiAgICBjb25zdCB0YXJnZXRUZXh0ID0gZ2V0U2NyaXB0VGFyZ2V0VGV4dCh0YXJnZXRPcHRpb24pXG4gICAgY29uc3QganN4VGV4dCA9IGdldEpzeEVtaXRUZXh0KGpzeE9wdGlvbilcbiAgICBjb25zdCBtb2R1bGVUZXh0ID0gZ2V0TW9kdWxlS2luZFRleHQobW9kdWxlT3B0aW9uKVxuXG4gICAgY29uc3Qgb3B0cyA9IHtcbiAgICAgIC4uLnJlc3RPcHRpb25zLFxuICAgICAgLi4uKHRhcmdldFRleHQgJiYgeyB0YXJnZXQ6IHRhcmdldFRleHQgfSksXG4gICAgICAuLi4oanN4VGV4dCAmJiB7IGpzeDoganN4VGV4dCB9KSxcbiAgICAgIC4uLihtb2R1bGVUZXh0ICYmIHsgbW9kdWxlOiBtb2R1bGVUZXh0IH0pLFxuICAgIH1cblxuICAgIGNvbnN0IGRpZmZGcm9tVFNDRGVmYXVsdHMgPSBPYmplY3QuZW50cmllcyhvcHRzKS5yZWR1Y2UoKGFjYywgW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICBpZiAoKG9wdHMgYXMgYW55KVtrZXldICYmIHZhbHVlICE9IGRlZmF1bHRDb21waWxlck9wdGlvbnNGb3JUU0Nba2V5XSkge1xuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIGFjY1trZXldID0gb3B0c1trZXldXG4gICAgICB9XG5cbiAgICAgIHJldHVybiBhY2NcbiAgICB9LCB7fSlcblxuICAgIHJldHVybiBkaWZmRnJvbVRTQ0RlZmF1bHRzXG4gIH1cblxuICAvLyBCYXNlZCBvbiBodHRwczovL2dpdGh1Yi5jb20vc3RhY2tibGl0ei9jb3JlL2Jsb2IvbWFzdGVyL3Nkay9zcmMvZ2VuZXJhdGUudHNcbiAgZnVuY3Rpb24gY3JlYXRlSGlkZGVuSW5wdXQobmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKSB7XG4gICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIilcbiAgICBpbnB1dC50eXBlID0gXCJoaWRkZW5cIlxuICAgIGlucHV0Lm5hbWUgPSBuYW1lXG4gICAgaW5wdXQudmFsdWUgPSB2YWx1ZVxuICAgIHJldHVybiBpbnB1dFxuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlUHJvamVjdEZvcm0ocHJvamVjdDogYW55KSB7XG4gICAgY29uc3QgZm9ybSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJmb3JtXCIpXG5cbiAgICBmb3JtLm1ldGhvZCA9IFwiUE9TVFwiXG4gICAgZm9ybS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6bm9uZTtcIilcblxuICAgIGZvcm0uYXBwZW5kQ2hpbGQoY3JlYXRlSGlkZGVuSW5wdXQoXCJwcm9qZWN0W3RpdGxlXVwiLCBwcm9qZWN0LnRpdGxlKSlcbiAgICBmb3JtLmFwcGVuZENoaWxkKGNyZWF0ZUhpZGRlbklucHV0KFwicHJvamVjdFtkZXNjcmlwdGlvbl1cIiwgcHJvamVjdC5kZXNjcmlwdGlvbikpXG4gICAgZm9ybS5hcHBlbmRDaGlsZChjcmVhdGVIaWRkZW5JbnB1dChcInByb2plY3RbdGVtcGxhdGVdXCIsIHByb2plY3QudGVtcGxhdGUpKVxuXG4gICAgaWYgKHByb2plY3QudGFncykge1xuICAgICAgcHJvamVjdC50YWdzLmZvckVhY2goKHRhZzogc3RyaW5nKSA9PiB7XG4gICAgICAgIGZvcm0uYXBwZW5kQ2hpbGQoY3JlYXRlSGlkZGVuSW5wdXQoXCJwcm9qZWN0W3RhZ3NdW11cIiwgdGFnKSlcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgaWYgKHByb2plY3QuZGVwZW5kZW5jaWVzKSB7XG4gICAgICBmb3JtLmFwcGVuZENoaWxkKGNyZWF0ZUhpZGRlbklucHV0KFwicHJvamVjdFtkZXBlbmRlbmNpZXNdXCIsIEpTT04uc3RyaW5naWZ5KHByb2plY3QuZGVwZW5kZW5jaWVzKSkpXG4gICAgfVxuXG4gICAgaWYgKHByb2plY3Quc2V0dGluZ3MpIHtcbiAgICAgIGZvcm0uYXBwZW5kQ2hpbGQoY3JlYXRlSGlkZGVuSW5wdXQoXCJwcm9qZWN0W3NldHRpbmdzXVwiLCBKU09OLnN0cmluZ2lmeShwcm9qZWN0LnNldHRpbmdzKSkpXG4gICAgfVxuXG4gICAgT2JqZWN0LmtleXMocHJvamVjdC5maWxlcykuZm9yRWFjaChwYXRoID0+IHtcbiAgICAgIGZvcm0uYXBwZW5kQ2hpbGQoY3JlYXRlSGlkZGVuSW5wdXQoYHByb2plY3RbZmlsZXNdWyR7cGF0aH1dYCwgcHJvamVjdC5maWxlc1twYXRoXSkpXG4gICAgfSlcblxuICAgIHJldHVybiBmb3JtXG4gIH1cblxuICBjb25zdCB0eXBlc2NyaXB0VmVyc2lvbiA9IHNhbmRib3gudHMudmVyc2lvblxuICAvLyBwcmV0dGllci1pZ25vcmVcbiAgY29uc3Qgc3RyaW5naWZpZWRDb21waWxlck9wdGlvbnMgPSBKU09OLnN0cmluZ2lmeSh7IGNvbXBpbGVyT3B0aW9uczogZ2V0VmFsaWRDb21waWxlck9wdGlvbnMoc2FuZGJveC5nZXRDb21waWxlck9wdGlvbnMoKSkgfSwgbnVsbCwgJyAgJylcblxuICAvLyBUT0RPOiBwdWxsIGRlcHNcbiAgZnVuY3Rpb24gb3BlblByb2plY3RJblN0YWNrQmxpdHooKSB7XG4gICAgY29uc3QgcHJvamVjdCA9IHtcbiAgICAgIHRpdGxlOiBcIlBsYXlncm91bmQgRXhwb3J0IC0gXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCIxMjNcIixcbiAgICAgIHRlbXBsYXRlOiBcInR5cGVzY3JpcHRcIixcbiAgICAgIGZpbGVzOiB7XG4gICAgICAgIFwiaW5kZXgudHNcIjogc2FuZGJveC5nZXRUZXh0KCksXG4gICAgICAgIFwidHNjb25maWcuanNvblwiOiBzdHJpbmdpZmllZENvbXBpbGVyT3B0aW9ucyxcbiAgICAgIH0sXG4gICAgICBkZXBlbmRlbmNpZXM6IHtcbiAgICAgICAgdHlwZXNjcmlwdDogdHlwZXNjcmlwdFZlcnNpb24sXG4gICAgICB9LFxuICAgIH1cbiAgICBjb25zdCBmb3JtID0gY3JlYXRlUHJvamVjdEZvcm0ocHJvamVjdClcbiAgICBmb3JtLmFjdGlvbiA9IFwiaHR0cHM6Ly9zdGFja2JsaXR6LmNvbS9ydW4/dmlldz1lZGl0b3JcIlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9zdGFja2JsaXR6L2NvcmUvYmxvYi9tYXN0ZXIvc2RrL3NyYy9oZWxwZXJzLnRzI0w5XG4gICAgLy8gKyBidWlsZFByb2plY3RRdWVyeShvcHRpb25zKTtcbiAgICBmb3JtLnRhcmdldCA9IFwiX2JsYW5rXCJcblxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZm9ybSlcbiAgICBmb3JtLnN1Ym1pdCgpXG4gICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChmb3JtKVxuICB9XG5cbiAgZnVuY3Rpb24gb3BlbkluQnVnV29ya2JlbmNoKCkge1xuICAgIGNvbnN0IGhhc2ggPSBgI2NvZGUvJHtzYW5kYm94Lmx6c3RyaW5nLmNvbXByZXNzVG9FbmNvZGVkVVJJQ29tcG9uZW50KHNhbmRib3guZ2V0VGV4dCgpKX1gXG4gICAgZG9jdW1lbnQubG9jYXRpb24uYXNzaWduKGAvZGV2L2J1Zy13b3JrYmVuY2gvJHtoYXNofWApXG4gIH1cblxuICBmdW5jdGlvbiBvcGVuSW5UU0FTVCgpIHtcbiAgICBjb25zdCBoYXNoID0gYCNjb2RlLyR7c2FuZGJveC5senN0cmluZy5jb21wcmVzc1RvRW5jb2RlZFVSSUNvbXBvbmVudChzYW5kYm94LmdldFRleHQoKSl9YFxuICAgIGRvY3VtZW50LmxvY2F0aW9uLmFzc2lnbihgaHR0cHM6Ly90cy1hc3Qtdmlld2VyLmNvbS8ke2hhc2h9YClcbiAgfVxuXG4gIGZ1bmN0aW9uIG9wZW5Qcm9qZWN0SW5Db2RlU2FuZGJveCgpIHtcbiAgICBjb25zdCBmaWxlcyA9IHtcbiAgICAgIFwicGFja2FnZS5qc29uXCI6IHtcbiAgICAgICAgY29udGVudDoge1xuICAgICAgICAgIG5hbWU6IFwiVHlwZVNjcmlwdCBQbGF5Z3JvdW5kIEV4cG9ydFwiLFxuICAgICAgICAgIHZlcnNpb246IFwiMC4wLjBcIixcbiAgICAgICAgICBkZXNjcmlwdGlvbjogXCJUeXBlU2NyaXB0IHBsYXlncm91bmQgZXhwb3J0ZWQgU2FuZGJveFwiLFxuICAgICAgICAgIGRlcGVuZGVuY2llczoge1xuICAgICAgICAgICAgdHlwZXNjcmlwdDogdHlwZXNjcmlwdFZlcnNpb24sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBcImluZGV4LnRzXCI6IHtcbiAgICAgICAgY29udGVudDogc2FuZGJveC5nZXRUZXh0KCksXG4gICAgICB9LFxuICAgICAgXCJ0c2NvbmZpZy5qc29uXCI6IHtcbiAgICAgICAgY29udGVudDogc3RyaW5naWZpZWRDb21waWxlck9wdGlvbnMsXG4gICAgICB9LFxuICAgIH1cblxuICAgIC8vIFVzaW5nIHRoZSB2MSBnZXQgQVBJXG4gICAgY29uc3QgcGFyYW1ldGVycyA9IHNhbmRib3gubHpzdHJpbmdcbiAgICAgIC5jb21wcmVzc1RvQmFzZTY0KEpTT04uc3RyaW5naWZ5KHsgZmlsZXMgfSkpXG4gICAgICAucmVwbGFjZSgvXFwrL2csIFwiLVwiKSAvLyBDb252ZXJ0ICcrJyB0byAnLSdcbiAgICAgIC5yZXBsYWNlKC9cXC8vZywgXCJfXCIpIC8vIENvbnZlcnQgJy8nIHRvICdfJ1xuICAgICAgLnJlcGxhY2UoLz0rJC8sIFwiXCIpIC8vIFJlbW92ZSBlbmRpbmcgJz0nXG5cbiAgICBjb25zdCB1cmwgPSBgaHR0cHM6Ly9jb2Rlc2FuZGJveC5pby9hcGkvdjEvc2FuZGJveGVzL2RlZmluZT92aWV3PWVkaXRvciZwYXJhbWV0ZXJzPSR7cGFyYW1ldGVyc31gXG4gICAgZG9jdW1lbnQubG9jYXRpb24uYXNzaWduKHVybClcblxuICAgIC8vIEFsdGVybmF0aXZlIHVzaW5nIHRoZSBodHRwIFVSTCBBUEksIHdoaWNoIHVzZXMgUE9TVC4gVGhpcyBoYXMgdGhlIHRyYWRlLW9mZiB3aGVyZVxuICAgIC8vIHRoZSBhc3luYyBuYXR1cmUgb2YgdGhlIGNhbGwgbWVhbnMgdGhhdCB0aGUgcmVkaXJlY3QgYXQgdGhlIGVuZCB0cmlnZ2Vyc1xuICAgIC8vIHBvcHVwIHNlY3VyaXR5IG1lY2hhbmlzbXMgaW4gYnJvd3NlcnMgYmVjYXVzZSB0aGUgZnVuY3Rpb24gaXNuJ3QgYmxlc3NlZCBhc1xuICAgIC8vIGJlaW5nIGEgZGlyZWN0IHJlc3VsdCBvZiBhIHVzZXIgYWN0aW9uLlxuXG4gICAgLy8gZmV0Y2goXCJodHRwczovL2NvZGVzYW5kYm94LmlvL2FwaS92MS9zYW5kYm94ZXMvZGVmaW5lP2pzb249MVwiLCB7XG4gICAgLy8gICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgIC8vICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBmaWxlcyB9KSxcbiAgICAvLyAgIGhlYWRlcnM6IHtcbiAgICAvLyAgICAgQWNjZXB0OiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAvLyAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICAvLyAgIH1cbiAgICAvLyB9KVxuICAgIC8vIC50aGVuKHggPT4geC5qc29uKCkpXG4gICAgLy8gLnRoZW4oZGF0YSA9PiB7XG4gICAgLy8gICB3aW5kb3cub3BlbignaHR0cHM6Ly9jb2Rlc2FuZGJveC5pby9zLycgKyBkYXRhLnNhbmRib3hfaWQsICdfYmxhbmsnKTtcbiAgICAvLyB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvZGlmeShjb2RlOiBzdHJpbmcsIGV4dDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIFwiYGBgXCIgKyBleHQgKyBcIlxcblwiICsgY29kZSArIFwiXFxuYGBgXFxuXCJcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIG1ha2VNYXJrZG93bigpIHtcbiAgICBjb25zdCBxdWVyeSA9IHNhbmRib3guY3JlYXRlVVJMUXVlcnlXaXRoQ29tcGlsZXJPcHRpb25zKHNhbmRib3gpXG4gICAgY29uc3QgZnVsbFVSTCA9IGAke2RvY3VtZW50LmxvY2F0aW9uLnByb3RvY29sfS8vJHtkb2N1bWVudC5sb2NhdGlvbi5ob3N0fSR7ZG9jdW1lbnQubG9jYXRpb24ucGF0aG5hbWV9JHtxdWVyeX1gXG4gICAgY29uc3QganNTZWN0aW9uID0gc2FuZGJveC5jb25maWcudXNlSmF2YVNjcmlwdFxuICAgICAgPyBcIlwiXG4gICAgICA6IGBcbjxkZXRhaWxzPjxzdW1tYXJ5PjxiPk91dHB1dDwvYj48L3N1bW1hcnk+XG5cbiR7Y29kaWZ5KGF3YWl0IHNhbmRib3guZ2V0UnVubmFibGVKUygpLCBcInRzXCIpfVxuXG48L2RldGFpbHM+XG5gXG5cbiAgICByZXR1cm4gYFxuJHtjb2RpZnkoc2FuZGJveC5nZXRUZXh0KCksIFwidHNcIil9XG5cbiR7anNTZWN0aW9ufVxuXG48ZGV0YWlscz48c3VtbWFyeT48Yj5Db21waWxlciBPcHRpb25zPC9iPjwvc3VtbWFyeT5cblxuJHtjb2RpZnkoc3RyaW5naWZpZWRDb21waWxlck9wdGlvbnMsIFwianNvblwiKX1cblxuPC9kZXRhaWxzPlxuXG4qKlBsYXlncm91bmQgTGluazoqKiBbUHJvdmlkZWRdKCR7ZnVsbFVSTH0pXG4gICAgICBgXG4gIH1cbiAgYXN5bmMgZnVuY3Rpb24gY29weUFzTWFya2Rvd25Jc3N1ZShlOiBSZWFjdC5Nb3VzZUV2ZW50KSB7XG4gICAgZS5wZXJzaXN0KClcblxuICAgIGNvbnN0IG1hcmtkb3duID0gYXdhaXQgbWFrZU1hcmtkb3duKClcbiAgICB1aS5zaG93TW9kYWwoXG4gICAgICBtYXJrZG93bixcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZXhwb3J0cy1kcm9wZG93blwiKSEsXG4gICAgICBcIk1hcmtkb3duIFZlcnNpb24gb2YgUGxheWdyb3VuZCBDb2RlIGZvciBHaXRIdWIgSXNzdWVcIixcbiAgICAgIHVuZGVmaW5lZCxcbiAgICAgIGVcbiAgICApXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICBmdW5jdGlvbiBjb3B5Rm9yQ2hhdChlOiBSZWFjdC5Nb3VzZUV2ZW50KSB7XG4gICAgY29uc3QgcXVlcnkgPSBzYW5kYm94LmNyZWF0ZVVSTFF1ZXJ5V2l0aENvbXBpbGVyT3B0aW9ucyhzYW5kYm94KVxuICAgIGNvbnN0IGZ1bGxVUkwgPSBgJHtkb2N1bWVudC5sb2NhdGlvbi5wcm90b2NvbH0vLyR7ZG9jdW1lbnQubG9jYXRpb24uaG9zdH0ke2RvY3VtZW50LmxvY2F0aW9uLnBhdGhuYW1lfSR7cXVlcnl9YFxuICAgIGNvbnN0IGNoYXQgPSBgW1BsYXlncm91bmQgTGlua10oJHtmdWxsVVJMfSlgXG4gICAgdWkuc2hvd01vZGFsKGNoYXQsIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZXhwb3J0cy1kcm9wZG93blwiKSEsIFwiTWFya2Rvd24gZm9yIGNoYXRcIiwgdW5kZWZpbmVkLCBlKVxuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgZnVuY3Rpb24gY29weUZvckNoYXRXaXRoUHJldmlldyhlOiBSZWFjdC5Nb3VzZUV2ZW50KSB7XG4gICAgZS5wZXJzaXN0KClcblxuICAgIGNvbnN0IHF1ZXJ5ID0gc2FuZGJveC5jcmVhdGVVUkxRdWVyeVdpdGhDb21waWxlck9wdGlvbnMoc2FuZGJveClcbiAgICBjb25zdCBmdWxsVVJMID0gYCR7ZG9jdW1lbnQubG9jYXRpb24ucHJvdG9jb2x9Ly8ke2RvY3VtZW50LmxvY2F0aW9uLmhvc3R9JHtkb2N1bWVudC5sb2NhdGlvbi5wYXRobmFtZX0ke3F1ZXJ5fWBcblxuICAgIGNvbnN0IHRzID0gc2FuZGJveC5nZXRUZXh0KClcbiAgICBjb25zdCBwcmV2aWV3ID0gdHMubGVuZ3RoID4gMjAwID8gdHMuc3Vic3RyaW5nKDAsIDIwMCkgKyBcIi4uLlwiIDogdHMuc3Vic3RyaW5nKDAsIDIwMClcblxuICAgIGNvbnN0IGNvZGUgPSBcImBgYFxcblwiICsgcHJldmlldyArIFwiXFxuYGBgXFxuXCJcbiAgICBjb25zdCBjaGF0ID0gYCR7Y29kZX1cXG5bUGxheWdyb3VuZCBMaW5rXSgke2Z1bGxVUkx9KWBcbiAgICB1aS5zaG93TW9kYWwoY2hhdCwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJleHBvcnRzLWRyb3Bkb3duXCIpISwgXCJNYXJrZG93biBjb2RlXCIsIHVuZGVmaW5lZCwgZSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIGV4cG9ydEFzVHdlZXQoKSB7XG4gICAgY29uc3QgcXVlcnkgPSBzYW5kYm94LmNyZWF0ZVVSTFF1ZXJ5V2l0aENvbXBpbGVyT3B0aW9ucyhzYW5kYm94KVxuICAgIGNvbnN0IGZ1bGxVUkwgPSBgJHtkb2N1bWVudC5sb2NhdGlvbi5wcm90b2NvbH0vLyR7ZG9jdW1lbnQubG9jYXRpb24uaG9zdH0ke2RvY3VtZW50LmxvY2F0aW9uLnBhdGhuYW1lfSR7cXVlcnl9YFxuXG4gICAgZG9jdW1lbnQubG9jYXRpb24uYXNzaWduKGBodHRwOi8vd3d3LnR3aXR0ZXIuY29tL3NoYXJlP3VybD0ke2Z1bGxVUkx9YClcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgb3BlblByb2plY3RJblN0YWNrQmxpdHosXG4gICAgb3BlblByb2plY3RJbkNvZGVTYW5kYm94LFxuICAgIGNvcHlBc01hcmtkb3duSXNzdWUsXG4gICAgY29weUZvckNoYXQsXG4gICAgY29weUZvckNoYXRXaXRoUHJldmlldyxcbiAgICBvcGVuSW5UU0FTVCxcbiAgICBvcGVuSW5CdWdXb3JrYmVuY2gsXG4gICAgZXhwb3J0QXNUd2VldCxcbiAgfVxufVxuIl19