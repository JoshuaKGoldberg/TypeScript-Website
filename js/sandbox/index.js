var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./typeAcquisition", "./theme", "./compilerOptions", "./vendor/lzstring.min", "./releases", "./getInitialCode", "./twoslashSupport", "./vendor/typescript-vfs"], function (require, exports, typeAcquisition_1, theme_1, compilerOptions_1, lzstring_min_1, releases_1, getInitialCode_1, twoslashSupport_1, tsvfs) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createTypeScriptSandbox = exports.defaultPlaygroundSettings = void 0;
    lzstring_min_1 = __importDefault(lzstring_min_1);
    tsvfs = __importStar(tsvfs);
    const languageType = (config) => (config.useJavaScript ? "javascript" : "typescript");
    // Basically android and monaco is pretty bad, this makes it less bad
    // See https://github.com/microsoft/pxt/pull/7099 for this, and the long
    // read is in https://github.com/microsoft/monaco-editor/issues/563
    const isAndroid = navigator && /android/i.test(navigator.userAgent);
    /** Default Monaco settings for playground */
    const sharedEditorOptions = {
        scrollBeyondLastLine: true,
        scrollBeyondLastColumn: 3,
        minimap: {
            enabled: false,
        },
        lightbulb: {
            enabled: true,
        },
        quickSuggestions: {
            other: !isAndroid,
            comments: !isAndroid,
            strings: !isAndroid,
        },
        acceptSuggestionOnCommitCharacter: !isAndroid,
        acceptSuggestionOnEnter: !isAndroid ? "on" : "off",
        accessibilitySupport: !isAndroid ? "on" : "off",
    };
    /** The default settings which we apply a partial over */
    function defaultPlaygroundSettings() {
        const config = {
            text: "",
            domID: "",
            compilerOptions: {},
            acquireTypes: true,
            useJavaScript: false,
            supportTwoslashCompilerOptions: false,
            logger: console,
        };
        return config;
    }
    exports.defaultPlaygroundSettings = defaultPlaygroundSettings;
    function defaultFilePath(config, compilerOptions, monaco) {
        const isJSX = compilerOptions.jsx !== monaco.languages.typescript.JsxEmit.None;
        const fileExt = config.useJavaScript ? "js" : "ts";
        const ext = isJSX ? fileExt + "x" : fileExt;
        return "input." + ext;
    }
    /** Creates a monaco file reference, basically a fancy path */
    function createFileUri(config, compilerOptions, monaco) {
        return monaco.Uri.file(defaultFilePath(config, compilerOptions, monaco));
    }
    /** Creates a sandbox editor, and returns a set of useful functions and the editor */
    const createTypeScriptSandbox = (partialConfig, monaco, ts) => {
        const config = Object.assign(Object.assign({}, defaultPlaygroundSettings()), partialConfig);
        if (!("domID" in config) && !("elementToAppend" in config))
            throw new Error("You did not provide a domID or elementToAppend");
        const defaultText = config.suppressAutomaticallyGettingDefaultText
            ? config.text
            : getInitialCode_1.getInitialCode(config.text, document.location);
        // Defaults
        const compilerDefaults = compilerOptions_1.getDefaultSandboxCompilerOptions(config, monaco);
        // Grab the compiler flags via the query params
        let compilerOptions;
        if (!config.suppressAutomaticallyGettingCompilerFlags) {
            const params = new URLSearchParams(location.search);
            let queryParamCompilerOptions = compilerOptions_1.getCompilerOptionsFromParams(compilerDefaults, params);
            if (Object.keys(queryParamCompilerOptions).length)
                config.logger.log("[Compiler] Found compiler options in query params: ", queryParamCompilerOptions);
            compilerOptions = Object.assign(Object.assign({}, compilerDefaults), queryParamCompilerOptions);
        }
        else {
            compilerOptions = compilerDefaults;
        }
        // Don't allow a state like allowJs = false, and useJavascript = true
        if (config.useJavaScript) {
            compilerOptions.allowJs = true;
        }
        const language = languageType(config);
        const filePath = createFileUri(config, compilerOptions, monaco);
        const element = "domID" in config ? document.getElementById(config.domID) : config.elementToAppend;
        const model = monaco.editor.createModel(defaultText, language, filePath);
        monaco.editor.defineTheme("sandbox", theme_1.sandboxTheme);
        monaco.editor.defineTheme("sandbox-dark", theme_1.sandboxThemeDark);
        monaco.editor.setTheme("sandbox");
        const monacoSettings = Object.assign({ model }, sharedEditorOptions, config.monacoSettings || {});
        const editor = monaco.editor.create(element, monacoSettings);
        const getWorker = config.useJavaScript
            ? monaco.languages.typescript.getJavaScriptWorker
            : monaco.languages.typescript.getTypeScriptWorker;
        const defaults = config.useJavaScript
            ? monaco.languages.typescript.javascriptDefaults
            : monaco.languages.typescript.typescriptDefaults;
        defaults.setDiagnosticsOptions(Object.assign(Object.assign({}, defaults.getDiagnosticsOptions()), { noSemanticValidation: false, 
            // This is when tslib is not found
            diagnosticCodesToIgnore: [2354] }));
        // In the future it'd be good to add support for an 'add many files'
        const addLibraryToRuntime = (code, path) => {
            defaults.addExtraLib(code, path);
            const uri = monaco.Uri.file(path);
            if (monaco.editor.getModel(uri) === null) {
                monaco.editor.createModel(code, "javascript", uri);
            }
            config.logger.log(`[ATA] Adding ${path} to runtime`);
        };
        const getTwoSlashComplierOptions = twoslashSupport_1.extractTwoSlashComplierOptions(ts);
        // Auto-complete twoslash comments
        if (config.supportTwoslashCompilerOptions) {
            const langs = ["javascript", "typescript"];
            langs.forEach(l => monaco.languages.registerCompletionItemProvider(l, {
                triggerCharacters: ["@", "/", "-"],
                provideCompletionItems: twoslashSupport_1.twoslashCompletions(ts, monaco),
            }));
        }
        const textUpdated = () => {
            const code = editor.getModel().getValue();
            if (config.supportTwoslashCompilerOptions) {
                const configOpts = getTwoSlashComplierOptions(code);
                updateCompilerSettings(configOpts);
            }
            if (config.acquireTypes) {
                typeAcquisition_1.detectNewImportsToAcquireTypeFor(code, addLibraryToRuntime, window.fetch.bind(window), config);
            }
        };
        // Debounced sandbox features like twoslash and type acquisition to once every second
        let debouncingTimer = false;
        editor.onDidChangeModelContent(_e => {
            if (debouncingTimer)
                return;
            debouncingTimer = true;
            setTimeout(() => {
                debouncingTimer = false;
                textUpdated();
            }, 1000);
        });
        config.logger.log("[Compiler] Set compiler options: ", compilerOptions);
        defaults.setCompilerOptions(compilerOptions);
        // Grab types last so that it logs in a logical way
        if (config.acquireTypes) {
            // Take the code from the editor right away
            const code = editor.getModel().getValue();
            typeAcquisition_1.detectNewImportsToAcquireTypeFor(code, addLibraryToRuntime, window.fetch.bind(window), config);
        }
        // To let clients plug into compiler settings changes
        let didUpdateCompilerSettings = (opts) => { };
        const updateCompilerSettings = (opts) => {
            const newKeys = Object.keys(opts);
            if (!newKeys.length)
                return;
            // Don't update a compiler setting if it's the same
            // as the current setting
            newKeys.forEach(key => {
                if (compilerOptions[key] == opts[key])
                    delete opts[key];
            });
            if (!Object.keys(opts).length)
                return;
            config.logger.log("[Compiler] Updating compiler options: ", opts);
            compilerOptions = Object.assign(Object.assign({}, compilerOptions), opts);
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const updateCompilerSetting = (key, value) => {
            config.logger.log("[Compiler] Setting compiler options ", key, "to", value);
            compilerOptions[key] = value;
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const setCompilerSettings = (opts) => {
            config.logger.log("[Compiler] Setting compiler options: ", opts);
            compilerOptions = opts;
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const getCompilerOptions = () => {
            return compilerOptions;
        };
        const setDidUpdateCompilerSettings = (func) => {
            didUpdateCompilerSettings = func;
        };
        /** Gets the results of compiling your editor's code */
        const getEmitResult = () => __awaiter(void 0, void 0, void 0, function* () {
            const model = editor.getModel();
            const client = yield getWorkerProcess();
            return yield client.getEmitOutput(model.uri.toString());
        });
        /** Gets the JS  of compiling your editor's code */
        const getRunnableJS = () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield getEmitResult();
            const firstJS = result.outputFiles.find((o) => o.name.endsWith(".js") || o.name.endsWith(".jsx"));
            return (firstJS && firstJS.text) || "";
        });
        /** Gets the DTS for the JS/TS  of compiling your editor's code */
        const getDTSForCode = () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield getEmitResult();
            return result.outputFiles.find((o) => o.name.endsWith(".d.ts")).text;
        });
        const getWorkerProcess = () => __awaiter(void 0, void 0, void 0, function* () {
            const worker = yield getWorker();
            // @ts-ignore
            return yield worker(model.uri);
        });
        const getDomNode = () => editor.getDomNode();
        const getModel = () => editor.getModel();
        const getText = () => getModel().getValue();
        const setText = (text) => getModel().setValue(text);
        const setupTSVFS = () => __awaiter(void 0, void 0, void 0, function* () {
            const fsMap = yield tsvfs.createDefaultMapFromCDN(compilerOptions, ts.version, true, ts, lzstring_min_1.default);
            fsMap.set(filePath.path, getText());
            const system = tsvfs.createSystem(fsMap);
            const host = tsvfs.createVirtualCompilerHost(system, compilerOptions, ts);
            const program = ts.createProgram({
                rootNames: [...fsMap.keys()],
                options: compilerOptions,
                host: host.compilerHost,
            });
            return {
                program,
                system,
                host,
                fsMap,
            };
        });
        /**
         * Creates a TS Program, if you're doing anything complex
         * it's likely you want setupTSVFS instead and can pull program out from that
         *
         * Warning: Runs on the main thread
         */
        const createTSProgram = () => __awaiter(void 0, void 0, void 0, function* () {
            const tsvfs = yield setupTSVFS();
            return tsvfs.program;
        });
        const getAST = () => __awaiter(void 0, void 0, void 0, function* () {
            const program = yield createTSProgram();
            program.emit();
            return program.getSourceFile(filePath.path);
        });
        // Pass along the supported releases for the playground
        const supportedVersions = releases_1.supportedReleases;
        textUpdated();
        return {
            /** The same config you passed in */
            config,
            /** A list of TypeScript versions you can use with the TypeScript sandbox */
            supportedVersions,
            /** The monaco editor instance */
            editor,
            /** Either "typescript" or "javascript" depending on your config */
            language,
            /** The outer monaco module, the result of require("monaco-editor")  */
            monaco,
            /** Gets a monaco-typescript worker, this will give you access to a language server. Note: prefer this for language server work because it happens on a webworker . */
            getWorkerProcess,
            /** A copy of require("@typescript/vfs") this can be used to quickly set up an in-memory compiler runs for ASTs, or to get complex language server results (anything above has to be serialized when passed)*/
            tsvfs,
            /** Get all the different emitted files after TypeScript is run */
            getEmitResult,
            /** Gets just the JavaScript for your sandbox, will transpile if in TS only */
            getRunnableJS,
            /** Gets the DTS output of the main code in the editor */
            getDTSForCode,
            /** The monaco-editor dom node, used for showing/hiding the editor */
            getDomNode,
            /** The model is an object which monaco uses to keep track of text in the editor. Use this to directly modify the text in the editor */
            getModel,
            /** Gets the text of the main model, which is the text in the editor */
            getText,
            /** Shortcut for setting the model's text content which would update the editor */
            setText,
            /** Gets the AST of the current text in monaco - uses `createTSProgram`, so the performance caveat applies there too */
            getAST,
            /** The module you get from require("typescript") */
            ts,
            /** Create a new Program, a TypeScript data model which represents the entire project. As well as some of the
             * primitive objects you would normally need to do work with the files.
             *
             * The first time this is called it has to download all the DTS files which is needed for an exact compiler run. Which
             * at max is about 1.5MB - after that subsequent downloads of dts lib files come from localStorage.
             *
             * Try to use this sparingly as it can be computationally expensive, at the minimum you should be using the debounced setup.
             *
             * TODO: It would be good to create an easy way to have a single program instance which is updated for you
             * when the monaco model changes.
             */
            setupTSVFS,
            /** Uses the above call setupTSVFS, but only returns the program */
            createTSProgram,
            /** The Sandbox's default compiler options  */
            compilerDefaults,
            /** The Sandbox's current compiler options */
            getCompilerOptions,
            /** Replace the Sandbox's compiler options */
            setCompilerSettings,
            /** Overwrite the Sandbox's compiler options */
            updateCompilerSetting,
            /** Update a single compiler option in the SAndbox */
            updateCompilerSettings,
            /** A way to get callbacks when compiler settings have changed */
            setDidUpdateCompilerSettings,
            /** A copy of lzstring, which is used to archive/unarchive code */
            lzstring: lzstring_min_1.default,
            /** Returns compiler options found in the params of the current page */
            createURLQueryWithCompilerOptions: compilerOptions_1.createURLQueryWithCompilerOptions,
            /** Returns compiler options in the source code using twoslash notation */
            getTwoSlashComplierOptions,
            /** Gets to the current monaco-language, this is how you talk to the background webworkers */
            languageServiceDefaults: defaults,
            /** The path which represents the current file using the current compiler options */
            filepath: filePath.path,
        };
    };
    exports.createTypeScriptSandbox = createTypeScriptSandbox;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zYW5kYm94L3NyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBa0RBLE1BQU0sWUFBWSxHQUFHLENBQUMsTUFBd0IsRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBRXZHLHFFQUFxRTtJQUNyRSx3RUFBd0U7SUFDeEUsbUVBQW1FO0lBQ25FLE1BQU0sU0FBUyxHQUFHLFNBQVMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUVuRSw2Q0FBNkM7SUFDN0MsTUFBTSxtQkFBbUIsR0FBa0Q7UUFDekUsb0JBQW9CLEVBQUUsSUFBSTtRQUMxQixzQkFBc0IsRUFBRSxDQUFDO1FBQ3pCLE9BQU8sRUFBRTtZQUNQLE9BQU8sRUFBRSxLQUFLO1NBQ2Y7UUFDRCxTQUFTLEVBQUU7WUFDVCxPQUFPLEVBQUUsSUFBSTtTQUNkO1FBQ0QsZ0JBQWdCLEVBQUU7WUFDaEIsS0FBSyxFQUFFLENBQUMsU0FBUztZQUNqQixRQUFRLEVBQUUsQ0FBQyxTQUFTO1lBQ3BCLE9BQU8sRUFBRSxDQUFDLFNBQVM7U0FDcEI7UUFDRCxpQ0FBaUMsRUFBRSxDQUFDLFNBQVM7UUFDN0MsdUJBQXVCLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSztRQUNsRCxvQkFBb0IsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLO0tBQ2hELENBQUE7SUFFRCx5REFBeUQ7SUFDekQsU0FBZ0IseUJBQXlCO1FBQ3ZDLE1BQU0sTUFBTSxHQUFxQjtZQUMvQixJQUFJLEVBQUUsRUFBRTtZ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LE1BQU07WUFDTixzS0FBc0s7WUFDdEssZ0JBQWdCO1lBQ2hCLDhNQUE4TTtZQUM5TSxLQUFLO1lBQ0wsa0VBQWtFO1lBQ2xFLGFBQWE7WUFDYiw4RUFBOEU7WUFDOUUsYUFBYTtZQUNiLHlEQUF5RDtZQUN6RCxhQUFhO1lBQ2IscUVBQXFFO1lBQ3JFLFVBQVU7WUFDVix1SUFBdUk7WUFDdkksUUFBUTtZQUNSLHVFQUF1RTtZQUN2RSxPQUFPO1lBQ1Asa0ZBQWtGO1lBQ2xGLE9BQU87WUFDUCx1SEFBdUg7WUFDdkgsTUFBTTtZQUNOLG9EQUFvRDtZQUNwRCxFQUFFO1lBQ0Y7Ozs7Ozs7Ozs7ZUFVRztZQUNILFVBQVU7WUFDVixtRUFBbUU7WUFDbkUsZUFBZTtZQUNmLDhDQUE4QztZQUM5QyxnQkFBZ0I7WUFDaEIsNkNBQTZDO1lBQzdDLGtCQUFrQjtZQUNsQiw2Q0FBNkM7WUFDN0MsbUJBQW1CO1lBQ25CLCtDQUErQztZQUMvQyxxQkFBcUI7WUFDckIscURBQXFEO1lBQ3JELHNCQUFzQjtZQUN0QixpRUFBaUU7WUFDakUsNEJBQTRCO1lBQzVCLGtFQUFrRTtZQUNsRSxRQUFRLEVBQVIsc0JBQVE7WUFDUix1RUFBdUU7WUFDdkUsaUNBQWlDLEVBQWpDLG1EQUFpQztZQUNqQywwRUFBMEU7WUFDMUUsMEJBQTBCO1lBQzFCLDZGQUE2RjtZQUM3Rix1QkFBdUIsRUFBRSxRQUFRO1lBQ2pDLG9GQUFvRjtZQUNwRixRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUk7U0FDeEIsQ0FBQTtJQUNILENBQUMsQ0FBQTtJQWxUWSxRQUFBLHVCQUF1QiwyQkFrVG5DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZGV0ZWN0TmV3SW1wb3J0c1RvQWNxdWlyZVR5cGVGb3IgfSBmcm9tIFwiLi90eXBlQWNxdWlzaXRpb25cIlxuaW1wb3J0IHsgc2FuZGJveFRoZW1lLCBzYW5kYm94VGhlbWVEYXJrIH0gZnJvbSBcIi4vdGhlbWVcIlxuaW1wb3J0IHsgVHlwZVNjcmlwdFdvcmtlciB9IGZyb20gXCIuL3RzV29ya2VyXCJcbmltcG9ydCB7XG4gIGdldERlZmF1bHRTYW5kYm94Q29tcGlsZXJPcHRpb25zLFxuICBnZXRDb21waWxlck9wdGlvbnNGcm9tUGFyYW1zLFxuICBjcmVhdGVVUkxRdWVyeVdpdGhDb21waWxlck9wdGlvbnMsXG59IGZyb20gXCIuL2NvbXBpbGVyT3B0aW9uc1wiXG5pbXBvcnQgbHpzdHJpbmcgZnJvbSBcIi4vdmVuZG9yL2x6c3RyaW5nLm1pblwiXG5pbXBvcnQgeyBzdXBwb3J0ZWRSZWxlYXNlcyB9IGZyb20gXCIuL3JlbGVhc2VzXCJcbmltcG9ydCB7IGdldEluaXRpYWxDb2RlIH0gZnJvbSBcIi4vZ2V0SW5pdGlhbENvZGVcIlxuaW1wb3J0IHsgZXh0cmFjdFR3b1NsYXNoQ29tcGxpZXJPcHRpb25zLCB0d29zbGFzaENvbXBsZXRpb25zIH0gZnJvbSBcIi4vdHdvc2xhc2hTdXBwb3J0XCJcbmltcG9ydCAqIGFzIHRzdmZzIGZyb20gXCIuL3ZlbmRvci90eXBlc2NyaXB0LXZmc1wiXG5cbnR5cGUgQ29tcGlsZXJPcHRpb25zID0gaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKS5sYW5ndWFnZXMudHlwZXNjcmlwdC5Db21waWxlck9wdGlvbnNcbnR5cGUgTW9uYWNvID0gdHlwZW9mIGltcG9ydChcIm1vbmFjby1lZGl0b3JcIilcblxuLyoqXG4gKiBUaGVzZSBhcmUgc2V0dGluZ3MgZm9yIHRoZSBwbGF5Z3JvdW5kIHdoaWNoIGFyZSB0aGUgZXF1aXZhbGVudCB0byBwcm9wcyBpbiBSZWFjdFxuICogYW55IGNoYW5nZXMgdG8gaXQgc2hvdWxkIHJlcXVpcmUgYSBuZXcgc2V0dXAgb2YgdGhlIHBsYXlncm91bmRcbiAqL1xuZXhwb3J0IHR5cGUgUGxheWdyb3VuZENvbmZpZyA9IHtcbiAgLyoqIFRoZSBkZWZhdWx0IHNvdXJjZSBjb2RlIGZvciB0aGUgcGxheWdyb3VuZCAqL1xuICB0ZXh0OiBzdHJpbmdcbiAgLyoqIFNob3VsZCBpdCBydW4gdGhlIHRzIG9yIGpzIElERSBzZXJ2aWNlcyAqL1xuICB1c2VKYXZhU2NyaXB0OiBib29sZWFuXG4gIC8qKiBDb21waWxlciBvcHRpb25zIHdoaWNoIGFyZSBhdXRvbWF0aWNhbGx5IGp1c3QgZm9yd2FyZGVkIG9uICovXG4gIGNvbXBpbGVyT3B0aW9uczogQ29tcGlsZXJPcHRpb25zXG4gIC8qKiBPcHRpb25hbCBtb25hY28gc2V0dGluZ3Mgb3ZlcnJpZGVzICovXG4gIG1vbmFjb1NldHRpbmdzPzogaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKS5lZGl0b3IuSUVkaXRvck9wdGlvbnNcbiAgLyoqIEFjcXVpcmUgdHlwZXMgdmlhIHR5cGUgYWNxdWlzaXRpb24gKi9cbiAgYWNxdWlyZVR5cGVzOiBib29sZWFuXG4gIC8qKiBTdXBwb3J0IHR3b3NsYXNoIGNvbXBpbGVyIG9wdGlvbnMgKi9cbiAgc3VwcG9ydFR3b3NsYXNoQ29tcGlsZXJPcHRpb25zOiBib29sZWFuXG4gIC8qKiBHZXQgdGhlIHRleHQgdmlhIHF1ZXJ5IHBhcmFtcyBhbmQgbG9jYWwgc3RvcmFnZSwgdXNlZnVsIHdoZW4gdGhlIGVkaXRvciBpcyB0aGUgbWFpbiBleHBlcmllbmNlICovXG4gIHN1cHByZXNzQXV0b21hdGljYWxseUdldHRpbmdEZWZhdWx0VGV4dD86IHRydWVcbiAgLyoqIFN1cHByZXNzIHNldHRpbmcgY29tcGlsZXIgb3B0aW9ucyBmcm9tIHRoZSBjb21waWxlciBmbGFncyBmcm9tIHF1ZXJ5IHBhcmFtcyAqL1xuICBzdXBwcmVzc0F1dG9tYXRpY2FsbHlHZXR0aW5nQ29tcGlsZXJGbGFncz86IHRydWVcbiAgLyoqIExvZ2dpbmcgc3lzdGVtICovXG4gIGxvZ2dlcjoge1xuICAgIGxvZzogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkXG4gICAgZXJyb3I6ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZFxuICAgIGdyb3VwQ29sbGFwc2VkOiAoLi4uYXJnczogYW55W10pID0+IHZvaWRcbiAgICBncm91cEVuZDogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkXG4gIH1cbn0gJiAoXG4gIHwgeyAvKiogdGhlSUQgb2YgYSBkb20gbm9kZSB0byBhZGQgbW9uYWNvIHRvICovIGRvbUlEOiBzdHJpbmcgfVxuICB8IHsgLyoqIHRoZUlEIG9mIGEgZG9tIG5vZGUgdG8gYWRkIG1vbmFjbyB0byAqLyBlbGVtZW50VG9BcHBlbmQ6IEhUTUxFbGVtZW50IH1cbilcblxuY29uc3QgbGFuZ3VhZ2VUeXBlID0gKGNvbmZpZzogUGxheWdyb3VuZENvbmZpZykgPT4gKGNvbmZpZy51c2VKYXZhU2NyaXB0ID8gXCJqYXZhc2NyaXB0XCIgOiBcInR5cGVzY3JpcHRcIilcblxuLy8gQmFzaWNhbGx5IGFuZHJvaWQgYW5kIG1vbmFjbyBpcyBwcmV0dHkgYmFkLCB0aGlzIG1ha2VzIGl0IGxlc3MgYmFkXG4vLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9weHQvcHVsbC83MDk5IGZvciB0aGlzLCBhbmQgdGhlIGxvbmdcbi8vIHJlYWQgaXMgaW4gaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9tb25hY28tZWRpdG9yL2lzc3Vlcy81NjNcbmNvbnN0IGlzQW5kcm9pZCA9IG5hdmlnYXRvciAmJiAvYW5kcm9pZC9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudClcblxuLyoqIERlZmF1bHQgTW9uYWNvIHNldHRpbmdzIGZvciBwbGF5Z3JvdW5kICovXG5jb25zdCBzaGFyZWRFZGl0b3JPcHRpb25zOiBpbXBvcnQoXCJtb25hY28tZWRpdG9yXCIpLmVkaXRvci5JRWRpdG9yT3B0aW9ucyA9IHtcbiAgc2Nyb2xsQmV5b25kTGFzdExpbmU6IHRydWUsXG4gIHNjcm9sbEJleW9uZExhc3RDb2x1bW46IDMsXG4gIG1pbmltYXA6IHtcbiAgICBlbmFibGVkOiBmYWxzZSxcbiAgfSxcbiAgbGlnaHRidWxiOiB7XG4gICAgZW5hYmxlZDogdHJ1ZSxcbiAgfSxcbiAgcXVpY2tTdWdnZXN0aW9uczoge1xuICAgIG90aGVyOiAhaXNBbmRyb2lkLFxuICAgIGNvbW1lbnRzOiAhaXNBbmRyb2lkLFxuICAgIHN0cmluZ3M6ICFpc0FuZHJvaWQsXG4gIH0sXG4gIGFjY2VwdFN1Z2dlc3Rpb25PbkNvbW1pdENoYXJhY3RlcjogIWlzQW5kcm9pZCxcbiAgYWNjZXB0U3VnZ2VzdGlvbk9uRW50ZXI6ICFpc0FuZHJvaWQgPyBcIm9uXCIgOiBcIm9mZlwiLFxuICBhY2Nlc3NpYmlsaXR5U3VwcG9ydDogIWlzQW5kcm9pZCA/IFwib25cIiA6IFwib2ZmXCIsXG59XG5cbi8qKiBUaGUgZGVmYXVsdCBzZXR0aW5ncyB3aGljaCB3ZSBhcHBseSBhIHBhcnRpYWwgb3ZlciAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRQbGF5Z3JvdW5kU2V0dGluZ3MoKSB7XG4gIGNvbnN0IGNvbmZpZzogUGxheWdyb3VuZENvbmZpZyA9IHtcbiAgICB0ZXh0OiBcIlwiLFxuICAgIGRvbUlEOiBcIlwiLFxuICAgIGNvbXBpbGVyT3B0aW9uczoge30sXG4gICAgYWNxdWlyZVR5cGVzOiB0cnVlLFxuICAgIHVzZUphdmFTY3JpcHQ6IGZhbHNlLFxuICAgIHN1cHBvcnRUd29zbGFzaENvbXBpbGVyT3B0aW9uczogZmFsc2UsXG4gICAgbG9nZ2VyOiBjb25zb2xlLFxuICB9XG4gIHJldHVybiBjb25maWdcbn1cblxuZnVuY3Rpb24gZGVmYXVsdEZpbGVQYXRoKGNvbmZpZzogUGxheWdyb3VuZENvbmZpZywgY29tcGlsZXJPcHRpb25zOiBDb21waWxlck9wdGlvbnMsIG1vbmFjbzogTW9uYWNvKSB7XG4gIGNvbnN0IGlzSlNYID0gY29tcGlsZXJPcHRpb25zLmpzeCAhPT0gbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LkpzeEVtaXQuTm9uZVxuICBjb25zdCBmaWxlRXh0ID0gY29uZmlnLnVzZUphdmFTY3JpcHQgPyBcImpzXCIgOiBcInRzXCJcbiAgY29uc3QgZXh0ID0gaXNKU1ggPyBmaWxlRXh0ICsgXCJ4XCIgOiBmaWxlRXh0XG4gIHJldHVybiBcImlucHV0LlwiICsgZXh0XG59XG5cbi8qKiBDcmVhdGVzIGEgbW9uYWNvIGZpbGUgcmVmZXJlbmNlLCBiYXNpY2FsbHkgYSBmYW5jeSBwYXRoICovXG5mdW5jdGlvbiBjcmVhdGVGaWxlVXJpKGNvbmZpZzogUGxheWdyb3VuZENvbmZpZywgY29tcGlsZXJPcHRpb25zOiBDb21waWxlck9wdGlvbnMsIG1vbmFjbzogTW9uYWNvKSB7XG4gIHJldHVybiBtb25hY28uVXJpLmZpbGUoZGVmYXVsdEZpbGVQYXRoKGNvbmZpZywgY29tcGlsZXJPcHRpb25zLCBtb25hY28pKVxufVxuXG4vKiogQ3JlYXRlcyBhIHNhbmRib3ggZWRpdG9yLCBhbmQgcmV0dXJucyBhIHNldCBvZiB1c2VmdWwgZnVuY3Rpb25zIGFuZCB0aGUgZWRpdG9yICovXG5leHBvcnQgY29uc3QgY3JlYXRlVHlwZVNjcmlwdFNhbmRib3ggPSAoXG4gIHBhcnRpYWxDb25maWc6IFBhcnRpYWw8UGxheWdyb3VuZENvbmZpZz4sXG4gIG1vbmFjbzogTW9uYWNvLFxuICB0czogdHlwZW9mIGltcG9ydChcInR5cGVzY3JpcHRcIilcbikgPT4ge1xuICBjb25zdCBjb25maWcgPSB7IC4uLmRlZmF1bHRQbGF5Z3JvdW5kU2V0dGluZ3MoKSwgLi4ucGFydGlhbENvbmZpZyB9XG4gIGlmICghKFwiZG9tSURcIiBpbiBjb25maWcpICYmICEoXCJlbGVtZW50VG9BcHBlbmRcIiBpbiBjb25maWcpKVxuICAgIHRocm93IG5ldyBFcnJvcihcIllvdSBkaWQgbm90IHByb3ZpZGUgYSBkb21JRCBvciBlbGVtZW50VG9BcHBlbmRcIilcblxuICBjb25zdCBkZWZhdWx0VGV4dCA9IGNvbmZpZy5zdXBwcmVzc0F1dG9tYXRpY2FsbHlHZXR0aW5nRGVmYXVsdFRleHRcbiAgICA/IGNvbmZpZy50ZXh0XG4gICAgOiBnZXRJbml0aWFsQ29kZShjb25maWcudGV4dCwgZG9jdW1lbnQubG9jYXRpb24pXG5cbiAgLy8gRGVmYXVsdHNcbiAgY29uc3QgY29tcGlsZXJEZWZhdWx0cyA9IGdldERlZmF1bHRTYW5kYm94Q29tcGlsZXJPcHRpb25zKGNvbmZpZywgbW9uYWNvKVxuXG4gIC8vIEdyYWIgdGhlIGNvbXBpbGVyIGZsYWdzIHZpYSB0aGUgcXVlcnkgcGFyYW1zXG4gIGxldCBjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9uc1xuICBpZiAoIWNvbmZpZy5zdXBwcmVzc0F1dG9tYXRpY2FsbHlHZXR0aW5nQ29tcGlsZXJGbGFncykge1xuICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMobG9jYXRpb24uc2VhcmNoKVxuICAgIGxldCBxdWVyeVBhcmFtQ29tcGlsZXJPcHRpb25zID0gZ2V0Q29tcGlsZXJPcHRpb25zRnJvbVBhcmFtcyhjb21waWxlckRlZmF1bHRzLCBwYXJhbXMpXG4gICAgaWYgKE9iamVjdC5rZXlzKHF1ZXJ5UGFyYW1Db21waWxlck9wdGlvbnMpLmxlbmd0aClcbiAgICAgIGNvbmZpZy5sb2dnZXIubG9nKFwiW0NvbXBpbGVyXSBGb3VuZCBjb21waWxlciBvcHRpb25zIGluIHF1ZXJ5IHBhcmFtczogXCIsIHF1ZXJ5UGFyYW1Db21waWxlck9wdGlvbnMpXG4gICAgY29tcGlsZXJPcHRpb25zID0geyAuLi5jb21waWxlckRlZmF1bHRzLCAuLi5xdWVyeVBhcmFtQ29tcGlsZXJPcHRpb25zIH1cbiAgfSBlbHNlIHtcbiAgICBjb21waWxlck9wdGlvbnMgPSBjb21waWxlckRlZmF1bHRzXG4gIH1cblxuICAvLyBEb24ndCBhbGxvdyBhIHN0YXRlIGxpa2UgYWxsb3dKcyA9IGZhbHNlLCBhbmQgdXNlSmF2YXNjcmlwdCA9IHRydWVcbiAgaWYgKGNvbmZpZy51c2VKYXZhU2NyaXB0KSB7XG4gICAgY29tcGlsZXJPcHRpb25zLmFsbG93SnMgPSB0cnVlXG4gIH1cblxuICBjb25zdCBsYW5ndWFnZSA9IGxhbmd1YWdlVHlwZShjb25maWcpXG4gIGNvbnN0IGZpbGVQYXRoID0gY3JlYXRlRmlsZVVyaShjb25maWcsIGNvbXBpbGVyT3B0aW9ucywgbW9uYWNvKVxuICBjb25zdCBlbGVtZW50ID0gXCJkb21JRFwiIGluIGNvbmZpZyA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNvbmZpZy5kb21JRCkgOiAoY29uZmlnIGFzIGFueSkuZWxlbWVudFRvQXBwZW5kXG5cbiAgY29uc3QgbW9kZWwgPSBtb25hY28uZWRpdG9yLmNyZWF0ZU1vZGVsKGRlZmF1bHRUZXh0LCBsYW5ndWFnZSwgZmlsZVBhdGgpXG4gIG1vbmFjby5lZGl0b3IuZGVmaW5lVGhlbWUoXCJzYW5kYm94XCIsIHNhbmRib3hUaGVtZSlcbiAgbW9uYWNvLmVkaXRvci5kZWZpbmVUaGVtZShcInNhbmRib3gtZGFya1wiLCBzYW5kYm94VGhlbWVEYXJrKVxuICBtb25hY28uZWRpdG9yLnNldFRoZW1lKFwic2FuZGJveFwiKVxuXG4gIGNvbnN0IG1vbmFjb1NldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7IG1vZGVsIH0sIHNoYXJlZEVkaXRvck9wdGlvbnMsIGNvbmZpZy5tb25hY29TZXR0aW5ncyB8fCB7fSlcbiAgY29uc3QgZWRpdG9yID0gbW9uYWNvLmVkaXRvci5jcmVhdGUoZWxlbWVudCwgbW9uYWNvU2V0dGluZ3MpXG5cbiAgY29uc3QgZ2V0V29ya2VyID0gY29uZmlnLnVzZUphdmFTY3JpcHRcbiAgICA/IG1vbmFjby5sYW5ndWFnZXMudHlwZXNjcmlwdC5nZXRKYXZhU2NyaXB0V29ya2VyXG4gICAgOiBtb25hY28ubGFuZ3VhZ2VzLnR5cGVzY3JpcHQuZ2V0VHlwZVNjcmlwdFdvcmtlclxuXG4gIGNvbnN0IGRlZmF1bHRzID0gY29uZmlnLnVzZUphdmFTY3JpcHRcbiAgICA/IG1vbmFjby5sYW5ndWFnZXMudHlwZXNjcmlwdC5qYXZhc2NyaXB0RGVmYXVsdHNcbiAgICA6IG1vbmFjby5sYW5ndWFnZXMudHlwZXNjcmlwdC50eXBlc2NyaXB0RGVmYXVsdHNcblxuICBkZWZhdWx0cy5zZXREaWFnbm9zdGljc09wdGlvbnMoe1xuICAgIC4uLmRlZmF1bHRzLmdldERpYWdub3N0aWNzT3B0aW9ucygpLFxuICAgIG5vU2VtYW50aWNWYWxpZGF0aW9uOiBmYWxzZSxcbiAgICAvLyBUaGlzIGlzIHdoZW4gdHNsaWIgaXMgbm90IGZvdW5kXG4gICAgZGlhZ25vc3RpY0NvZGVzVG9JZ25vcmU6IFsyMzU0XSxcbiAgfSlcblxuICAvLyBJbiB0aGUgZnV0dXJlIGl0J2QgYmUgZ29vZCB0byBhZGQgc3VwcG9ydCBmb3IgYW4gJ2FkZCBtYW55IGZpbGVzJ1xuICBjb25zdCBhZGRMaWJyYXJ5VG9SdW50aW1lID0gKGNvZGU6IHN0cmluZywgcGF0aDogc3RyaW5nKSA9PiB7XG4gICAgZGVmYXVsdHMuYWRkRXh0cmFMaWIoY29kZSwgcGF0aClcbiAgICBjb25zdCB1cmkgPSBtb25hY28uVXJpLmZpbGUocGF0aClcbiAgICBpZiAobW9uYWNvLmVkaXRvci5nZXRNb2RlbCh1cmkpID09PSBudWxsKSB7XG4gICAgICBtb25hY28uZWRpdG9yLmNyZWF0ZU1vZGVsKGNvZGUsIFwiamF2YXNjcmlwdFwiLCB1cmkpXG4gICAgfVxuICAgIGNvbmZpZy5sb2dnZXIubG9nKGBbQVRBXSBBZGRpbmcgJHtwYXRofSB0byBydW50aW1lYClcbiAgfVxuXG4gIGNvbnN0IGdldFR3b1NsYXNoQ29tcGxpZXJPcHRpb25zID0gZXh0cmFjdFR3b1NsYXNoQ29tcGxpZXJPcHRpb25zKHRzKVxuXG4gIC8vIEF1dG8tY29tcGxldGUgdHdvc2xhc2ggY29tbWVudHNcbiAgaWYgKGNvbmZpZy5zdXBwb3J0VHdvc2xhc2hDb21waWxlck9wdGlvbnMpIHtcbiAgICBjb25zdCBsYW5ncyA9IFtcImphdmFzY3JpcHRcIiwgXCJ0eXBlc2NyaXB0XCJdXG4gICAgbGFuZ3MuZm9yRWFjaChsID0+XG4gICAgICBtb25hY28ubGFuZ3VhZ2VzLnJlZ2lzdGVyQ29tcGxldGlvbkl0ZW1Qcm92aWRlcihsLCB7XG4gICAgICAgIHRyaWdnZXJDaGFyYWN0ZXJzOiBbXCJAXCIsIFwiL1wiLCBcIi1cIl0sXG4gICAgICAgIHByb3ZpZGVDb21wbGV0aW9uSXRlbXM6IHR3b3NsYXNoQ29tcGxldGlvbnModHMsIG1vbmFjbyksXG4gICAgICB9KVxuICAgIClcbiAgfVxuXG4gIGNvbnN0IHRleHRVcGRhdGVkID0gKCkgPT4ge1xuICAgIGNvbnN0IGNvZGUgPSBlZGl0b3IuZ2V0TW9kZWwoKSEuZ2V0VmFsdWUoKVxuXG4gICAgaWYgKGNvbmZpZy5zdXBwb3J0VHdvc2xhc2hDb21waWxlck9wdGlvbnMpIHtcbiAgICAgIGNvbnN0IGNvbmZpZ09wdHMgPSBnZXRUd29TbGFzaENvbXBsaWVyT3B0aW9ucyhjb2RlKVxuICAgICAgdXBkYXRlQ29tcGlsZXJTZXR0aW5ncyhjb25maWdPcHRzKVxuICAgIH1cblxuICAgIGlmIChjb25maWcuYWNxdWlyZVR5cGVzKSB7XG4gICAgICBkZXRlY3ROZXdJbXBvcnRzVG9BY3F1aXJlVHlwZUZvcihjb2RlLCBhZGRMaWJyYXJ5VG9SdW50aW1lLCB3aW5kb3cuZmV0Y2guYmluZCh3aW5kb3cpLCBjb25maWcpXG4gICAgfVxuICB9XG5cbiAgLy8gRGVib3VuY2VkIHNhbmRib3ggZmVhdHVyZXMgbGlrZSB0d29zbGFzaCBhbmQgdHlwZSBhY3F1aXNpdGlvbiB0byBvbmNlIGV2ZXJ5IHNlY29uZFxuICBsZXQgZGVib3VuY2luZ1RpbWVyID0gZmFsc2VcbiAgZWRpdG9yLm9uRGlkQ2hhbmdlTW9kZWxDb250ZW50KF9lID0+IHtcbiAgICBpZiAoZGVib3VuY2luZ1RpbWVyKSByZXR1cm5cbiAgICBkZWJvdW5jaW5nVGltZXIgPSB0cnVlXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBkZWJvdW5jaW5nVGltZXIgPSBmYWxzZVxuICAgICAgdGV4dFVwZGF0ZWQoKVxuICAgIH0sIDEwMDApXG4gIH0pXG5cbiAgY29uZmlnLmxvZ2dlci5sb2coXCJbQ29tcGlsZXJdIFNldCBjb21waWxlciBvcHRpb25zOiBcIiwgY29tcGlsZXJPcHRpb25zKVxuICBkZWZhdWx0cy5zZXRDb21waWxlck9wdGlvbnMoY29tcGlsZXJPcHRpb25zKVxuXG4gIC8vIEdyYWIgdHlwZXMgbGFzdCBzbyB0aGF0IGl0IGxvZ3MgaW4gYSBsb2dpY2FsIHdheVxuICBpZiAoY29uZmlnLmFjcXVpcmVUeXBlcykge1xuICAgIC8vIFRha2UgdGhlIGNvZGUgZnJvbSB0aGUgZWRpdG9yIHJpZ2h0IGF3YXlcbiAgICBjb25zdCBjb2RlID0gZWRpdG9yLmdldE1vZGVsKCkhLmdldFZhbHVlKClcbiAgICBkZXRlY3ROZXdJbXBvcnRzVG9BY3F1aXJlVHlwZUZvcihjb2RlLCBhZGRMaWJyYXJ5VG9SdW50aW1lLCB3aW5kb3cuZmV0Y2guYmluZCh3aW5kb3cpLCBjb25maWcpXG4gIH1cblxuICAvLyBUbyBsZXQgY2xpZW50cyBwbHVnIGludG8gY29tcGlsZXIgc2V0dGluZ3MgY2hhbmdlc1xuICBsZXQgZGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyA9IChvcHRzOiBDb21waWxlck9wdGlvbnMpID0+IHt9XG5cbiAgY29uc3QgdXBkYXRlQ29tcGlsZXJTZXR0aW5ncyA9IChvcHRzOiBDb21waWxlck9wdGlvbnMpID0+IHtcbiAgICBjb25zdCBuZXdLZXlzID0gT2JqZWN0LmtleXMob3B0cylcbiAgICBpZiAoIW5ld0tleXMubGVuZ3RoKSByZXR1cm5cblxuICAgIC8vIERvbid0IHVwZGF0ZSBhIGNvbXBpbGVyIHNldHRpbmcgaWYgaXQncyB0aGUgc2FtZVxuICAgIC8vIGFzIHRoZSBjdXJyZW50IHNldHRpbmdcbiAgICBuZXdLZXlzLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIGlmIChjb21waWxlck9wdGlvbnNba2V5XSA9PSBvcHRzW2tleV0pIGRlbGV0ZSBvcHRzW2tleV1cbiAgICB9KVxuXG4gICAgaWYgKCFPYmplY3Qua2V5cyhvcHRzKS5sZW5ndGgpIHJldHVyblxuXG4gICAgY29uZmlnLmxvZ2dlci5sb2coXCJbQ29tcGlsZXJdIFVwZGF0aW5nIGNvbXBpbGVyIG9wdGlvbnM6IFwiLCBvcHRzKVxuXG4gICAgY29tcGlsZXJPcHRpb25zID0geyAuLi5jb21waWxlck9wdGlvbnMsIC4uLm9wdHMgfVxuICAgIGRlZmF1bHRzLnNldENvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMpXG4gICAgZGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyhjb21waWxlck9wdGlvbnMpXG4gIH1cblxuICBjb25zdCB1cGRhdGVDb21waWxlclNldHRpbmcgPSAoa2V5OiBrZXlvZiBDb21waWxlck9wdGlvbnMsIHZhbHVlOiBhbnkpID0+IHtcbiAgICBjb25maWcubG9nZ2VyLmxvZyhcIltDb21waWxlcl0gU2V0dGluZyBjb21waWxlciBvcHRpb25zIFwiLCBrZXksIFwidG9cIiwgdmFsdWUpXG4gICAgY29tcGlsZXJPcHRpb25zW2tleV0gPSB2YWx1ZVxuICAgIGRlZmF1bHRzLnNldENvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMpXG4gICAgZGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyhjb21waWxlck9wdGlvbnMpXG4gIH1cblxuICBjb25zdCBzZXRDb21waWxlclNldHRpbmdzID0gKG9wdHM6IENvbXBpbGVyT3B0aW9ucykgPT4ge1xuICAgIGNvbmZpZy5sb2dnZXIubG9nKFwiW0NvbXBpbGVyXSBTZXR0aW5nIGNvbXBpbGVyIG9wdGlvbnM6IFwiLCBvcHRzKVxuICAgIGNvbXBpbGVyT3B0aW9ucyA9IG9wdHNcbiAgICBkZWZhdWx0cy5zZXRDb21waWxlck9wdGlvbnMoY29tcGlsZXJPcHRpb25zKVxuICAgIGRpZFVwZGF0ZUNvbXBpbGVyU2V0dGluZ3MoY29tcGlsZXJPcHRpb25zKVxuICB9XG5cbiAgY29uc3QgZ2V0Q29tcGlsZXJPcHRpb25zID0gKCkgPT4ge1xuICAgIHJldHVybiBjb21waWxlck9wdGlvbnNcbiAgfVxuXG4gIGNvbnN0IHNldERpZFVwZGF0ZUNvbXBpbGVyU2V0dGluZ3MgPSAoZnVuYzogKG9wdHM6IENvbXBpbGVyT3B0aW9ucykgPT4gdm9pZCkgPT4ge1xuICAgIGRpZFVwZGF0ZUNvbXBpbGVyU2V0dGluZ3MgPSBmdW5jXG4gIH1cblxuICAvKiogR2V0cyB0aGUgcmVzdWx0cyBvZiBjb21waWxpbmcgeW91ciBlZGl0b3IncyBjb2RlICovXG4gIGNvbnN0IGdldEVtaXRSZXN1bHQgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgbW9kZWwgPSBlZGl0b3IuZ2V0TW9kZWwoKSFcblxuICAgIGNvbnN0IGNsaWVudCA9IGF3YWl0IGdldFdvcmtlclByb2Nlc3MoKVxuICAgIHJldHVybiBhd2FpdCBjbGllbnQuZ2V0RW1pdE91dHB1dChtb2RlbC51cmkudG9TdHJpbmcoKSlcbiAgfVxuXG4gIC8qKiBHZXRzIHRoZSBKUyAgb2YgY29tcGlsaW5nIHlvdXIgZWRpdG9yJ3MgY29kZSAqL1xuICBjb25zdCBnZXRSdW5uYWJsZUpTID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdldEVtaXRSZXN1bHQoKVxuICAgIGNvbnN0IGZpcnN0SlMgPSByZXN1bHQub3V0cHV0RmlsZXMuZmluZCgobzogYW55KSA9PiBvLm5hbWUuZW5kc1dpdGgoXCIuanNcIikgfHwgby5uYW1lLmVuZHNXaXRoKFwiLmpzeFwiKSlcbiAgICByZXR1cm4gKGZpcnN0SlMgJiYgZmlyc3RKUy50ZXh0KSB8fCBcIlwiXG4gIH1cblxuICAvKiogR2V0cyB0aGUgRFRTIGZvciB0aGUgSlMvVFMgIG9mIGNvbXBpbGluZyB5b3VyIGVkaXRvcidzIGNvZGUgKi9cbiAgY29uc3QgZ2V0RFRTRm9yQ29kZSA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBnZXRFbWl0UmVzdWx0KClcbiAgICByZXR1cm4gcmVzdWx0Lm91dHB1dEZpbGVzLmZpbmQoKG86IGFueSkgPT4gby5uYW1lLmVuZHNXaXRoKFwiLmQudHNcIikpIS50ZXh0XG4gIH1cblxuICBjb25zdCBnZXRXb3JrZXJQcm9jZXNzID0gYXN5bmMgKCk6IFByb21pc2U8VHlwZVNjcmlwdFdvcmtlcj4gPT4ge1xuICAgIGNvbnN0IHdvcmtlciA9IGF3YWl0IGdldFdvcmtlcigpXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHJldHVybiBhd2FpdCB3b3JrZXIobW9kZWwudXJpKVxuICB9XG5cbiAgY29uc3QgZ2V0RG9tTm9kZSA9ICgpID0+IGVkaXRvci5nZXREb21Ob2RlKCkhXG4gIGNvbnN0IGdldE1vZGVsID0gKCkgPT4gZWRpdG9yLmdldE1vZGVsKCkhXG4gIGNvbnN0IGdldFRleHQgPSAoKSA9PiBnZXRNb2RlbCgpLmdldFZhbHVlKClcbiAgY29uc3Qgc2V0VGV4dCA9ICh0ZXh0OiBzdHJpbmcpID0+IGdldE1vZGVsKCkuc2V0VmFsdWUodGV4dClcblxuICBjb25zdCBzZXR1cFRTVkZTID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGZzTWFwID0gYXdhaXQgdHN2ZnMuY3JlYXRlRGVmYXVsdE1hcEZyb21DRE4oY29tcGlsZXJPcHRpb25zLCB0cy52ZXJzaW9uLCB0cnVlLCB0cywgbHpzdHJpbmcpXG4gICAgZnNNYXAuc2V0KGZpbGVQYXRoLnBhdGgsIGdldFRleHQoKSlcblxuICAgIGNvbnN0IHN5c3RlbSA9IHRzdmZzLmNyZWF0ZVN5c3RlbShmc01hcClcbiAgICBjb25zdCBob3N0ID0gdHN2ZnMuY3JlYXRlVmlydHVhbENvbXBpbGVySG9zdChzeXN0ZW0sIGNvbXBpbGVyT3B0aW9ucywgdHMpXG5cbiAgICBjb25zdCBwcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbSh7XG4gICAgICByb290TmFtZXM6IFsuLi5mc01hcC5rZXlzKCldLFxuICAgICAgb3B0aW9uczogY29tcGlsZXJPcHRpb25zLFxuICAgICAgaG9zdDogaG9zdC5jb21waWxlckhvc3QsXG4gICAgfSlcblxuICAgIHJldHVybiB7XG4gICAgICBwcm9ncmFtLFxuICAgICAgc3lzdGVtLFxuICAgICAgaG9zdCxcbiAgICAgIGZzTWFwLFxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgVFMgUHJvZ3JhbSwgaWYgeW91J3JlIGRvaW5nIGFueXRoaW5nIGNvbXBsZXhcbiAgICogaXQncyBsaWtlbHkgeW91IHdhbnQgc2V0dXBUU1ZGUyBpbnN0ZWFkIGFuZCBjYW4gcHVsbCBwcm9ncmFtIG91dCBmcm9tIHRoYXRcbiAgICpcbiAgICogV2FybmluZzogUnVucyBvbiB0aGUgbWFpbiB0aHJlYWRcbiAgICovXG4gIGNvbnN0IGNyZWF0ZVRTUHJvZ3JhbSA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCB0c3ZmcyA9IGF3YWl0IHNldHVwVFNWRlMoKVxuICAgIHJldHVybiB0c3Zmcy5wcm9ncmFtXG4gIH1cblxuICBjb25zdCBnZXRBU1QgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgcHJvZ3JhbSA9IGF3YWl0IGNyZWF0ZVRTUHJvZ3JhbSgpXG4gICAgcHJvZ3JhbS5lbWl0KClcbiAgICByZXR1cm4gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGZpbGVQYXRoLnBhdGgpIVxuICB9XG5cbiAgLy8gUGFzcyBhbG9uZyB0aGUgc3VwcG9ydGVkIHJlbGVhc2VzIGZvciB0aGUgcGxheWdyb3VuZFxuICBjb25zdCBzdXBwb3J0ZWRWZXJzaW9ucyA9IHN1cHBvcnRlZFJlbGVhc2VzXG5cbiAgdGV4dFVwZGF0ZWQoKVxuXG4gIHJldHVybiB7XG4gICAgLyoqIFRoZSBzYW1lIGNvbmZpZyB5b3UgcGFzc2VkIGluICovXG4gICAgY29uZmlnLFxuICAgIC8qKiBBIGxpc3Qgb2YgVHlwZVNjcmlwdCB2ZXJzaW9ucyB5b3UgY2FuIHVzZSB3aXRoIHRoZSBUeXBlU2NyaXB0IHNhbmRib3ggKi9cbiAgICBzdXBwb3J0ZWRWZXJzaW9ucyxcbiAgICAvKiogVGhlIG1vbmFjbyBlZGl0b3IgaW5zdGFuY2UgKi9cbiAgICBlZGl0b3IsXG4gICAgLyoqIEVpdGhlciBcInR5cGVzY3JpcHRcIiBvciBcImphdmFzY3JpcHRcIiBkZXBlbmRpbmcgb24geW91ciBjb25maWcgKi9cbiAgICBsYW5ndWFnZSxcbiAgICAvKiogVGhlIG91dGVyIG1vbmFjbyBtb2R1bGUsIHRoZSByZXN1bHQgb2YgcmVxdWlyZShcIm1vbmFjby1lZGl0b3JcIikgICovXG4gICAgbW9uYWNvLFxuICAgIC8qKiBHZXRzIGEgbW9uYWNvLXR5cGVzY3JpcHQgd29ya2VyLCB0aGlzIHdpbGwgZ2l2ZSB5b3UgYWNjZXNzIHRvIGEgbGFuZ3VhZ2Ugc2VydmVyLiBOb3RlOiBwcmVmZXIgdGhpcyBmb3IgbGFuZ3VhZ2Ugc2VydmVyIHdvcmsgYmVjYXVzZSBpdCBoYXBwZW5zIG9uIGEgd2Vid29ya2VyIC4gKi9cbiAgICBnZXRXb3JrZXJQcm9jZXNzLFxuICAgIC8qKiBBIGNvcHkgb2YgcmVxdWlyZShcIkB0eXBlc2NyaXB0L3Zmc1wiKSB0aGlzIGNhbiBiZSB1c2VkIHRvIHF1aWNrbHkgc2V0IHVwIGFuIGluLW1lbW9yeSBjb21waWxlciBydW5zIGZvciBBU1RzLCBvciB0byBnZXQgY29tcGxleCBsYW5ndWFnZSBzZXJ2ZXIgcmVzdWx0cyAoYW55dGhpbmcgYWJvdmUgaGFzIHRvIGJlIHNlcmlhbGl6ZWQgd2hlbiBwYXNzZWQpKi9cbiAgICB0c3ZmcyxcbiAgICAvKiogR2V0IGFsbCB0aGUgZGlmZmVyZW50IGVtaXR0ZWQgZmlsZXMgYWZ0ZXIgVHlwZVNjcmlwdCBpcyBydW4gKi9cbiAgICBnZXRFbWl0UmVzdWx0LFxuICAgIC8qKiBHZXRzIGp1c3QgdGhlIEphdmFTY3JpcHQgZm9yIHlvdXIgc2FuZGJveCwgd2lsbCB0cmFuc3BpbGUgaWYgaW4gVFMgb25seSAqL1xuICAgIGdldFJ1bm5hYmxlSlMsXG4gICAgLyoqIEdldHMgdGhlIERUUyBvdXRwdXQgb2YgdGhlIG1haW4gY29kZSBpbiB0aGUgZWRpdG9yICovXG4gICAgZ2V0RFRTRm9yQ29kZSxcbiAgICAvKiogVGhlIG1vbmFjby1lZGl0b3IgZG9tIG5vZGUsIHVzZWQgZm9yIHNob3dpbmcvaGlkaW5nIHRoZSBlZGl0b3IgKi9cbiAgICBnZXREb21Ob2RlLFxuICAgIC8qKiBUaGUgbW9kZWwgaXMgYW4gb2JqZWN0IHdoaWNoIG1vbmFjbyB1c2VzIHRvIGtlZXAgdHJhY2sgb2YgdGV4dCBpbiB0aGUgZWRpdG9yLiBVc2UgdGhpcyB0byBkaXJlY3RseSBtb2RpZnkgdGhlIHRleHQgaW4gdGhlIGVkaXRvciAqL1xuICAgIGdldE1vZGVsLFxuICAgIC8qKiBHZXRzIHRoZSB0ZXh0IG9mIHRoZSBtYWluIG1vZGVsLCB3aGljaCBpcyB0aGUgdGV4dCBpbiB0aGUgZWRpdG9yICovXG4gICAgZ2V0VGV4dCxcbiAgICAvKiogU2hvcnRjdXQgZm9yIHNldHRpbmcgdGhlIG1vZGVsJ3MgdGV4dCBjb250ZW50IHdoaWNoIHdvdWxkIHVwZGF0ZSB0aGUgZWRpdG9yICovXG4gICAgc2V0VGV4dCxcbiAgICAvKiogR2V0cyB0aGUgQVNUIG9mIHRoZSBjdXJyZW50IHRleHQgaW4gbW9uYWNvIC0gdXNlcyBgY3JlYXRlVFNQcm9ncmFtYCwgc28gdGhlIHBlcmZvcm1hbmNlIGNhdmVhdCBhcHBsaWVzIHRoZXJlIHRvbyAqL1xuICAgIGdldEFTVCxcbiAgICAvKiogVGhlIG1vZHVsZSB5b3UgZ2V0IGZyb20gcmVxdWlyZShcInR5cGVzY3JpcHRcIikgKi9cbiAgICB0cyxcbiAgICAvKiogQ3JlYXRlIGEgbmV3IFByb2dyYW0sIGEgVHlwZVNjcmlwdCBkYXRhIG1vZGVsIHdoaWNoIHJlcHJlc2VudHMgdGhlIGVudGlyZSBwcm9qZWN0LiBBcyB3ZWxsIGFzIHNvbWUgb2YgdGhlXG4gICAgICogcHJpbWl0aXZlIG9iamVjdHMgeW91IHdvdWxkIG5vcm1hbGx5IG5lZWQgdG8gZG8gd29yayB3aXRoIHRoZSBmaWxlcy5cbiAgICAgKlxuICAgICAqIFRoZSBmaXJzdCB0aW1lIHRoaXMgaXMgY2FsbGVkIGl0IGhhcyB0byBkb3dubG9hZCBhbGwgdGhlIERUUyBmaWxlcyB3aGljaCBpcyBuZWVkZWQgZm9yIGFuIGV4YWN0IGNvbXBpbGVyIHJ1bi4gV2hpY2hcbiAgICAgKiBhdCBtYXggaXMgYWJvdXQgMS41TUIgLSBhZnRlciB0aGF0IHN1YnNlcXVlbnQgZG93bmxvYWRzIG9mIGR0cyBsaWIgZmlsZXMgY29tZSBmcm9tIGxvY2FsU3RvcmFnZS5cbiAgICAgKlxuICAgICAqIFRyeSB0byB1c2UgdGhpcyBzcGFyaW5nbHkgYXMgaXQgY2FuIGJlIGNvbXB1dGF0aW9uYWxseSBleHBlbnNpdmUsIGF0IHRoZSBtaW5pbXVtIHlvdSBzaG91bGQgYmUgdXNpbmcgdGhlIGRlYm91bmNlZCBzZXR1cC5cbiAgICAgKlxuICAgICAqIFRPRE86IEl0IHdvdWxkIGJlIGdvb2QgdG8gY3JlYXRlIGFuIGVhc3kgd2F5IHRvIGhhdmUgYSBzaW5nbGUgcHJvZ3JhbSBpbnN0YW5jZSB3aGljaCBpcyB1cGRhdGVkIGZvciB5b3VcbiAgICAgKiB3aGVuIHRoZSBtb25hY28gbW9kZWwgY2hhbmdlcy5cbiAgICAgKi9cbiAgICBzZXR1cFRTVkZTLFxuICAgIC8qKiBVc2VzIHRoZSBhYm92ZSBjYWxsIHNldHVwVFNWRlMsIGJ1dCBvbmx5IHJldHVybnMgdGhlIHByb2dyYW0gKi9cbiAgICBjcmVhdGVUU1Byb2dyYW0sXG4gICAgLyoqIFRoZSBTYW5kYm94J3MgZGVmYXVsdCBjb21waWxlciBvcHRpb25zICAqL1xuICAgIGNvbXBpbGVyRGVmYXVsdHMsXG4gICAgLyoqIFRoZSBTYW5kYm94J3MgY3VycmVudCBjb21waWxlciBvcHRpb25zICovXG4gICAgZ2V0Q29tcGlsZXJPcHRpb25zLFxuICAgIC8qKiBSZXBsYWNlIHRoZSBTYW5kYm94J3MgY29tcGlsZXIgb3B0aW9ucyAqL1xuICAgIHNldENvbXBpbGVyU2V0dGluZ3MsXG4gICAgLyoqIE92ZXJ3cml0ZSB0aGUgU2FuZGJveCdzIGNvbXBpbGVyIG9wdGlvbnMgKi9cbiAgICB1cGRhdGVDb21waWxlclNldHRpbmcsXG4gICAgLyoqIFVwZGF0ZSBhIHNpbmdsZSBjb21waWxlciBvcHRpb24gaW4gdGhlIFNBbmRib3ggKi9cbiAgICB1cGRhdGVDb21waWxlclNldHRpbmdzLFxuICAgIC8qKiBBIHdheSB0byBnZXQgY2FsbGJhY2tzIHdoZW4gY29tcGlsZXIgc2V0dGluZ3MgaGF2ZSBjaGFuZ2VkICovXG4gICAgc2V0RGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyxcbiAgICAvKiogQSBjb3B5IG9mIGx6c3RyaW5nLCB3aGljaCBpcyB1c2VkIHRvIGFyY2hpdmUvdW5hcmNoaXZlIGNvZGUgKi9cbiAgICBsenN0cmluZyxcbiAgICAvKiogUmV0dXJucyBjb21waWxlciBvcHRpb25zIGZvdW5kIGluIHRoZSBwYXJhbXMgb2YgdGhlIGN1cnJlbnQgcGFnZSAqL1xuICAgIGNyZWF0ZVVSTFF1ZXJ5V2l0aENvbXBpbGVyT3B0aW9ucyxcbiAgICAvKiogUmV0dXJucyBjb21waWxlciBvcHRpb25zIGluIHRoZSBzb3VyY2UgY29kZSB1c2luZyB0d29zbGFzaCBub3RhdGlvbiAqL1xuICAgIGdldFR3b1NsYXNoQ29tcGxpZXJPcHRpb25zLFxuICAgIC8qKiBHZXRzIHRvIHRoZSBjdXJyZW50IG1vbmFjby1sYW5ndWFnZSwgdGhpcyBpcyBob3cgeW91IHRhbGsgdG8gdGhlIGJhY2tncm91bmQgd2Vid29ya2VycyAqL1xuICAgIGxhbmd1YWdlU2VydmljZURlZmF1bHRzOiBkZWZhdWx0cyxcbiAgICAvKiogVGhlIHBhdGggd2hpY2ggcmVwcmVzZW50cyB0aGUgY3VycmVudCBmaWxlIHVzaW5nIHRoZSBjdXJyZW50IGNvbXBpbGVyIG9wdGlvbnMgKi9cbiAgICBmaWxlcGF0aDogZmlsZVBhdGgucGF0aCxcbiAgfVxufVxuXG5leHBvcnQgdHlwZSBTYW5kYm94ID0gUmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlVHlwZVNjcmlwdFNhbmRib3g+XG4iXX0=