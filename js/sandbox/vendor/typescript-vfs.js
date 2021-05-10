define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createVirtualLanguageServiceHost = exports.createVirtualCompilerHost = exports.createFSBackedSystem = exports.createSystem = exports.createDefaultMapFromCDN = exports.addFilesForTypesIntoFolder = exports.addAllFilesFromFolder = exports.createDefaultMapFromNodeModules = exports.knownLibFilesForCompilerOptions = exports.createVirtualTypeScriptEnvironment = void 0;
    let hasLocalStorage = false;
    try {
        hasLocalStorage = typeof localStorage !== `undefined`;
    }
    catch (error) { }
    const hasProcess = typeof process !== `undefined`;
    const shouldDebug = (hasLocalStorage && localStorage.getItem("DEBUG")) || (hasProcess && process.env.DEBUG);
    const debugLog = shouldDebug ? console.log : (_message, ..._optionalParams) => "";
    /**
     * Makes a virtual copy of the TypeScript environment. This is the main API you want to be using with
     * @typescript/vfs. A lot of the other exposed functions are used by this function to get set up.
     *
     * @param sys an object which conforms to the TS Sys (a shim over read/write access to the fs)
     * @param rootFiles a list of files which are considered inside the project
     * @param ts a copy pf the TypeScript module
     * @param compilerOptions the options for this compiler run
     * @param customTransformers custom transformers for this compiler run
     */
    function createVirtualTypeScriptEnvironment(sys, rootFiles, ts, compilerOptions = {}, customTransformers) {
        const mergedCompilerOpts = Object.assign(Object.assign({}, defaultCompilerOptions(ts)), compilerOptions);
        const { languageServiceHost, updateFile } = createVirtualLanguageServiceHost(sys, rootFiles, mergedCompilerOpts, ts, customTransformers);
        const languageService = ts.createLanguageService(languageServiceHost);
        const diagnostics = languageService.getCompilerOptionsDiagnostics();
        if (diagnostics.length) {
            const compilerHost = createVirtualCompilerHost(sys, compilerOptions, ts);
            throw new Error(ts.formatDiagnostics(diagnostics, compilerHost.compilerHost));
        }
        return {
            // @ts-ignore
            name: "vfs",
            sys,
            languageService,
            getSourceFile: fileName => { var _a; return (_a = languageService.getProgram()) === null || _a === void 0 ? void 0 : _a.getSourceFile(fileName); },
            createFile: (fileName, content) => {
                updateFile(ts.createSourceFile(fileName, content, mergedCompilerOpts.target, false));
            },
            updateFile: (fileName, content, optPrevTextSpan) => {
                const prevSourceFile = languageService.getProgram().getSourceFile(fileName);
                if (!prevSourceFile) {
                    throw new Error("Did not find a source file for " + fileName);
                }
                const prevFullContents = prevSourceFile.text;
                // TODO: Validate if the default text span has a fencepost error?
                const prevTextSpan = optPrevTextSpan !== null && optPrevTextSpan !== void 0 ? optPrevTextSpan : ts.createTextSpan(0, prevFullContents.length);
                const newText = prevFullContents.slice(0, prevTextSpan.start) +
                    content +
                    prevFullContents.slice(prevTextSpan.start + prevTextSpan.length);
                const newSourceFile = ts.updateSourceFile(prevSourceFile, newText, {
                    span: prevTextSpan,
                    newLength: content.length,
                });
                updateFile(newSourceFile);
            },
        };
    }
    exports.createVirtualTypeScriptEnvironment = createVirtualTypeScriptEnvironment;
    /**
     * Grab the list of lib files for a particular target, will return a bit more than necessary (by including
     * the dom) but that's OK
     *
     * @param target The compiler settings target baseline
     * @param ts A copy of the TypeScript module
     */
    const knownLibFilesForCompilerOptions = (compilerOptions, ts) => {
        const target = compilerOptions.target || ts.ScriptTarget.ES5;
        const lib = compilerOptions.lib || [];
        const files = [
            "lib.d.ts",
            "lib.dom.d.ts",
            "lib.dom.iterable.d.ts",
            "lib.webworker.d.ts",
            "lib.webworker.importscripts.d.ts",
            "lib.scripthost.d.ts",
            "lib.es5.d.ts",
            "lib.es6.d.ts",
            "lib.es2015.collection.d.ts",
            "lib.es2015.core.d.ts",
            "lib.es2015.d.ts",
            "lib.es2015.generator.d.ts",
            "lib.es2015.iterable.d.ts",
            "lib.es2015.promise.d.ts",
            "lib.es2015.proxy.d.ts",
            "lib.es2015.reflect.d.ts",
            "lib.es2015.symbol.d.ts",
            "lib.es2015.symbol.wellknown.d.ts",
            "lib.es2016.array.include.d.ts",
            "lib.es2016.d.ts",
            "lib.es2016.full.d.ts",
            "lib.es2017.d.ts",
            "lib.es2017.full.d.ts",
            "lib.es2017.intl.d.ts",
            "lib.es2017.object.d.ts",
            "lib.es2017.sharedmemory.d.ts",
            "lib.es2017.string.d.ts",
            "lib.es2017.typedarrays.d.ts",
            "lib.es2018.asyncgenerator.d.ts",
            "lib.es2018.asynciterable.d.ts",
            "lib.es2018.d.ts",
            "lib.es2018.full.d.ts",
            "lib.es2018.intl.d.ts",
            "lib.es2018.promise.d.ts",
            "lib.es2018.regexp.d.ts",
            "lib.es2019.array.d.ts",
            "lib.es2019.d.ts",
            "lib.es2019.full.d.ts",
            "lib.es2019.object.d.ts",
            "lib.es2019.string.d.ts",
            "lib.es2019.symbol.d.ts",
            "lib.es2020.d.ts",
            "lib.es2020.full.d.ts",
            "lib.es2020.string.d.ts",
            "lib.es2020.symbol.wellknown.d.ts",
            "lib.es2020.bigint.d.ts",
            "lib.es2020.promise.d.ts",
            "lib.es2020.sharedmemory.d.ts",
            "lib.es2020.intl.d.ts",
            "lib.esnext.array.d.ts",
            "lib.esnext.asynciterable.d.ts",
            "lib.esnext.bigint.d.ts",
            "lib.esnext.d.ts",
            "lib.esnext.full.d.ts",
            "lib.esnext.intl.d.ts",
            "lib.esnext.symbol.d.ts",
        ];
        const targetToCut = ts.ScriptTarget[target];
        const matches = files.filter(f => f.startsWith(`lib.${targetToCut.toLowerCase()}`));
        const targetCutIndex = files.indexOf(matches.pop());
        const getMax = (array) => array && array.length ? array.reduce((max, current) => (current > max ? current : max)) : undefined;
        // Find the index for everything in
        const indexesForCutting = lib.map(lib => {
            const matches = files.filter(f => f.startsWith(`lib.${lib.toLowerCase()}`));
            if (matches.length === 0)
                return 0;
            const cutIndex = files.indexOf(matches.pop());
            return cutIndex;
        });
        const libCutIndex = getMax(indexesForCutting) || 0;
        const finalCutIndex = Math.max(targetCutIndex, libCutIndex);
        return files.slice(0, finalCutIndex + 1);
    };
    exports.knownLibFilesForCompilerOptions = knownLibFilesForCompilerOptions;
    /**
     * Sets up a Map with lib contents by grabbing the necessary files from
     * the local copy of typescript via the file system.
     */
    const createDefaultMapFromNodeModules = (compilerOptions, ts) => {
        const tsModule = ts || require("typescript");
        const path = require("path");
        const fs = require("fs");
        const getLib = (name) => {
            const lib = path.dirname(require.resolve("typescript"));
            return fs.readFileSync(path.join(lib, name), "utf8");
        };
        const libs = exports.knownLibFilesForCompilerOptions(compilerOptions, tsModule);
        const fsMap = new Map();
        libs.forEach(lib => {
            fsMap.set("/" + lib, getLib(lib));
        });
        return fsMap;
    };
    exports.createDefaultMapFromNodeModules = createDefaultMapFromNodeModules;
    /**
     * Adds recursively files from the FS into the map based on the folder
     */
    const addAllFilesFromFolder = (map, workingDir) => {
        const path = require("path");
        const fs = require("fs");
        const walk = function (dir) {
            let results = [];
            const list = fs.readdirSync(dir);
            list.forEach(function (file) {
                file = path.join(dir, file);
                const stat = fs.statSync(file);
                if (stat && stat.isDirectory()) {
                    /* Recurse into a subdirectory */
                    results = results.concat(walk(file));
                }
                else {
                    /* Is a file */
                    results.push(file);
                }
            });
            return results;
        };
        const allFiles = walk(workingDir);
        allFiles.forEach(lib => {
            const fsPath = "/node_modules/@types" + lib.replace(workingDir, "");
            const content = fs.readFileSync(lib, "utf8");
            const validExtensions = [".ts", ".tsx"];
            if (validExtensions.includes(path.extname(fsPath))) {
                map.set(fsPath, content);
            }
        });
    };
    exports.addAllFilesFromFolder = addAllFilesFromFolder;
    /** Adds all files from node_modules/@types into the FS Map */
    const addFilesForTypesIntoFolder = (map) => exports.addAllFilesFromFolder(map, "node_modules/@types");
    exports.addFilesForTypesIntoFolder = addFilesForTypesIntoFolder;
    /**
     * Create a virtual FS Map with the lib files from a particular TypeScript
     * version based on the target, Always includes dom ATM.
     *
     * @param options The compiler target, which dictates the libs to set up
     * @param version the versions of TypeScript which are supported
     * @param cache should the values be stored in local storage
     * @param ts a copy of the typescript import
     * @param lzstring an optional copy of the lz-string import
     * @param fetcher an optional replacement for the global fetch function (tests mainly)
     * @param storer an optional replacement for the localStorage global (tests mainly)
     */
    const createDefaultMapFromCDN = (options, version, cache, ts, lzstring, fetcher, storer) => {
        const fetchlike = fetcher || fetch;
        const storelike = storer || localStorage;
        const fsMap = new Map();
        const files = exports.knownLibFilesForCompilerOptions(options, ts);
        const prefix = `https://typescript.azureedge.net/cdn/${version}/typescript/lib/`;
        function zip(str) {
            return lzstring ? lzstring.compressToUTF16(str) : str;
        }
        function unzip(str) {
            return lzstring ? lzstring.decompressFromUTF16(str) : str;
        }
        // Map the known libs to a node fetch promise, then return the contents
        function uncached() {
            return Promise.all(files.map(lib => fetchlike(prefix + lib).then(resp => resp.text()))).then(contents => {
                contents.forEach((text, index) => fsMap.set("/" + files[index], text));
            });
        }
        // A localstorage and lzzip aware version of the lib files
        function cached() {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                // Remove anything which isn't from this version
                if (key.startsWith("ts-lib-") && !key.startsWith("ts-lib-" + version)) {
                    storelike.removeItem(key);
                }
            });
            return Promise.all(files.map(lib => {
                const cacheKey = `ts-lib-${version}-${lib}`;
                const content = storelike.getItem(cacheKey);
                if (!content) {
                    // Make the API call and store the text concent in the cache
                    return fetchlike(prefix + lib)
                        .then(resp => resp.text())
                        .then(t => {
                        storelike.setItem(cacheKey, zip(t));
                        return t;
                    });
                }
                else {
                    return Promise.resolve(unzip(content));
                }
            })).then(contents => {
                contents.forEach((text, index) => {
                    const name = "/" + files[index];
                    fsMap.set(name, text);
                });
            });
        }
        const func = cache ? cached : uncached;
        return func().then(() => fsMap);
    };
    exports.createDefaultMapFromCDN = createDefaultMapFromCDN;
    function notImplemented(methodName) {
        throw new Error(`Method '${methodName}' is not implemented.`);
    }
    function audit(name, fn) {
        return (...args) => {
            const res = fn(...args);
            const smallres = typeof res === "string" ? res.slice(0, 80) + "..." : res;
            debugLog("> " + name, ...args);
            debugLog("< " + smallres);
            return res;
        };
    }
    /** The default compiler options if TypeScript could ever change the compiler options */
    const defaultCompilerOptions = (ts) => {
        return Object.assign(Object.assign({}, ts.getDefaultCompilerOptions()), { jsx: ts.JsxEmit.React, strict: true, esModuleInterop: true, module: ts.ModuleKind.ESNext, suppressOutputPathCheck: true, skipLibCheck: true, skipDefaultLibCheck: true, moduleResolution: ts.ModuleResolutionKind.NodeJs });
    };
    // "/DOM.d.ts" => "/lib.dom.d.ts"
    const libize = (path) => path.replace("/", "/lib.").toLowerCase();
    /**
     * Creates an in-memory System object which can be used in a TypeScript program, this
     * is what provides read/write aspects of the virtual fs
     */
    function createSystem(files) {
        return {
            args: [],
            createDirectory: () => notImplemented("createDirectory"),
            // TODO: could make a real file tree
            directoryExists: audit("directoryExists", directory => {
                return Array.from(files.keys()).some(path => path.startsWith(directory));
            }),
            exit: () => notImplemented("exit"),
            fileExists: audit("fileExists", fileName => files.has(fileName) || files.has(libize(fileName))),
            getCurrentDirectory: () => "/",
            getDirectories: () => [],
            getExecutingFilePath: () => notImplemented("getExecutingFilePath"),
            readDirectory: audit("readDirectory", directory => (directory === "/" ? Array.from(files.keys()) : [])),
            readFile: audit("readFile", fileName => files.get(fileName) || files.get(libize(fileName))),
            resolvePath: path => path,
            newLine: "\n",
            useCaseSensitiveFileNames: true,
            write: () => notImplemented("write"),
            writeFile: (fileName, contents) => {
                files.set(fileName, contents);
            },
        };
    }
    exports.createSystem = createSystem;
    /**
     * Creates a file-system backed System object which can be used in a TypeScript program, you provide
     * a set of virtual files which are prioritised over the FS versions, then a path to the root of your
     * project (basically the folder your node_modules lives)
     */
    function createFSBackedSystem(files, _projectRoot, ts) {
        // We need to make an isolated folder for the tsconfig, but also need to be able to resolve the
        // existing node_modules structures going back through the history
        const root = _projectRoot + "/vfs";
        const path = require("path");
        // The default System in TypeScript
        const nodeSys = ts.sys;
        const tsLib = path.dirname(require.resolve("typescript"));
        return {
            // @ts-ignore
            name: "fs-vfs",
            root,
            args: [],
            createDirectory: () => notImplemented("createDirectory"),
            // TODO: could make a real file tree
            directoryExists: audit("directoryExists", directory => {
                return Array.from(files.keys()).some(path => path.startsWith(directory)) || nodeSys.directoryExists(directory);
            }),
            exit: nodeSys.exit,
            fileExists: audit("fileExists", fileName => {
                if (files.has(fileName))
                    return true;
                // Don't let other tsconfigs end up touching the vfs
                if (fileName.includes("tsconfig.json") || fileName.includes("tsconfig.json"))
                    return false;
                if (fileName.startsWith("/lib")) {
                    const tsLibName = `${tsLib}/${fileName.replace("/", "")}`;
                    return nodeSys.fileExists(tsLibName);
                }
                return nodeSys.fileExists(fileName);
            }),
            getCurrentDirectory: () => root,
            getDirectories: nodeSys.getDirectories,
            getExecutingFilePath: () => notImplemented("getExecutingFilePath"),
            readDirectory: audit("readDirectory", (...args) => {
                if (args[0] === "/") {
                    return Array.from(files.keys());
                }
                else {
                    return nodeSys.readDirectory(...args);
                }
            }),
            readFile: audit("readFile", fileName => {
                if (files.has(fileName))
                    return files.get(fileName);
                if (fileName.startsWith("/lib")) {
                    const tsLibName = `${tsLib}/${fileName.replace("/", "")}`;
                    const result = nodeSys.readFile(tsLibName);
                    if (!result) {
                        const libs = nodeSys.readDirectory(tsLib);
                        throw new Error(`TSVFS: A request was made for ${tsLibName} but there wasn't a file found in the file map. You likely have a mismatch in the compiler options for the CDN download vs the compiler program. Existing Libs: ${libs}.`);
                    }
                    return result;
                }
                return nodeSys.readFile(fileName);
            }),
            resolvePath: path => {
                if (files.has(path))
                    return path;
                return nodeSys.resolvePath(path);
            },
            newLine: "\n",
            useCaseSensitiveFileNames: true,
            write: () => notImplemented("write"),
            writeFile: (fileName, contents) => {
                files.set(fileName, contents);
            },
        };
    }
    exports.createFSBackedSystem = createFSBackedSystem;
    /**
     * Creates an in-memory CompilerHost -which is essentially an extra wrapper to System
     * which works with TypeScript objects - returns both a compiler host, and a way to add new SourceFile
     * instances to the in-memory file system.
     */
    function createVirtualCompilerHost(sys, compilerOptions, ts) {
        const sourceFiles = new Map();
        const save = (sourceFile) => {
            sourceFiles.set(sourceFile.fileName, sourceFile);
            return sourceFile;
        };
        const vHost = {
            compilerHost: Object.assign(Object.assign({}, sys), { getCanonicalFileName: fileName => fileName, getDefaultLibFileName: () => "/" + ts.getDefaultLibFileName(compilerOptions), 
                // getDefaultLibLocation: () => '/',
                getDirectories: () => [], getNewLine: () => sys.newLine, getSourceFile: fileName => {
                    return (sourceFiles.get(fileName) ||
                        save(ts.createSourceFile(fileName, sys.readFile(fileName), compilerOptions.target || defaultCompilerOptions(ts).target, false)));
                }, useCaseSensitiveFileNames: () => sys.useCaseSensitiveFileNames }),
            updateFile: sourceFile => {
                const alreadyExists = sourceFiles.has(sourceFile.fileName);
                sys.writeFile(sourceFile.fileName, sourceFile.text);
                sourceFiles.set(sourceFile.fileName, sourceFile);
                return alreadyExists;
            },
        };
        return vHost;
    }
    exports.createVirtualCompilerHost = createVirtualCompilerHost;
    /**
     * Creates an object which can host a language service against the virtual file-system
     */
    function createVirtualLanguageServiceHost(sys, rootFiles, compilerOptions, ts, customTransformers) {
        const fileNames = [...rootFiles];
        const { compilerHost, updateFile } = createVirtualCompilerHost(sys, compilerOptions, ts);
        const fileVersions = new Map();
        let projectVersion = 0;
        const languageServiceHost = Object.assign(Object.assign({}, compilerHost), { getProjectVersion: () => projectVersion.toString(), getCompilationSettings: () => compilerOptions, getCustomTransformers: () => customTransformers, getScriptFileNames: () => fileNames, getScriptSnapshot: fileName => {
                const contents = sys.readFile(fileName);
                if (contents) {
                    return ts.ScriptSnapshot.fromString(contents);
                }
                return;
            }, getScriptVersion: fileName => {
                return fileVersions.get(fileName) || "0";
            }, writeFile: sys.writeFile });
        const lsHost = {
            languageServiceHost,
            updateFile: sourceFile => {
                projectVersion++;
                fileVersions.set(sourceFile.fileName, projectVersion.toString());
                if (!fileNames.includes(sourceFile.fileName)) {
                    fileNames.push(sourceFile.fileName);
                }
                updateFile(sourceFile);
            },
        };
        return lsHost;
    }
    exports.createVirtualLanguageServiceHost = createVirtualLanguageServiceHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC12ZnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zYW5kYm94L3NyYy92ZW5kb3IvdHlwZXNjcmlwdC12ZnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztJQVFBLElBQUksZUFBZSxHQUFHLEtBQUssQ0FBQTtJQUMzQixJQUFJO1FBQ0YsZUFBZSxHQUFHLE9BQU8sWUFBWSxLQUFLLFdBQVcsQ0FBQTtLQUN0RDtJQUFDLE9BQU8sS0FBSyxFQUFFLEdBQUU7SUFFbEIsTUFBTSxVQUFVLEdBQUcsT0FBTyxPQUFPLEtBQUssV0FBVyxDQUFBO0lBQ2pELE1BQU0sV0FBVyxHQUFHLENBQUMsZUFBZSxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzNHLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFjLEVBQUUsR0FBRyxlQUFzQixFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUE7SUFVOUY7Ozs7Ozs7OztPQVNHO0lBRUgsU0FBZ0Isa0NBQWtDLENBQ2hELEdBQVcsRUFDWCxTQUFtQixFQUNuQixFQUFNLEVBQ04sa0JBQW1DLEVBQUUsRUFDckMsa0JBQXVDO1FBRXZDLE1BQU0sa0JBQWtCLG1DQUFRLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxHQUFLLGVBQWUsQ0FBRSxDQUFBO1FBRWhGLE1BQU0sRUFBRSxtQkFBbUIsRUFBRSxVQUFVLEVBQUUsR0FBRyxnQ0FBZ0MsQ0FDMUUsR0FBRyxFQUNILFNBQVMsRUFDVCxrQkFBa0IsRUFDbEIsRUFBRSxFQUNGLGtCQUFrQixDQUNuQixDQUFBO1FBQ0QsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFD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QUFFLENBQUE7Z0JBQ2hCLFlBQVksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtnQkFDaEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO29CQUM1QyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtpQkFDcEM7Z0JBQ0QsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ3hCLENBQUM7U0FDRixDQUFBO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZixDQUFDO0lBL0NELDRFQStDQyIsInNvdXJjZXNDb250ZW50IjpbInR5cGUgU3lzdGVtID0gaW1wb3J0KFwidHlwZXNjcmlwdFwiKS5TeXN0ZW1cbnR5cGUgQ29tcGlsZXJPcHRpb25zID0gaW1wb3J0KFwidHlwZXNjcmlwdFwiKS5Db21waWxlck9wdGlvbnNcbnR5cGUgQ3VzdG9tVHJhbnNmb3JtZXJzID0gaW1wb3J0KFwidHlwZXNjcmlwdFwiKS5DdXN0b21UcmFuc2Zvcm1lcnNcbnR5cGUgTGFuZ3VhZ2VTZXJ2aWNlSG9zdCA9IGltcG9ydChcInR5cGVzY3JpcHRcIikuTGFuZ3VhZ2VTZXJ2aWNlSG9zdFxudHlwZSBDb21waWxlckhvc3QgPSBpbXBvcnQoXCJ0eXBlc2NyaXB0XCIpLkNvbXBpbGVySG9zdFxudHlwZSBTb3VyY2VGaWxlID0gaW1wb3J0KFwidHlwZXNjcmlwdFwiKS5Tb3VyY2VGaWxlXG50eXBlIFRTID0gdHlwZW9mIGltcG9ydChcInR5cGVzY3JpcHRcIilcblxubGV0IGhhc0xvY2FsU3RvcmFnZSA9IGZhbHNlXG50cnkge1xuICBoYXNMb2NhbFN0b3JhZ2UgPSB0eXBlb2YgbG9jYWxTdG9yYWdlICE9PSBgdW5kZWZpbmVkYFxufSBjYXRjaCAoZXJyb3IpIHt9XG5cbmNvbnN0IGhhc1Byb2Nlc3MgPSB0eXBlb2YgcHJvY2VzcyAhPT0gYHVuZGVmaW5lZGBcbmNvbnN0IHNob3VsZERlYnVnID0gKGhhc0xvY2FsU3RvcmFnZSAmJiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcIkRFQlVHXCIpKSB8fCAoaGFzUHJvY2VzcyAmJiBwcm9jZXNzLmVudi5ERUJVRylcbmNvbnN0IGRlYnVnTG9nID0gc2hvdWxkRGVidWcgPyBjb25zb2xlLmxvZyA6IChfbWVzc2FnZT86IGFueSwgLi4uX29wdGlvbmFsUGFyYW1zOiBhbnlbXSkgPT4gXCJcIlxuXG5leHBvcnQgaW50ZXJmYWNlIFZpcnR1YWxUeXBlU2NyaXB0RW52aXJvbm1lbnQge1xuICBzeXM6IFN5c3RlbVxuICBsYW5ndWFnZVNlcnZpY2U6IGltcG9ydChcInR5cGVzY3JpcHRcIikuTGFuZ3VhZ2VTZXJ2aWNlXG4gIGdldFNvdXJjZUZpbGU6IChmaWxlTmFtZTogc3RyaW5nKSA9PiBpbXBvcnQoXCJ0eXBlc2NyaXB0XCIpLlNvdXJjZUZpbGUgfCB1bmRlZmluZWRcbiAgY3JlYXRlRmlsZTogKGZpbGVOYW1lOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykgPT4gdm9pZFxuICB1cGRhdGVGaWxlOiAoZmlsZU5hbWU6IHN0cmluZywgY29udGVudDogc3RyaW5nLCByZXBsYWNlVGV4dFNwYW4/OiBpbXBvcnQoXCJ0eXBlc2NyaXB0XCIpLlRleHRTcGFuKSA9PiB2b2lkXG59XG5cbi8qKlxuICogTWFrZXMgYSB2aXJ0dWFsIGNvcHkgb2YgdGhlIFR5cGVTY3JpcHQgZW52aXJvbm1lbnQuIFRoaXMgaXMgdGhlIG1haW4gQVBJIHlvdSB3YW50IHRvIGJlIHVzaW5nIHdpdGhcbiAqIEB0eXBlc2NyaXB0L3Zmcy4gQSBsb3Qgb2YgdGhlIG90aGVyIGV4cG9zZWQgZnVuY3Rpb25zIGFyZSB1c2VkIGJ5IHRoaXMgZnVuY3Rpb24gdG8gZ2V0IHNldCB1cC5cbiAqXG4gKiBAcGFyYW0gc3lzIGFuIG9iamVjdCB3aGljaCBjb25mb3JtcyB0byB0aGUgVFMgU3lzIChhIHNoaW0gb3ZlciByZWFkL3dyaXRlIGFjY2VzcyB0byB0aGUgZnMpXG4gKiBAcGFyYW0gcm9vdEZpbGVzIGEgbGlzdCBvZiBmaWxlcyB3aGljaCBhcmUgY29uc2lkZXJlZCBpbnNpZGUgdGhlIHByb2plY3RcbiAqIEBwYXJhbSB0cyBhIGNvcHkgcGYgdGhlIFR5cGVTY3JpcHQgbW9kdWxlXG4gKiBAcGFyYW0gY29tcGlsZXJPcHRpb25zIHRoZSBvcHRpb25zIGZvciB0aGlzIGNvbXBpbGVyIHJ1blxuICogQHBhcmFtIGN1c3RvbVRyYW5zZm9ybWVycyBjdXN0b20gdHJhbnNmb3JtZXJzIGZvciB0aGlzIGNvbXBpbGVyIHJ1blxuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVWaXJ0dWFsVHlwZVNjcmlwdEVudmlyb25tZW50KFxuICBzeXM6IFN5c3RlbSxcbiAgcm9vdEZpbGVzOiBzdHJpbmdbXSxcbiAgdHM6IFRTLFxuICBjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyA9IHt9LFxuICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBDdXN0b21UcmFuc2Zvcm1lcnNcbik6IFZpcnR1YWxUeXBlU2NyaXB0RW52aXJvbm1lbnQge1xuICBjb25zdCBtZXJnZWRDb21waWxlck9wdHMgPSB7IC4uLmRlZmF1bHRDb21waWxlck9wdGlvbnModHMpLCAuLi5jb21waWxlck9wdGlvbnMgfVxuXG4gIGNvbnN0IHsgbGFuZ3VhZ2VTZXJ2aWNlSG9zdCwgdXBkYXRlRmlsZSB9ID0gY3JlYXRlVmlydHVhbExhbmd1YWdlU2VydmljZUhvc3QoXG4gICAgc3lzLFxuICAgIHJvb3RGaWxlcyxcbiAgICBtZXJnZWRDb21waWxlck9wdHMsXG4gICAgdHMsXG4gICAgY3VzdG9tVHJhbnNmb3JtZXJzXG4gIClcbiAgY29uc3QgbGFuZ3VhZ2VTZXJ2aWNlID0gdHMuY3JlYXRlTGFuZ3VhZ2VTZXJ2aWNlKGxhbmd1YWdlU2VydmljZUhvc3QpXG4gIGNvbnN0IGRpYWdub3N0aWNzID0gbGFuZ3VhZ2VTZXJ2aWNlLmdldENvbXBpbGVyT3B0aW9uc0RpYWdub3N0aWNzKClcblxuICBpZiAoZGlhZ25vc3RpY3MubGVuZ3RoKSB7XG4gICAgY29uc3QgY29tcGlsZXJIb3N0ID0gY3JlYXRlVmlydHVhbENvbXBpbGVySG9zdChzeXMsIGNvbXBpbGVyT3B0aW9ucywgdHMpXG4gICAgdGhyb3cgbmV3IEVycm9yKHRzLmZvcm1hdERpYWdub3N0aWNzKGRpYWdub3N0aWNzLCBjb21waWxlckhvc3QuY29tcGlsZXJIb3N0KSlcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIG5hbWU6IFwidmZzXCIsXG4gICAgc3lzLFxuICAgIGxhbmd1YWdlU2VydmljZSxcbiAgICBnZXRTb3VyY2VGaWxlOiBmaWxlTmFtZSA9PiBsYW5ndWFnZVNlcnZpY2UuZ2V0UHJvZ3JhbSgpPy5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKSxcblxuICAgIGNyZWF0ZUZpbGU6IChmaWxlTmFtZSwgY29udGVudCkgPT4ge1xuICAgICAgdXBkYXRlRmlsZSh0cy5jcmVhdGVTb3VyY2VGaWxlKGZpbGVOYW1lLCBjb250ZW50LCBtZXJnZWRDb21waWxlck9wdHMudGFyZ2V0ISwgZmFsc2UpKVxuICAgIH0sXG4gICAgdXBkYXRlRmlsZTogKGZpbGVOYW1lLCBjb250ZW50LCBvcHRQcmV2VGV4dFNwYW4pID0+IHtcbiAgICAgIGNvbnN0IHByZXZTb3VyY2VGaWxlID0gbGFuZ3VhZ2VTZXJ2aWNlLmdldFByb2dyYW0oKSEuZ2V0U291cmNlRmlsZShmaWxlTmFtZSlcbiAgICAgIGlmICghcHJldlNvdXJjZUZpbGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRGlkIG5vdCBmaW5kIGEgc291cmNlIGZpbGUgZm9yIFwiICsgZmlsZU5hbWUpXG4gICAgICB9XG4gICAgICBjb25zdCBwcmV2RnVsbENvbnRlbnRzID0gcHJldlNvdXJjZUZpbGUudGV4dFxuXG4gICAgICAvLyBUT0RPOiBWYWxpZGF0ZSBpZiB0aGUgZGVmYXVsdCB0ZXh0IHNwYW4gaGFzIGEgZmVuY2Vwb3N0IGVycm9yP1xuICAgICAgY29uc3QgcHJldlRleHRTcGFuID0gb3B0UHJldlRleHRTcGFuID8/IHRzLmNyZWF0ZVRleHRTcGFuKDAsIHByZXZGdWxsQ29udGVudHMubGVuZ3RoKVxuICAgICAgY29uc3QgbmV3VGV4dCA9XG4gICAgICAgIHByZXZGdWxsQ29udGVudHMuc2xpY2UoMCwgcHJldlRleHRTcGFuLnN0YXJ0KSArXG4gICAgICAgIGNvbnRlbnQgK1xuICAgICAgICBwcmV2RnVsbENvbnRlbnRzLnNsaWNlKHByZXZUZXh0U3Bhbi5zdGFydCArIHByZXZUZXh0U3Bhbi5sZW5ndGgpXG4gICAgICBjb25zdCBuZXdTb3VyY2VGaWxlID0gdHMudXBkYXRlU291cmNlRmlsZShwcmV2U291cmNlRmlsZSwgbmV3VGV4dCwge1xuICAgICAgICBzcGFuOiBwcmV2VGV4dFNwYW4sXG4gICAgICAgIG5ld0xlbmd0aDogY29udGVudC5sZW5ndGgsXG4gICAgICB9KVxuXG4gICAgICB1cGRhdGVGaWxlKG5ld1NvdXJjZUZpbGUpXG4gICAgfSxcbiAgfVxufVxuXG4vKipcbiAqIEdyYWIgdGhlIGxpc3Qgb2YgbGliIGZpbGVzIGZvciBhIHBhcnRpY3VsYXIgdGFyZ2V0LCB3aWxsIHJldHVybiBhIGJpdCBtb3JlIHRoYW4gbmVjZXNzYXJ5IChieSBpbmNsdWRpbmdcbiAqIHRoZSBkb20pIGJ1dCB0aGF0J3MgT0tcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0IFRoZSBjb21waWxlciBzZXR0aW5ncyB0YXJnZXQgYmFzZWxpbmVcbiAqIEBwYXJhbSB0cyBBIGNvcHkgb2YgdGhlIFR5cGVTY3JpcHQgbW9kdWxlXG4gKi9cbmV4cG9ydCBjb25zdCBrbm93bkxpYkZpbGVzRm9yQ29tcGlsZXJPcHRpb25zID0gKGNvbXBpbGVyT3B0aW9uczogQ29tcGlsZXJPcHRpb25zLCB0czogVFMpID0+IHtcbiAgY29uc3QgdGFyZ2V0ID0gY29tcGlsZXJPcHRpb25zLnRhcmdldCB8fCB0cy5TY3JpcHRUYXJnZXQuRVM1XG4gIGNvbnN0IGxpYiA9IGNvbXBpbGVyT3B0aW9ucy5saWIgfHwgW11cblxuICBjb25zdCBmaWxlcyA9IFtcbiAgICBcImxpYi5kLnRzXCIsXG4gICAgXCJsaWIuZG9tLmQudHNcIixcbiAgICBcImxpYi5kb20uaXRlcmFibGUuZC50c1wiLFxuICAgIFwibGliLndlYndvcmtlci5kLnRzXCIsXG4gICAgXCJsaWIud2Vid29ya2VyLmltcG9ydHNjcmlwdHMuZC50c1wiLFxuICAgIFwibGliLnNjcmlwdGhvc3QuZC50c1wiLFxuICAgIFwibGliLmVzNS5kLnRzXCIsXG4gICAgXCJsaWIuZXM2LmQudHNcIixcbiAgICBcImxpYi5lczIwMTUuY29sbGVjdGlvbi5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE1LmNvcmUuZC50c1wiLFxuICAgIFwibGliLmVzMjAxNS5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE1LmdlbmVyYXRvci5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE1Lml0ZXJhYmxlLmQudHNcIixcbiAgICBcImxpYi5lczIwMTUucHJvbWlzZS5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE1LnByb3h5LmQudHNcIixcbiAgICBcImxpYi5lczIwMTUucmVmbGVjdC5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE1LnN5bWJvbC5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE1LnN5bWJvbC53ZWxsa25vd24uZC50c1wiLFxuICAgIFwibGliLmVzMjAxNi5hcnJheS5pbmNsdWRlLmQudHNcIixcbiAgICBcImxpYi5lczIwMTYuZC50c1wiLFxuICAgIFwibGliLmVzMjAxNi5mdWxsLmQudHNcIixcbiAgICBcImxpYi5lczIwMTcuZC50c1wiLFxuICAgIFwibGliLmVzMjAxNy5mdWxsLmQudHNcIixcbiAgICBcImxpYi5lczIwMTcuaW50bC5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE3Lm9iamVjdC5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE3LnNoYXJlZG1lbW9yeS5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE3LnN0cmluZy5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE3LnR5cGVkYXJyYXlzLmQudHNcIixcbiAgICBcImxpYi5lczIwMTguYXN5bmNnZW5lcmF0b3IuZC50c1wiLFxuICAgIFwibGliLmVzMjAxOC5hc3luY2l0ZXJhYmxlLmQudHNcIixcbiAgICBcImxpYi5lczIwMTguZC50c1wiLFxuICAgIFwibGliLmVzMjAxOC5mdWxsLmQudHNcIixcbiAgICBcImxpYi5lczIwMTguaW50bC5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE4LnByb21pc2UuZC50c1wiLFxuICAgIFwibGliLmVzMjAxOC5yZWdleHAuZC50c1wiLFxuICAgIFwibGliLmVzMjAxOS5hcnJheS5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE5LmQudHNcIixcbiAgICBcImxpYi5lczIwMTkuZnVsbC5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE5Lm9iamVjdC5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE5LnN0cmluZy5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE5LnN5bWJvbC5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDIwLmQudHNcIixcbiAgICBcImxpYi5lczIwMjAuZnVsbC5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDIwLnN0cmluZy5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDIwLnN5bWJvbC53ZWxsa25vd24uZC50c1wiLFxuICAgIFwibGliLmVzMjAyMC5iaWdpbnQuZC50c1wiLFxuICAgIFwibGliLmVzMjAyMC5wcm9taXNlLmQudHNcIixcbiAgICBcImxpYi5lczIwMjAuc2hhcmVkbWVtb3J5LmQudHNcIixcbiAgICBcImxpYi5lczIwMjAuaW50bC5kLnRzXCIsXG4gICAgXCJsaWIuZXNuZXh0LmFycmF5LmQudHNcIixcbiAgICBcImxpYi5lc25leHQuYXN5bmNpdGVyYWJsZS5kLnRzXCIsXG4gICAgXCJsaWIuZXNuZXh0LmJpZ2ludC5kLnRzXCIsXG4gICAgXCJsaWIuZXNuZXh0LmQudHNcIixcbiAgICBcImxpYi5lc25leHQuZnVsbC5kLnRzXCIsXG4gICAgXCJsaWIuZXNuZXh0LmludGwuZC50c1wiLFxuICAgIFwibGliLmVzbmV4dC5zeW1ib2wuZC50c1wiLFxuICBdXG5cbiAgY29uc3QgdGFyZ2V0VG9DdXQgPSB0cy5TY3JpcHRUYXJnZXRbdGFyZ2V0XVxuICBjb25zdCBtYXRjaGVzID0gZmlsZXMuZmlsdGVyKGYgPT4gZi5zdGFydHNXaXRoKGBsaWIuJHt0YXJnZXRUb0N1dC50b0xvd2VyQ2FzZSgpfWApKVxuICBjb25zdCB0YXJnZXRDdXRJbmRleCA9IGZpbGVzLmluZGV4T2YobWF0Y2hlcy5wb3AoKSEpXG5cbiAgY29uc3QgZ2V0TWF4ID0gKGFycmF5OiBudW1iZXJbXSkgPT5cbiAgICBhcnJheSAmJiBhcnJheS5sZW5ndGggPyBhcnJheS5yZWR1Y2UoKG1heCwgY3VycmVudCkgPT4gKGN1cnJlbnQgPiBtYXggPyBjdXJyZW50IDogbWF4KSkgOiB1bmRlZmluZWRcblxuICAvLyBGaW5kIHRoZSBpbmRleCBmb3IgZXZlcnl0aGluZyBpblxuICBjb25zdCBpbmRleGVzRm9yQ3V0dGluZyA9IGxpYi5tYXAobGliID0+IHtcbiAgICBjb25zdCBtYXRjaGVzID0gZmlsZXMuZmlsdGVyKGYgPT4gZi5zdGFydHNXaXRoKGBsaWIuJHtsaWIudG9Mb3dlckNhc2UoKX1gKSlcbiAgICBpZiAobWF0Y2hlcy5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgICBjb25zdCBjdXRJbmRleCA9IGZpbGVzLmluZGV4T2YobWF0Y2hlcy5wb3AoKSEpXG4gICAgcmV0dXJuIGN1dEluZGV4XG4gIH0pXG5cbiAgY29uc3QgbGliQ3V0SW5kZXggPSBnZXRNYXgoaW5kZXhlc0ZvckN1dHRpbmcpIHx8IDBcblxuICBjb25zdCBmaW5hbEN1dEluZGV4ID0gTWF0aC5tYXgodGFyZ2V0Q3V0SW5kZXgsIGxpYkN1dEluZGV4KVxuICByZXR1cm4gZmlsZXMuc2xpY2UoMCwgZmluYWxDdXRJbmRleCArIDEpXG59XG5cbi8qKlxuICogU2V0cyB1cCBhIE1hcCB3aXRoIGxpYiBjb250ZW50cyBieSBncmFiYmluZyB0aGUgbmVjZXNzYXJ5IGZpbGVzIGZyb21cbiAqIHRoZSBsb2NhbCBjb3B5IG9mIHR5cGVzY3JpcHQgdmlhIHRoZSBmaWxlIHN5c3RlbS5cbiAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZURlZmF1bHRNYXBGcm9tTm9kZU1vZHVsZXMgPSAoY29tcGlsZXJPcHRpb25zOiBDb21waWxlck9wdGlvbnMsIHRzPzogdHlwZW9mIGltcG9ydChcInR5cGVzY3JpcHRcIikpID0+IHtcbiAgY29uc3QgdHNNb2R1bGUgPSB0cyB8fCByZXF1aXJlKFwidHlwZXNjcmlwdFwiKVxuICBjb25zdCBwYXRoID0gcmVxdWlyZShcInBhdGhcIilcbiAgY29uc3QgZnMgPSByZXF1aXJlKFwiZnNcIilcblxuICBjb25zdCBnZXRMaWIgPSAobmFtZTogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgbGliID0gcGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZShcInR5cGVzY3JpcHRcIikpXG4gICAgcmV0dXJuIGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4obGliLCBuYW1lKSwgXCJ1dGY4XCIpXG4gIH1cblxuICBjb25zdCBsaWJzID0ga25vd25MaWJGaWxlc0ZvckNvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMsIHRzTW9kdWxlKVxuICBjb25zdCBmc01hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KClcbiAgbGlicy5mb3JFYWNoKGxpYiA9PiB7XG4gICAgZnNNYXAuc2V0KFwiL1wiICsgbGliLCBnZXRMaWIobGliKSlcbiAgfSlcbiAgcmV0dXJuIGZzTWFwXG59XG5cbi8qKlxuICogQWRkcyByZWN1cnNpdmVseSBmaWxlcyBmcm9tIHRoZSBGUyBpbnRvIHRoZSBtYXAgYmFzZWQgb24gdGhlIGZvbGRlclxuICovXG5leHBvcnQgY29uc3QgYWRkQWxsRmlsZXNGcm9tRm9sZGVyID0gKG1hcDogTWFwPHN0cmluZywgc3RyaW5nPiwgd29ya2luZ0Rpcjogc3RyaW5nKTogdm9pZCA9PiB7XG4gIGNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKVxuICBjb25zdCBmcyA9IHJlcXVpcmUoXCJmc1wiKVxuXG4gIGNvbnN0IHdhbGsgPSBmdW5jdGlvbiAoZGlyOiBzdHJpbmcpIHtcbiAgICBsZXQgcmVzdWx0czogc3RyaW5nW10gPSBbXVxuICAgIGNvbnN0IGxpc3QgPSBmcy5yZWFkZGlyU3luYyhkaXIpXG4gICAgbGlzdC5mb3JFYWNoKGZ1bmN0aW9uIChmaWxlOiBzdHJpbmcpIHtcbiAgICAgIGZpbGUgPSBwYXRoLmpvaW4oZGlyLCBmaWxlKVxuICAgICAgY29uc3Qgc3RhdCA9IGZzLnN0YXRTeW5jKGZpbGUpXG4gICAgICBpZiAoc3RhdCAmJiBzdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgLyogUmVjdXJzZSBpbnRvIGEgc3ViZGlyZWN0b3J5ICovXG4gICAgICAgIHJlc3VsdHMgPSByZXN1bHRzLmNvbmNhdCh3YWxrKGZpbGUpKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLyogSXMgYSBmaWxlICovXG4gICAgICAgIHJlc3VsdHMucHVzaChmaWxlKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIHJlc3VsdHNcbiAgfVxuXG4gIGNvbnN0IGFsbEZpbGVzID0gd2Fsayh3b3JraW5nRGlyKVxuXG4gIGFsbEZpbGVzLmZvckVhY2gobGliID0+IHtcbiAgICBjb25zdCBmc1BhdGggPSBcIi9ub2RlX21vZHVsZXMvQHR5cGVzXCIgKyBsaWIucmVwbGFjZSh3b3JraW5nRGlyLCBcIlwiKVxuICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMobGliLCBcInV0ZjhcIilcbiAgICBjb25zdCB2YWxpZEV4dGVuc2lvbnMgPSBbXCIudHNcIiwgXCIudHN4XCJdXG5cbiAgICBpZiAodmFsaWRFeHRlbnNpb25zLmluY2x1ZGVzKHBhdGguZXh0bmFtZShmc1BhdGgpKSkge1xuICAgICAgbWFwLnNldChmc1BhdGgsIGNvbnRlbnQpXG4gICAgfVxuICB9KVxufVxuXG4vKiogQWRkcyBhbGwgZmlsZXMgZnJvbSBub2RlX21vZHVsZXMvQHR5cGVzIGludG8gdGhlIEZTIE1hcCAqL1xuZXhwb3J0IGNvbnN0IGFkZEZpbGVzRm9yVHlwZXNJbnRvRm9sZGVyID0gKG1hcDogTWFwPHN0cmluZywgc3RyaW5nPikgPT5cbiAgYWRkQWxsRmlsZXNGcm9tRm9sZGVyKG1hcCwgXCJub2RlX21vZHVsZXMvQHR5cGVzXCIpXG5cbi8qKlxuICogQ3JlYXRlIGEgdmlydHVhbCBGUyBNYXAgd2l0aCB0aGUgbGliIGZpbGVzIGZyb20gYSBwYXJ0aWN1bGFyIFR5cGVTY3JpcHRcbiAqIHZlcnNpb24gYmFzZWQgb24gdGhlIHRhcmdldCwgQWx3YXlzIGluY2x1ZGVzIGRvbSBBVE0uXG4gKlxuICogQHBhcmFtIG9wdGlvbnMgVGhlIGNvbXBpbGVyIHRhcmdldCwgd2hpY2ggZGljdGF0ZXMgdGhlIGxpYnMgdG8gc2V0IHVwXG4gKiBAcGFyYW0gdmVyc2lvbiB0aGUgdmVyc2lvbnMgb2YgVHlwZVNjcmlwdCB3aGljaCBhcmUgc3VwcG9ydGVkXG4gKiBAcGFyYW0gY2FjaGUgc2hvdWxkIHRoZSB2YWx1ZXMgYmUgc3RvcmVkIGluIGxvY2FsIHN0b3JhZ2VcbiAqIEBwYXJhbSB0cyBhIGNvcHkgb2YgdGhlIHR5cGVzY3JpcHQgaW1wb3J0XG4gKiBAcGFyYW0gbHpzdHJpbmcgYW4gb3B0aW9uYWwgY29weSBvZiB0aGUgbHotc3RyaW5nIGltcG9ydFxuICogQHBhcmFtIGZldGNoZXIgYW4gb3B0aW9uYWwgcmVwbGFjZW1lbnQgZm9yIHRoZSBnbG9iYWwgZmV0Y2ggZnVuY3Rpb24gKHRlc3RzIG1haW5seSlcbiAqIEBwYXJhbSBzdG9yZXIgYW4gb3B0aW9uYWwgcmVwbGFjZW1lbnQgZm9yIHRoZSBsb2NhbFN0b3JhZ2UgZ2xvYmFsICh0ZXN0cyBtYWlubHkpXG4gKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVEZWZhdWx0TWFwRnJvbUNETiA9IChcbiAgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zLFxuICB2ZXJzaW9uOiBzdHJpbmcsXG4gIGNhY2hlOiBib29sZWFuLFxuICB0czogVFMsXG4gIGx6c3RyaW5nPzogdHlwZW9mIGltcG9ydChcImx6LXN0cmluZ1wiKSxcbiAgZmV0Y2hlcj86IHR5cGVvZiBmZXRjaCxcbiAgc3RvcmVyPzogdHlwZW9mIGxvY2FsU3RvcmFnZVxuKSA9PiB7XG4gIGNvbnN0IGZldGNobGlrZSA9IGZldGNoZXIgfHwgZmV0Y2hcbiAgY29uc3Qgc3RvcmVsaWtlID0gc3RvcmVyIHx8IGxvY2FsU3RvcmFnZVxuICBjb25zdCBmc01hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KClcbiAgY29uc3QgZmlsZXMgPSBrbm93bkxpYkZpbGVzRm9yQ29tcGlsZXJPcHRpb25zKG9wdGlvbnMsIHRzKVxuICBjb25zdCBwcmVmaXggPSBgaHR0cHM6Ly90eXBlc2NyaXB0LmF6dXJlZWRnZS5uZXQvY2RuLyR7dmVyc2lvbn0vdHlwZXNjcmlwdC9saWIvYFxuXG4gIGZ1bmN0aW9uIHppcChzdHI6IHN0cmluZykge1xuICAgIHJldHVybiBsenN0cmluZyA/IGx6c3RyaW5nLmNvbXByZXNzVG9VVEYxNihzdHIpIDogc3RyXG4gIH1cblxuICBmdW5jdGlvbiB1bnppcChzdHI6IHN0cmluZykge1xuICAgIHJldHVybiBsenN0cmluZyA/IGx6c3RyaW5nLmRlY29tcHJlc3NGcm9tVVRGMTYoc3RyKSA6IHN0clxuICB9XG5cbiAgLy8gTWFwIHRoZSBrbm93biBsaWJzIHRvIGEgbm9kZSBmZXRjaCBwcm9taXNlLCB0aGVuIHJldHVybiB0aGUgY29udGVudHNcbiAgZnVuY3Rpb24gdW5jYWNoZWQoKSB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKGZpbGVzLm1hcChsaWIgPT4gZmV0Y2hsaWtlKHByZWZpeCArIGxpYikudGhlbihyZXNwID0+IHJlc3AudGV4dCgpKSkpLnRoZW4oY29udGVudHMgPT4ge1xuICAgICAgY29udGVudHMuZm9yRWFjaCgodGV4dCwgaW5kZXgpID0+IGZzTWFwLnNldChcIi9cIiArIGZpbGVzW2luZGV4XSwgdGV4dCkpXG4gICAgfSlcbiAgfVxuXG4gIC8vIEEgbG9jYWxzdG9yYWdlIGFuZCBsenppcCBhd2FyZSB2ZXJzaW9uIG9mIHRoZSBsaWIgZmlsZXNcbiAgZnVuY3Rpb24gY2FjaGVkKCkge1xuICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhsb2NhbFN0b3JhZ2UpXG4gICAga2V5cy5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAvLyBSZW1vdmUgYW55dGhpbmcgd2hpY2ggaXNuJ3QgZnJvbSB0aGlzIHZlcnNpb25cbiAgICAgIGlmIChrZXkuc3RhcnRzV2l0aChcInRzLWxpYi1cIikgJiYgIWtleS5zdGFydHNXaXRoKFwidHMtbGliLVwiICsgdmVyc2lvbikpIHtcbiAgICAgICAgc3RvcmVsaWtlLnJlbW92ZUl0ZW0oa2V5KVxuICAgICAgfVxuICAgIH0pXG5cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoXG4gICAgICBmaWxlcy5tYXAobGliID0+IHtcbiAgICAgICAgY29uc3QgY2FjaGVLZXkgPSBgdHMtbGliLSR7dmVyc2lvbn0tJHtsaWJ9YFxuICAgICAgICBjb25zdCBjb250ZW50ID0gc3RvcmVsaWtlLmdldEl0ZW0oY2FjaGVLZXkpXG5cbiAgICAgICAgaWYgKCFjb250ZW50KSB7XG4gICAgICAgICAgLy8gTWFrZSB0aGUgQVBJIGNhbGwgYW5kIHN0b3JlIHRoZSB0ZXh0IGNvbmNlbnQgaW4gdGhlIGNhY2hlXG4gICAgICAgICAgcmV0dXJuIGZldGNobGlrZShwcmVmaXggKyBsaWIpXG4gICAgICAgICAgICAudGhlbihyZXNwID0+IHJlc3AudGV4dCgpKVxuICAgICAgICAgICAgLnRoZW4odCA9PiB7XG4gICAgICAgICAgICAgIHN0b3JlbGlrZS5zZXRJdGVtKGNhY2hlS2V5LCB6aXAodCkpXG4gICAgICAgICAgICAgIHJldHVybiB0XG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodW56aXAoY29udGVudCkpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKS50aGVuKGNvbnRlbnRzID0+IHtcbiAgICAgIGNvbnRlbnRzLmZvckVhY2goKHRleHQsIGluZGV4KSA9PiB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBcIi9cIiArIGZpbGVzW2luZGV4XVxuICAgICAgICBmc01hcC5zZXQobmFtZSwgdGV4dClcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIGNvbnN0IGZ1bmMgPSBjYWNoZSA/IGNhY2hlZCA6IHVuY2FjaGVkXG4gIHJldHVybiBmdW5jKCkudGhlbigoKSA9PiBmc01hcClcbn1cblxuZnVuY3Rpb24gbm90SW1wbGVtZW50ZWQobWV0aG9kTmFtZTogc3RyaW5nKTogYW55IHtcbiAgdGhyb3cgbmV3IEVycm9yKGBNZXRob2QgJyR7bWV0aG9kTmFtZX0nIGlzIG5vdCBpbXBsZW1lbnRlZC5gKVxufVxuXG5mdW5jdGlvbiBhdWRpdDxBcmdzVCBleHRlbmRzIGFueVtdLCBSZXR1cm5UPihcbiAgbmFtZTogc3RyaW5nLFxuICBmbjogKC4uLmFyZ3M6IEFyZ3NUKSA9PiBSZXR1cm5UXG4pOiAoLi4uYXJnczogQXJnc1QpID0+IFJldHVyblQge1xuICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICBjb25zdCByZXMgPSBmbiguLi5hcmdzKVxuXG4gICAgY29uc3Qgc21hbGxyZXMgPSB0eXBlb2YgcmVzID09PSBcInN0cmluZ1wiID8gcmVzLnNsaWNlKDAsIDgwKSArIFwiLi4uXCIgOiByZXNcbiAgICBkZWJ1Z0xvZyhcIj4gXCIgKyBuYW1lLCAuLi5hcmdzKVxuICAgIGRlYnVnTG9nKFwiPCBcIiArIHNtYWxscmVzKVxuXG4gICAgcmV0dXJuIHJlc1xuICB9XG59XG5cbi8qKiBUaGUgZGVmYXVsdCBjb21waWxlciBvcHRpb25zIGlmIFR5cGVTY3JpcHQgY291bGQgZXZlciBjaGFuZ2UgdGhlIGNvbXBpbGVyIG9wdGlvbnMgKi9cbmNvbnN0IGRlZmF1bHRDb21waWxlck9wdGlvbnMgPSAodHM6IHR5cGVvZiBpbXBvcnQoXCJ0eXBlc2NyaXB0XCIpKTogQ29tcGlsZXJPcHRpb25zID0+IHtcbiAgcmV0dXJuIHtcbiAgICAuLi50cy5nZXREZWZhdWx0Q29tcGlsZXJPcHRpb25zKCksXG4gICAganN4OiB0cy5Kc3hFbWl0LlJlYWN0LFxuICAgIHN0cmljdDogdHJ1ZSxcbiAgICBlc01vZHVsZUludGVyb3A6IHRydWUsXG4gICAgbW9kdWxlOiB0cy5Nb2R1bGVLaW5kLkVTTmV4dCxcbiAgICBzdXBwcmVzc091dHB1dFBhdGhDaGVjazogdHJ1ZSxcbiAgICBza2lwTGliQ2hlY2s6IHRydWUsXG4gICAgc2tpcERlZmF1bHRMaWJDaGVjazogdHJ1ZSxcbiAgICBtb2R1bGVSZXNvbHV0aW9uOiB0cy5Nb2R1bGVSZXNvbHV0aW9uS2luZC5Ob2RlSnMsXG4gIH1cbn1cblxuLy8gXCIvRE9NLmQudHNcIiA9PiBcIi9saWIuZG9tLmQudHNcIlxuY29uc3QgbGliaXplID0gKHBhdGg6IHN0cmluZykgPT4gcGF0aC5yZXBsYWNlKFwiL1wiLCBcIi9saWIuXCIpLnRvTG93ZXJDYXNlKClcblxuLyoqXG4gKiBDcmVhdGVzIGFuIGluLW1lbW9yeSBTeXN0ZW0gb2JqZWN0IHdoaWNoIGNhbiBiZSB1c2VkIGluIGEgVHlwZVNjcmlwdCBwcm9ncmFtLCB0aGlzXG4gKiBpcyB3aGF0IHByb3ZpZGVzIHJlYWQvd3JpdGUgYXNwZWN0cyBvZiB0aGUgdmlydHVhbCBmc1xuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU3lzdGVtKGZpbGVzOiBNYXA8c3RyaW5nLCBzdHJpbmc+KTogU3lzdGVtIHtcbiAgcmV0dXJuIHtcbiAgICBhcmdzOiBbXSxcbiAgICBjcmVhdGVEaXJlY3Rvcnk6ICgpID0+IG5vdEltcGxlbWVudGVkKFwiY3JlYXRlRGlyZWN0b3J5XCIpLFxuICAgIC8vIFRPRE86IGNvdWxkIG1ha2UgYSByZWFsIGZpbGUgdHJlZVxuICAgIGRpcmVjdG9yeUV4aXN0czogYXVkaXQoXCJkaXJlY3RvcnlFeGlzdHNcIiwgZGlyZWN0b3J5ID0+IHtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKGZpbGVzLmtleXMoKSkuc29tZShwYXRoID0+IHBhdGguc3RhcnRzV2l0aChkaXJlY3RvcnkpKVxuICAgIH0pLFxuICAgIGV4aXQ6ICgpID0+IG5vdEltcGxlbWVudGVkKFwiZXhpdFwiKSxcbiAgICBmaWxlRXhpc3RzOiBhdWRpdChcImZpbGVFeGlzdHNcIiwgZmlsZU5hbWUgPT4gZmlsZXMuaGFzKGZpbGVOYW1lKSB8fCBmaWxlcy5oYXMobGliaXplKGZpbGVOYW1lKSkpLFxuICAgIGdldEN1cnJlbnREaXJlY3Rvcnk6ICgpID0+IFwiL1wiLFxuICAgIGdldERpcmVjdG9yaWVzOiAoKSA9PiBbXSxcbiAgICBnZXRFeGVjdXRpbmdGaWxlUGF0aDogKCkgPT4gbm90SW1wbGVtZW50ZWQoXCJnZXRFeGVjdXRpbmdGaWxlUGF0aFwiKSxcbiAgICByZWFkRGlyZWN0b3J5OiBhdWRpdChcInJlYWREaXJlY3RvcnlcIiwgZGlyZWN0b3J5ID0+IChkaXJlY3RvcnkgPT09IFwiL1wiID8gQXJyYXkuZnJvbShmaWxlcy5rZXlzKCkpIDogW10pKSxcbiAgICByZWFkRmlsZTogYXVkaXQoXCJyZWFkRmlsZVwiLCBmaWxlTmFtZSA9PiBmaWxlcy5nZXQoZmlsZU5hbWUpIHx8IGZpbGVzLmdldChsaWJpemUoZmlsZU5hbWUpKSksXG4gICAgcmVzb2x2ZVBhdGg6IHBhdGggPT4gcGF0aCxcbiAgICBuZXdMaW5lOiBcIlxcblwiLFxuICAgIHVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXM6IHRydWUsXG4gICAgd3JpdGU6ICgpID0+IG5vdEltcGxlbWVudGVkKFwid3JpdGVcIiksXG4gICAgd3JpdGVGaWxlOiAoZmlsZU5hbWUsIGNvbnRlbnRzKSA9PiB7XG4gICAgICBmaWxlcy5zZXQoZmlsZU5hbWUsIGNvbnRlbnRzKVxuICAgIH0sXG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgZmlsZS1zeXN0ZW0gYmFja2VkIFN5c3RlbSBvYmplY3Qgd2hpY2ggY2FuIGJlIHVzZWQgaW4gYSBUeXBlU2NyaXB0IHByb2dyYW0sIHlvdSBwcm92aWRlXG4gKiBhIHNldCBvZiB2aXJ0dWFsIGZpbGVzIHdoaWNoIGFyZSBwcmlvcml0aXNlZCBvdmVyIHRoZSBGUyB2ZXJzaW9ucywgdGhlbiBhIHBhdGggdG8gdGhlIHJvb3Qgb2YgeW91clxuICogcHJvamVjdCAoYmFzaWNhbGx5IHRoZSBmb2xkZXIgeW91ciBub2RlX21vZHVsZXMgbGl2ZXMpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVGU0JhY2tlZFN5c3RlbShmaWxlczogTWFwPHN0cmluZywgc3RyaW5nPiwgX3Byb2plY3RSb290OiBzdHJpbmcsIHRzOiBUUyk6IFN5c3RlbSB7XG4gIC8vIFdlIG5lZWQgdG8gbWFrZSBhbiBpc29sYXRlZCBmb2xkZXIgZm9yIHRoZSB0c2NvbmZpZywgYnV0IGFsc28gbmVlZCB0byBiZSBhYmxlIHRvIHJlc29sdmUgdGhlXG4gIC8vIGV4aXN0aW5nIG5vZGVfbW9kdWxlcyBzdHJ1Y3R1cmVzIGdvaW5nIGJhY2sgdGhyb3VnaCB0aGUgaGlzdG9yeVxuICBjb25zdCByb290ID0gX3Byb2plY3RSb290ICsgXCIvdmZzXCJcbiAgY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpXG5cbiAgLy8gVGhlIGRlZmF1bHQgU3lzdGVtIGluIFR5cGVTY3JpcHRcbiAgY29uc3Qgbm9kZVN5cyA9IHRzLnN5c1xuICBjb25zdCB0c0xpYiA9IHBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoXCJ0eXBlc2NyaXB0XCIpKVxuXG4gIHJldHVybiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIG5hbWU6IFwiZnMtdmZzXCIsXG4gICAgcm9vdCxcbiAgICBhcmdzOiBbXSxcbiAgICBjcmVhdGVEaXJlY3Rvcnk6ICgpID0+IG5vdEltcGxlbWVudGVkKFwiY3JlYXRlRGlyZWN0b3J5XCIpLFxuICAgIC8vIFRPRE86IGNvdWxkIG1ha2UgYSByZWFsIGZpbGUgdHJlZVxuICAgIGRpcmVjdG9yeUV4aXN0czogYXVkaXQoXCJkaXJlY3RvcnlFeGlzdHNcIiwgZGlyZWN0b3J5ID0+IHtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKGZpbGVzLmtleXMoKSkuc29tZShwYXRoID0+IHBhdGguc3RhcnRzV2l0aChkaXJlY3RvcnkpKSB8fCBub2RlU3lzLmRpcmVjdG9yeUV4aXN0cyhkaXJlY3RvcnkpXG4gICAgfSksXG4gICAgZXhpdDogbm9kZVN5cy5leGl0LFxuICAgIGZpbGVFeGlzdHM6IGF1ZGl0KFwiZmlsZUV4aXN0c1wiLCBmaWxlTmFtZSA9PiB7XG4gICAgICBpZiAoZmlsZXMuaGFzKGZpbGVOYW1lKSkgcmV0dXJuIHRydWVcbiAgICAgIC8vIERvbid0IGxldCBvdGhlciB0c2NvbmZpZ3MgZW5kIHVwIHRvdWNoaW5nIHRoZSB2ZnNcbiAgICAgIGlmIChmaWxlTmFtZS5pbmNsdWRlcyhcInRzY29uZmlnLmpzb25cIikgfHwgZmlsZU5hbWUuaW5jbHVkZXMoXCJ0c2NvbmZpZy5qc29uXCIpKSByZXR1cm4gZmFsc2VcbiAgICAgIGlmIChmaWxlTmFtZS5zdGFydHNXaXRoKFwiL2xpYlwiKSkge1xuICAgICAgICBjb25zdCB0c0xpYk5hbWUgPSBgJHt0c0xpYn0vJHtmaWxlTmFtZS5yZXBsYWNlKFwiL1wiLCBcIlwiKX1gXG4gICAgICAgIHJldHVybiBub2RlU3lzLmZpbGVFeGlzdHModHNMaWJOYW1lKVxuICAgICAgfVxuICAgICAgcmV0dXJuIG5vZGVTeXMuZmlsZUV4aXN0cyhmaWxlTmFtZSlcbiAgICB9KSxcbiAgICBnZXRDdXJyZW50RGlyZWN0b3J5OiAoKSA9PiByb290LFxuICAgIGdldERpcmVjdG9yaWVzOiBub2RlU3lzLmdldERpcmVjdG9yaWVzLFxuICAgIGdldEV4ZWN1dGluZ0ZpbGVQYXRoOiAoKSA9PiBub3RJbXBsZW1lbnRlZChcImdldEV4ZWN1dGluZ0ZpbGVQYXRoXCIpLFxuICAgIHJlYWREaXJlY3Rvcnk6IGF1ZGl0KFwicmVhZERpcmVjdG9yeVwiLCAoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKGFyZ3NbMF0gPT09IFwiL1wiKSB7XG4gICAgICAgIHJldHVybiBBcnJheS5mcm9tKGZpbGVzLmtleXMoKSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBub2RlU3lzLnJlYWREaXJlY3RvcnkoLi4uYXJncylcbiAgICAgIH1cbiAgICB9KSxcbiAgICByZWFkRmlsZTogYXVkaXQoXCJyZWFkRmlsZVwiLCBmaWxlTmFtZSA9PiB7XG4gICAgICBpZiAoZmlsZXMuaGFzKGZpbGVOYW1lKSkgcmV0dXJuIGZpbGVzLmdldChmaWxlTmFtZSlcbiAgICAgIGlmIChmaWxlTmFtZS5zdGFydHNXaXRoKFwiL2xpYlwiKSkge1xuICAgICAgICBjb25zdCB0c0xpYk5hbWUgPSBgJHt0c0xpYn0vJHtmaWxlTmFtZS5yZXBsYWNlKFwiL1wiLCBcIlwiKX1gXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IG5vZGVTeXMucmVhZEZpbGUodHNMaWJOYW1lKVxuICAgICAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgICAgIGNvbnN0IGxpYnMgPSBub2RlU3lzLnJlYWREaXJlY3RvcnkodHNMaWIpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYFRTVkZTOiBBIHJlcXVlc3Qgd2FzIG1hZGUgZm9yICR7dHNMaWJOYW1lfSBidXQgdGhlcmUgd2Fzbid0IGEgZmlsZSBmb3VuZCBpbiB0aGUgZmlsZSBtYXAuIFlvdSBsaWtlbHkgaGF2ZSBhIG1pc21hdGNoIGluIHRoZSBjb21waWxlciBvcHRpb25zIGZvciB0aGUgQ0ROIGRvd25sb2FkIHZzIHRoZSBjb21waWxlciBwcm9ncmFtLiBFeGlzdGluZyBMaWJzOiAke2xpYnN9LmBcbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICAgfVxuICAgICAgcmV0dXJuIG5vZGVTeXMucmVhZEZpbGUoZmlsZU5hbWUpXG4gICAgfSksXG4gICAgcmVzb2x2ZVBhdGg6IHBhdGggPT4ge1xuICAgICAgaWYgKGZpbGVzLmhhcyhwYXRoKSkgcmV0dXJuIHBhdGhcbiAgICAgIHJldHVybiBub2RlU3lzLnJlc29sdmVQYXRoKHBhdGgpXG4gICAgfSxcbiAgICBuZXdMaW5lOiBcIlxcblwiLFxuICAgIHVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXM6IHRydWUsXG4gICAgd3JpdGU6ICgpID0+IG5vdEltcGxlbWVudGVkKFwid3JpdGVcIiksXG4gICAgd3JpdGVGaWxlOiAoZmlsZU5hbWUsIGNvbnRlbnRzKSA9PiB7XG4gICAgICBmaWxlcy5zZXQoZmlsZU5hbWUsIGNvbnRlbnRzKVxuICAgIH0sXG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIGluLW1lbW9yeSBDb21waWxlckhvc3QgLXdoaWNoIGlzIGVzc2VudGlhbGx5IGFuIGV4dHJhIHdyYXBwZXIgdG8gU3lzdGVtXG4gKiB3aGljaCB3b3JrcyB3aXRoIFR5cGVTY3JpcHQgb2JqZWN0cyAtIHJldHVybnMgYm90aCBhIGNvbXBpbGVyIGhvc3QsIGFuZCBhIHdheSB0byBhZGQgbmV3IFNvdXJjZUZpbGVcbiAqIGluc3RhbmNlcyB0byB0aGUgaW4tbWVtb3J5IGZpbGUgc3lzdGVtLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVmlydHVhbENvbXBpbGVySG9zdChzeXM6IFN5c3RlbSwgY29tcGlsZXJPcHRpb25zOiBDb21waWxlck9wdGlvbnMsIHRzOiBUUykge1xuICBjb25zdCBzb3VyY2VGaWxlcyA9IG5ldyBNYXA8c3RyaW5nLCBTb3VyY2VGaWxlPigpXG4gIGNvbnN0IHNhdmUgPSAoc291cmNlRmlsZTogU291cmNlRmlsZSkgPT4ge1xuICAgIHNvdXJjZUZpbGVzLnNldChzb3VyY2VGaWxlLmZpbGVOYW1lLCBzb3VyY2VGaWxlKVxuICAgIHJldHVybiBzb3VyY2VGaWxlXG4gIH1cblxuICB0eXBlIFJldHVybiA9IHtcbiAgICBjb21waWxlckhvc3Q6IENvbXBpbGVySG9zdFxuICAgIHVwZGF0ZUZpbGU6IChzb3VyY2VGaWxlOiBTb3VyY2VGaWxlKSA9PiBib29sZWFuXG4gIH1cblxuICBjb25zdCB2SG9zdDogUmV0dXJuID0ge1xuICAgIGNvbXBpbGVySG9zdDoge1xuICAgICAgLi4uc3lzLFxuICAgICAgZ2V0Q2Fub25pY2FsRmlsZU5hbWU6IGZpbGVOYW1lID0+IGZpbGVOYW1lLFxuICAgICAgZ2V0RGVmYXVsdExpYkZpbGVOYW1lOiAoKSA9PiBcIi9cIiArIHRzLmdldERlZmF1bHRMaWJGaWxlTmFtZShjb21waWxlck9wdGlvbnMpLCAvLyAnL2xpYi5kLnRzJyxcbiAgICAgIC8vIGdldERlZmF1bHRMaWJMb2NhdGlvbjogKCkgPT4gJy8nLFxuICAgICAgZ2V0RGlyZWN0b3JpZXM6ICgpID0+IFtdLFxuICAgICAgZ2V0TmV3TGluZTogKCkgPT4gc3lzLm5ld0xpbmUsXG4gICAgICBnZXRTb3VyY2VGaWxlOiBmaWxlTmFtZSA9PiB7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgc291cmNlRmlsZXMuZ2V0KGZpbGVOYW1lKSB8fFxuICAgICAgICAgIHNhdmUoXG4gICAgICAgICAgICB0cy5jcmVhdGVTb3VyY2VGaWxlKFxuICAgICAgICAgICAgICBmaWxlTmFtZSxcbiAgICAgICAgICAgICAgc3lzLnJlYWRGaWxlKGZpbGVOYW1lKSEsXG4gICAgICAgICAgICAgIGNvbXBpbGVyT3B0aW9ucy50YXJnZXQgfHwgZGVmYXVsdENvbXBpbGVyT3B0aW9ucyh0cykudGFyZ2V0ISxcbiAgICAgICAgICAgICAgZmFsc2VcbiAgICAgICAgICAgIClcbiAgICAgICAgICApXG4gICAgICAgIClcbiAgICAgIH0sXG4gICAgICB1c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzOiAoKSA9PiBzeXMudXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcyxcbiAgICB9LFxuICAgIHVwZGF0ZUZpbGU6IHNvdXJjZUZpbGUgPT4ge1xuICAgICAgY29uc3QgYWxyZWFkeUV4aXN0cyA9IHNvdXJjZUZpbGVzLmhhcyhzb3VyY2VGaWxlLmZpbGVOYW1lKVxuICAgICAgc3lzLndyaXRlRmlsZShzb3VyY2VGaWxlLmZpbGVOYW1lLCBzb3VyY2VGaWxlLnRleHQpXG4gICAgICBzb3VyY2VGaWxlcy5zZXQoc291cmNlRmlsZS5maWxlTmFtZSwgc291cmNlRmlsZSlcbiAgICAgIHJldHVybiBhbHJlYWR5RXhpc3RzXG4gICAgfSxcbiAgfVxuICByZXR1cm4gdkhvc3Rcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIG9iamVjdCB3aGljaCBjYW4gaG9zdCBhIGxhbmd1YWdlIHNlcnZpY2UgYWdhaW5zdCB0aGUgdmlydHVhbCBmaWxlLXN5c3RlbVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVmlydHVhbExhbmd1YWdlU2VydmljZUhvc3QoXG4gIHN5czogU3lzdGVtLFxuICByb290RmlsZXM6IHN0cmluZ1tdLFxuICBjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyxcbiAgdHM6IFRTLFxuICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBDdXN0b21UcmFuc2Zvcm1lcnNcbikge1xuICBjb25zdCBmaWxlTmFtZXMgPSBbLi4ucm9vdEZpbGVzXVxuICBjb25zdCB7IGNvbXBpbGVySG9zdCwgdXBkYXRlRmlsZSB9ID0gY3JlYXRlVmlydHVhbENvbXBpbGVySG9zdChzeXMsIGNvbXBpbGVyT3B0aW9ucywgdHMpXG4gIGNvbnN0IGZpbGVWZXJzaW9ucyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KClcbiAgbGV0IHByb2plY3RWZXJzaW9uID0gMFxuICBjb25zdCBsYW5ndWFnZVNlcnZpY2VIb3N0OiBMYW5ndWFnZVNlcnZpY2VIb3N0ID0ge1xuICAgIC4uLmNvbXBpbGVySG9zdCxcbiAgICBnZXRQcm9qZWN0VmVyc2lvbjogKCkgPT4gcHJvamVjdFZlcnNpb24udG9TdHJpbmcoKSxcbiAgICBnZXRDb21waWxhdGlvblNldHRpbmdzOiAoKSA9PiBjb21waWxlck9wdGlvbnMsXG4gICAgZ2V0Q3VzdG9tVHJhbnNmb3JtZXJzOiAoKSA9PiBjdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgZ2V0U2NyaXB0RmlsZU5hbWVzOiAoKSA9PiBmaWxlTmFtZXMsXG4gICAgZ2V0U2NyaXB0U25hcHNob3Q6IGZpbGVOYW1lID0+IHtcbiAgICAgIGNvbnN0IGNvbnRlbnRzID0gc3lzLnJlYWRGaWxlKGZpbGVOYW1lKVxuICAgICAgaWYgKGNvbnRlbnRzKSB7XG4gICAgICAgIHJldHVybiB0cy5TY3JpcHRTbmFwc2hvdC5mcm9tU3RyaW5nKGNvbnRlbnRzKVxuICAgICAgfVxuICAgICAgcmV0dXJuXG4gICAgfSxcbiAgICBnZXRTY3JpcHRWZXJzaW9uOiBmaWxlTmFtZSA9PiB7XG4gICAgICByZXR1cm4gZmlsZVZlcnNpb25zLmdldChmaWxlTmFtZSkgfHwgXCIwXCJcbiAgICB9LFxuICAgIHdyaXRlRmlsZTogc3lzLndyaXRlRmlsZSxcbiAgfVxuXG4gIHR5cGUgUmV0dXJuID0ge1xuICAgIGxhbmd1YWdlU2VydmljZUhvc3Q6IExhbmd1YWdlU2VydmljZUhvc3RcbiAgICB1cGRhdGVGaWxlOiAoc291cmNlRmlsZTogaW1wb3J0KFwidHlwZXNjcmlwdFwiKS5Tb3VyY2VGaWxlKSA9PiB2b2lkXG4gIH1cblxuICBjb25zdCBsc0hvc3Q6IFJldHVybiA9IHtcbiAgICBsYW5ndWFnZVNlcnZpY2VIb3N0LFxuICAgIHVwZGF0ZUZpbGU6IHNvdXJjZUZpbGUgPT4ge1xuICAgICAgcHJvamVjdFZlcnNpb24rK1xuICAgICAgZmlsZVZlcnNpb25zLnNldChzb3VyY2VGaWxlLmZpbGVOYW1lLCBwcm9qZWN0VmVyc2lvbi50b1N0cmluZygpKVxuICAgICAgaWYgKCFmaWxlTmFtZXMuaW5jbHVkZXMoc291cmNlRmlsZS5maWxlTmFtZSkpIHtcbiAgICAgICAgZmlsZU5hbWVzLnB1c2goc291cmNlRmlsZS5maWxlTmFtZSlcbiAgICAgIH1cbiAgICAgIHVwZGF0ZUZpbGUoc291cmNlRmlsZSlcbiAgICB9LFxuICB9XG4gIHJldHVybiBsc0hvc3Rcbn1cbiJdfQ==