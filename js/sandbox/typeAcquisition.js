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
define(["require", "exports", "./vendor/lzstring.min"], function (require, exports, lzstring_min_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.detectNewImportsToAcquireTypeFor = exports.acquiredTypeDefs = void 0;
    lzstring_min_1 = __importDefault(lzstring_min_1);
    const globalishObj = typeof globalThis !== "undefined" ? globalThis : window || {};
    globalishObj.typeDefinitions = {};
    /**
     * Type Defs we've already got, and nulls when something has failed.
     * This is to make sure that it doesn't infinite loop.
     */
    exports.acquiredTypeDefs = globalishObj.typeDefinitions;
    const moduleJSONURL = (name) => 
    // prettier-ignore
    `https://ofcncog2cu-dsn.algolia.net/1/indexes/npm-search/${encodeURIComponent(name)}?attributes=types&x-algolia-agent=Algolia%20for%20vanilla%20JavaScript%20(lite)%203.27.1&x-algolia-application-id=OFCNCOG2CU&x-algolia-api-key=f54e21fa3a2a0160595bb058179bfb1e`;
    const unpkgURL = (name, path) => {
        if (!name) {
            const actualName = path.substring(0, path.indexOf("/"));
            const actualPath = path.substring(path.indexOf("/") + 1);
            return `https://www.unpkg.com/${encodeURIComponent(actualName)}/${encodeURIComponent(actualPath)}`;
        }
        return `https://www.unpkg.com/${encodeURIComponent(name)}/${encodeURIComponent(path)}`;
    };
    const packageJSONURL = (name) => unpkgURL(name, "package.json");
    const errorMsg = (msg, response, config) => {
        config.logger.error(`${msg} - will not try again in this session`, response.status, response.statusText, response);
    };
    /**
     * Grab any import/requires from inside the code and make a list of
     * its dependencies
     */
    const parseFileForModuleReferences = (sourceCode) => {
        // https://regex101.com/r/Jxa3KX/4
        const requirePattern = /(const|let|var)(.|\n)*? require\(('|")(.*)('|")\);?$/gm;
        // this handle ths 'from' imports  https://regex101.com/r/hdEpzO/4
        const es6Pattern = /(import|export)((?!from)(?!require)(.|\n))*?(from|require\()\s?('|")(.*)('|")\)?;?$/gm;
        // https://regex101.com/r/hdEpzO/8
        const es6ImportOnly = /import\s+?\(?('|")(.*)('|")\)?;?/gm;
        const foundModules = new Set();
        var match;
        while ((match = es6Pattern.exec(sourceCode)) !== null) {
            if (match[6])
                foundModules.add(match[6]);
        }
        while ((match = requirePattern.exec(sourceCode)) !== null) {
            if (match[5])
                foundModules.add(match[5]);
        }
        while ((match = es6ImportOnly.exec(sourceCode)) !== null) {
            if (match[2])
                foundModules.add(match[2]);
        }
        return Array.from(foundModules);
    };
    /** Converts some of the known global imports to node so that we grab the right info */
    const mapModuleNameToModule = (name) => {
        // in node repl:
        // > require("module").builtinModules
        const builtInNodeMods = [
            "assert",
            "async_hooks",
            "buffer",
            "child_process",
            "cluster",
            "console",
            "constants",
            "crypto",
            "dgram",
            "dns",
            "domain",
            "events",
            "fs",
            "fs/promises",
            "http",
            "http2",
            "https",
            "inspector",
            "module",
            "net",
            "os",
            "path",
            "perf_hooks",
            "process",
            "punycode",
            "querystring",
            "readline",
            "repl",
            "stream",
            "string_decoder",
            "sys",
            "timers",
            "tls",
            "trace_events",
            "tty",
            "url",
            "util",
            "v8",
            "vm",
            "wasi",
            "worker_threads",
            "zlib",
        ];
        if (builtInNodeMods.includes(name)) {
            return "node";
        }
        return name;
    };
    //** A really simple version of path.resolve */
    const mapRelativePath = (moduleDeclaration, currentPath) => {
        // https://stackoverflow.com/questions/14780350/convert-relative-path-to-absolute-using-javascript
        function absolute(base, relative) {
            if (!base)
                return relative;
            const stack = base.split("/");
            const parts = relative.split("/");
            stack.pop(); // remove current file name (or empty string)
            for (var i = 0; i < parts.length; i++) {
                if (parts[i] == ".")
                    continue;
                if (parts[i] == "..")
                    stack.pop();
                else
                    stack.push(parts[i]);
            }
            return stack.join("/");
        }
        return absolute(currentPath, moduleDeclaration);
    };
    const convertToModuleReferenceID = (outerModule, moduleDeclaration, currentPath) => {
        const modIsScopedPackageOnly = moduleDeclaration.indexOf("@") === 0 && moduleDeclaration.split("/").length === 2;
        const modIsPackageOnly = moduleDeclaration.indexOf("@") === -1 && moduleDeclaration.split("/").length === 1;
        const isPackageRootImport = modIsPackageOnly || modIsScopedPackageOnly;
        if (isPackageRootImport) {
            return moduleDeclaration;
        }
        else {
            return `${outerModule}-${mapRelativePath(moduleDeclaration, currentPath)}`;
        }
    };
    /**
     * Takes an initial module and the path for the root of the typings and grab it and start grabbing its
     * dependencies then add those the to runtime.
     */
    const addModuleToRuntime = (mod, path, config) => __awaiter(void 0, void 0, void 0, function* () {
        const isDeno = path && path.indexOf("https://") === 0;
        let actualMod = mod;
        let actualPath = path;
        if (!mod) {
            actualMod = path.substring(0, path.indexOf("/"));
            actualPath = path.substring(path.indexOf("/") + 1);
        }
        const dtsFileURL = isDeno ? path : unpkgURL(actualMod, actualPath);
        let content = yield getCachedDTSString(config, dtsFileURL);
        if (!content) {
            const isDeno = actualPath && actualPath.indexOf("https://") === 0;
            const dtsFileURL = isDeno ? actualPath : unpkgURL(actualMod, `${actualPath.replace(".d.ts", "")}/index.d.ts`);
            content = yield getCachedDTSString(config, dtsFileURL);
            if (!content) {
                return errorMsg(`Could not get root d.ts file for the module '${actualMod}' at ${actualPath}`, {}, config);
            }
        }
        // Now look and grab dependent modules where you need the
        yield getDependenciesForModule(content, actualMod, actualPath, config);
        if (isDeno) {
            const wrapped = `declare module "${actualPath}" { ${content} }`;
            config.addLibraryToRuntime(wrapped, actualPath);
        }
        else {
            config.addLibraryToRuntime(content, `file:///node_modules/${actualMod}/${actualPath}`);
        }
    });
    /**
     * Takes a module import, then uses both the algolia API and the the package.json to derive
     * the root type def path.
     *
     * @param {string} packageName
     * @returns {Promise<{ mod: string, path: string, packageJSON: any }>}
     */
    const getModuleAndRootDefTypePath = (packageName, config) => __awaiter(void 0, void 0, void 0, function* () {
        const url = moduleJSONURL(packageName);
        const response = yield config.fetcher(url);
        if (!response.ok) {
            return errorMsg(`Could not get Algolia JSON for the module '${packageName}'`, response, config);
        }
        const responseJSON = yield response.json();
        if (!responseJSON) {
            return errorMsg(`Could the Algolia JSON was un-parsable for the module '${packageName}'`, response, config);
        }
        if (!responseJSON.types) {
            return config.logger.log(`There were no types for '${packageName}' - will not try again in this session`);
        }
        if (!responseJSON.types.ts) {
            return config.logger.log(`There were no types for '${packageName}' - will not try again in this session`);
        }
        exports.acquiredTypeDefs[packageName] = responseJSON;
        if (responseJSON.types.ts === "included") {
            const modPackageURL = packageJSONURL(packageName);
            const response = yield config.fetcher(modPackageURL);
            if (!response.ok) {
                return errorMsg(`Could not get Package JSON for the module '${packageName}'`, response, config);
            }
            const responseJSON = yield response.json();
            if (!responseJSON) {
                return errorMsg(`Could not get Package JSON for the module '${packageName}'`, response, config);
            }
            config.addLibraryToRuntime(JSON.stringify(responseJSON, null, "  "), `file:///node_modules/${packageName}/package.json`);
            // Get the path of the root d.ts file
            // non-inferred route
            let rootTypePath = responseJSON.typing || responseJSON.typings || responseJSON.types;
            // package main is custom
            if (!rootTypePath && typeof responseJSON.main === "string" && responseJSON.main.indexOf(".js") > 0) {
                rootTypePath = responseJSON.main.replace(/js$/, "d.ts");
            }
            // Final fallback, to have got here it must have passed in algolia
            if (!rootTypePath) {
                rootTypePath = "index.d.ts";
            }
            return { mod: packageName, path: rootTypePath, packageJSON: responseJSON };
        }
        else if (responseJSON.types.ts === "definitely-typed") {
            return { mod: responseJSON.types.definitelyTyped, path: "index.d.ts", packageJSON: responseJSON };
        }
        else {
            throw "This shouldn't happen";
        }
    });
    const getCachedDTSString = (config, url) => __awaiter(void 0, void 0, void 0, function* () {
        const cached = localStorage.getItem(url);
        if (cached) {
            const [dateString, text] = cached.split("-=-^-=-");
            const cachedDate = new Date(dateString);
            const now = new Date();
            const cacheTimeout = 604800000; // 1 week
            // const cacheTimeout = 60000 // 1 min
            if (now.getTime() - cachedDate.getTime() < cacheTimeout) {
                return lzstring_min_1.default.decompressFromUTF16(text);
            }
            else {
                config.logger.log("Skipping cache for ", url);
            }
        }
        const response = yield config.fetcher(url);
        if (!response.ok) {
            return errorMsg(`Could not get DTS response for the module at ${url}`, response, config);
        }
        // TODO: handle checking for a resolve to index.d.ts whens someone imports the folder
        let content = yield response.text();
        if (!content) {
            return errorMsg(`Could not get text for DTS response at ${url}`, response, config);
        }
        const now = new Date();
        const cacheContent = `${now.toISOString()}-=-^-=-${lzstring_min_1.default.compressToUTF16(content)}`;
        localStorage.setItem(url, cacheContent);
        return content;
    });
    const getReferenceDependencies = (sourceCode, mod, path, config) => __awaiter(void 0, void 0, void 0, function* () {
        var match;
        if (sourceCode.indexOf("reference path") > 0) {
            // https://regex101.com/r/DaOegw/1
            const referencePathExtractionPattern = /<reference path="(.*)" \/>/gm;
            while ((match = referencePathExtractionPattern.exec(sourceCode)) !== null) {
                const relativePath = match[1];
                if (relativePath) {
                    let newPath = mapRelativePath(relativePath, path);
                    if (newPath) {
                        const dtsRefURL = unpkgURL(mod, newPath);
                        const dtsReferenceResponseText = yield getCachedDTSString(config, dtsRefURL);
                        if (!dtsReferenceResponseText) {
                            return errorMsg(`Could not get root d.ts file for the module '${mod}' at ${path}`, {}, config);
                        }
                        yield getDependenciesForModule(dtsReferenceResponseText, mod, newPath, config);
                        const representationalPath = `file:///node_modules/${mod}/${newPath}`;
                        config.addLibraryToRuntime(dtsReferenceResponseText, representationalPath);
                    }
                }
            }
        }
    });
    /**
     * Pseudo in-browser type acquisition tool, uses a
     */
    const detectNewImportsToAcquireTypeFor = (sourceCode, userAddLibraryToRuntime, fetcher = fetch, playgroundConfig) => __awaiter(void 0, void 0, void 0, function* () {
        // Wrap the runtime func with our own side-effect for visibility
        const addLibraryToRuntime = (code, path) => {
            globalishObj.typeDefinitions[path] = code;
            userAddLibraryToRuntime(code, path);
        };
        // Basically start the recursion with an undefined module
        const config = { sourceCode, addLibraryToRuntime, fetcher, logger: playgroundConfig.logger };
        const results = getDependenciesForModule(sourceCode, undefined, "playground.ts", config);
        return results;
    });
    exports.detectNewImportsToAcquireTypeFor = detectNewImportsToAcquireTypeFor;
    /**
     * Looks at a JS/DTS file and recurses through all the dependencies.
     * It avoids
     */
    const getDependenciesForModule = (sourceCode, moduleName, path, config) => {
        // Get all the import/requires for the file
        const filteredModulesToLookAt = parseFileForModuleReferences(sourceCode);
        filteredModulesToLookAt.forEach((name) => __awaiter(void 0, void 0, void 0, function* () {
            // Support grabbing the hard-coded node modules if needed
            const moduleToDownload = mapModuleNameToModule(name);
            if (!moduleName && moduleToDownload.startsWith(".")) {
                return config.logger.log("[ATA] Can't resolve relative dependencies from the playground root");
            }
            const moduleID = convertToModuleReferenceID(moduleName, moduleToDownload, moduleName);
            if (exports.acquiredTypeDefs[moduleID] || exports.acquiredTypeDefs[moduleID] === null) {
                return;
            }
            config.logger.log(`[ATA] Looking at ${moduleToDownload}`);
            const modIsScopedPackageOnly = moduleToDownload.indexOf("@") === 0 && moduleToDownload.split("/").length === 2;
            const modIsPackageOnly = moduleToDownload.indexOf("@") === -1 && moduleToDownload.split("/").length === 1;
            const isPackageRootImport = modIsPackageOnly || modIsScopedPackageOnly;
            const isDenoModule = moduleToDownload.indexOf("https://") === 0;
            if (isPackageRootImport) {
                // So it doesn't run twice for a package
                exports.acquiredTypeDefs[moduleID] = null;
                // E.g. import danger from "danger"
                const packageDef = yield getModuleAndRootDefTypePath(moduleToDownload, config);
                if (packageDef) {
                    exports.acquiredTypeDefs[moduleID] = packageDef.packageJSON;
                    yield addModuleToRuntime(packageDef.mod, packageDef.path, config);
                }
            }
            else if (isDenoModule) {
                // E.g. import { serve } from "https://deno.land/std@v0.12/http/server.ts";
                yield addModuleToRuntime(moduleToDownload, moduleToDownload, config);
            }
            else {
                // E.g. import {Component} from "./MyThing"
                if (!moduleToDownload || !path)
                    throw `No outer module or path for a relative import: ${moduleToDownload}`;
                const absolutePathForModule = mapRelativePath(moduleToDownload, path);
                // So it doesn't run twice for a package
                exports.acquiredTypeDefs[moduleID] = null;
                const resolvedFilepath = absolutePathForModule.endsWith(".ts")
                    ? absolutePathForModule
                    : absolutePathForModule + ".d.ts";
                yield addModuleToRuntime(moduleName, resolvedFilepath, config);
            }
        }));
        // Also support the
        getReferenceDependencies(sourceCode, moduleName, path, config);
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZUFjcXVpc2l0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc2FuZGJveC9zcmMvdHlwZUFjcXVpc2l0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBR0EsTUFBTSxZQUFZLEdBQVEsT0FBTyxVQUFVLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUE7SUFDdkYsWUFBWSxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUE7SUFFakM7OztPQUdHO0lBQ1UsUUFBQSxnQkFBZ0IsR0FBc0MsWUFBWSxDQUFDLGVBQWUsQ0FBQTtJQUkvRixNQUFNLGFBQWEsR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFO0lBQ3JDLGtCQUFrQjtJQUNsQiwyREFBMkQsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGlMQUFpTCxDQUFBO0lBRXRRLE1BQU0sUUFBUSxHQUFHLENBQUMsSUFBWSxFQUFFLElBQVksRUFBRSxFQUFFO1FBQzlDLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDVCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDeEQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3pELE9BQU8seUJBQXlCLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUE7U0FFbkc7UUFDRCxPQUFPLHlCQUF5QixrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFBO0lBQ3hGLENBQUMsQ0FBQTtJQUVELE1BQU0sY0FBYyxHQUFHLENBQUMs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QUcsVUFBVSxDQUFDLFdBQVcsQ0FBQTtvQkFDbkQsTUFBTSxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUE7aUJBQ2xFO2FBQ0Y7aUJBQU0sSUFBSSxZQUFZLEVBQUU7Z0JBQ3ZCLDJFQUEyRTtnQkFDM0UsTUFBTSxrQkFBa0IsQ0FBQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQTthQUNyRTtpQkFBTTtnQkFDTCwyQ0FBMkM7Z0JBQzNDLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLElBQUk7b0JBQUUsTUFBTSxrREFBa0QsZ0JBQWdCLEVBQUUsQ0FBQTtnQkFFMUcsTUFBTSxxQkFBcUIsR0FBRyxlQUFlLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBRXJFLHdDQUF3QztnQkFDeEMsd0JBQWdCLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFBO2dCQUVqQyxNQUFNLGdCQUFnQixHQUFHLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7b0JBQzVELENBQUMsQ0FBQyxxQkFBcUI7b0JBQ3ZCLENBQUMsQ0FBQyxxQkFBcUIsR0FBRyxPQUFPLENBQUE7Z0JBRW5DLE1BQU0sa0JBQWtCLENBQUMsVUFBVyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFBO2FBQ2hFO1FBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQTtRQUVGLG1CQUFtQjtRQUNuQix3QkFBd0IsQ0FBQyxVQUFVLEVBQUUsVUFBVyxFQUFFLElBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUNsRSxDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQbGF5Z3JvdW5kQ29uZmlnIH0gZnJvbSBcIi4vXCJcbmltcG9ydCBsenN0cmluZyBmcm9tIFwiLi92ZW5kb3IvbHpzdHJpbmcubWluXCJcblxuY29uc3QgZ2xvYmFsaXNoT2JqOiBhbnkgPSB0eXBlb2YgZ2xvYmFsVGhpcyAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFRoaXMgOiB3aW5kb3cgfHwge31cbmdsb2JhbGlzaE9iai50eXBlRGVmaW5pdGlvbnMgPSB7fVxuXG4vKipcbiAqIFR5cGUgRGVmcyB3ZSd2ZSBhbHJlYWR5IGdvdCwgYW5kIG51bGxzIHdoZW4gc29tZXRoaW5nIGhhcyBmYWlsZWQuXG4gKiBUaGlzIGlzIHRvIG1ha2Ugc3VyZSB0aGF0IGl0IGRvZXNuJ3QgaW5maW5pdGUgbG9vcC5cbiAqL1xuZXhwb3J0IGNvbnN0IGFjcXVpcmVkVHlwZURlZnM6IHsgW25hbWU6IHN0cmluZ106IHN0cmluZyB8IG51bGwgfSA9IGdsb2JhbGlzaE9iai50eXBlRGVmaW5pdGlvbnNcblxuZXhwb3J0IHR5cGUgQWRkTGliVG9SdW50aW1lRnVuYyA9IChjb2RlOiBzdHJpbmcsIHBhdGg6IHN0cmluZykgPT4gdm9pZFxuXG5jb25zdCBtb2R1bGVKU09OVVJMID0gKG5hbWU6IHN0cmluZykgPT5cbiAgLy8gcHJldHRpZXItaWdub3JlXG4gIGBodHRwczovL29mY25jb2cyY3UtZHNuLmFsZ29saWEubmV0LzEvaW5kZXhlcy9ucG0tc2VhcmNoLyR7ZW5jb2RlVVJJQ29tcG9uZW50KG5hbWUpfT9hdHRyaWJ1dGVzPXR5cGVzJngtYWxnb2xpYS1hZ2VudD1BbGdvbGlhJTIwZm9yJTIwdmFuaWxsYSUyMEphdmFTY3JpcHQlMjAobGl0ZSklMjAzLjI3LjEmeC1hbGdvbGlhLWFwcGxpY2F0aW9uLWlkPU9GQ05DT0cyQ1UmeC1hbGdvbGlhLWFwaS1rZXk9ZjU0ZTIxZmEzYTJhMDE2MDU5NWJiMDU4MTc5YmZiMWVgXG5cbmNvbnN0IHVucGtnVVJMID0gKG5hbWU6IHN0cmluZywgcGF0aDogc3RyaW5nKSA9PiB7XG4gIGlmICghbmFtZSkge1xuICAgIGNvbnN0IGFjdHVhbE5hbWUgPSBwYXRoLnN1YnN0cmluZygwLCBwYXRoLmluZGV4T2YoXCIvXCIpKTtcbiAgICBjb25zdCBhY3R1YWxQYXRoID0gcGF0aC5zdWJzdHJpbmcocGF0aC5pbmRleE9mKFwiL1wiKSArIDEpO1xuICAgIHJldHVybiBgaHR0cHM6Ly93d3cudW5wa2cuY29tLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGFjdHVhbE5hbWUpfS8ke2VuY29kZVVSSUNvbXBvbmVudChhY3R1YWxQYXRoKX1gXG5cbiAgfVxuICByZXR1cm4gYGh0dHBzOi8vd3d3LnVucGtnLmNvbS8ke2VuY29kZVVSSUNvbXBvbmVudChuYW1lKX0vJHtlbmNvZGVVUklDb21wb25lbnQocGF0aCl9YFxufVxuXG5jb25zdCBwYWNrYWdlSlNPTlVSTCA9IChuYW1lOiBzdHJpbmcpID0+IHVucGtnVVJMKG5hbWUsIFwicGFja2FnZS5qc29uXCIpXG5cbmNvbnN0IGVycm9yTXNnID0gKG1zZzogc3RyaW5nLCByZXNwb25zZTogYW55LCBjb25maWc6IEFUQUNvbmZpZykgPT4ge1xuICBjb25maWcubG9nZ2VyLmVycm9yKGAke21zZ30gLSB3aWxsIG5vdCB0cnkgYWdhaW4gaW4gdGhpcyBzZXNzaW9uYCwgcmVzcG9uc2Uuc3RhdHVzLCByZXNwb25zZS5zdGF0dXNUZXh0LCByZXNwb25zZSlcbn1cblxuLyoqXG4gKiBHcmFiIGFueSBpbXBvcnQvcmVxdWlyZXMgZnJvbSBpbnNpZGUgdGhlIGNvZGUgYW5kIG1ha2UgYSBsaXN0IG9mXG4gKiBpdHMgZGVwZW5kZW5jaWVzXG4gKi9cbmNvbnN0IHBhcnNlRmlsZUZvck1vZHVsZVJlZmVyZW5jZXMgPSAoc291cmNlQ29kZTogc3RyaW5nKSA9PiB7XG4gIC8vIGh0dHBzOi8vcmVnZXgxMDEuY29tL3IvSnhhM0tYLzRcbiAgY29uc3QgcmVxdWlyZVBhdHRlcm4gPSAvKGNvbnN0fGxldHx2YXIpKC58XFxuKSo/IHJlcXVpcmVcXCgoJ3xcIikoLiopKCd8XCIpXFwpOz8kL2dtXG4gIC8vIHRoaXMgaGFuZGxlIHRocyAnZnJvbScgaW1wb3J0cyAgaHR0cHM6Ly9yZWdleDEwMS5jb20vci9oZEVwek8vNFxuICBjb25zdCBlczZQYXR0ZXJuID0gLyhpbXBvcnR8ZXhwb3J0KSgoPyFmcm9tKSg/IXJlcXVpcmUpKC58XFxuKSkqPyhmcm9tfHJlcXVpcmVcXCgpXFxzPygnfFwiKSguKikoJ3xcIilcXCk/Oz8kL2dtXG4gIC8vIGh0dHBzOi8vcmVnZXgxMDEuY29tL3IvaGRFcHpPLzhcbiAgY29uc3QgZXM2SW1wb3J0T25seSA9IC9pbXBvcnRcXHMrP1xcKD8oJ3xcIikoLiopKCd8XCIpXFwpPzs/L2dtXG5cbiAgY29uc3QgZm91bmRNb2R1bGVzID0gbmV3IFNldDxzdHJpbmc+KClcbiAgdmFyIG1hdGNoXG5cbiAgd2hpbGUgKChtYXRjaCA9IGVzNlBhdHRlcm4uZXhlYyhzb3VyY2VDb2RlKSkgIT09IG51bGwpIHtcbiAgICBpZiAobWF0Y2hbNl0pIGZvdW5kTW9kdWxlcy5hZGQobWF0Y2hbNl0pXG4gIH1cblxuICB3aGlsZSAoKG1hdGNoID0gcmVxdWlyZVBhdHRlcm4uZXhlYyhzb3VyY2VDb2RlKSkgIT09IG51bGwpIHtcbiAgICBpZiAobWF0Y2hbNV0pIGZvdW5kTW9kdWxlcy5hZGQobWF0Y2hbNV0pXG4gIH1cblxuICB3aGlsZSAoKG1hdGNoID0gZXM2SW1wb3J0T25seS5leGVjKHNvdXJjZUNvZGUpKSAhPT0gbnVsbCkge1xuICAgIGlmIChtYXRjaFsyXSkgZm91bmRNb2R1bGVzLmFkZChtYXRjaFsyXSlcbiAgfVxuXG4gIHJldHVybiBBcnJheS5mcm9tKGZvdW5kTW9kdWxlcylcbn1cblxuLyoqIENvbnZlcnRzIHNvbWUgb2YgdGhlIGtub3duIGdsb2JhbCBpbXBvcnRzIHRvIG5vZGUgc28gdGhhdCB3ZSBncmFiIHRoZSByaWdodCBpbmZvICovXG5jb25zdCBtYXBNb2R1bGVOYW1lVG9Nb2R1bGUgPSAobmFtZTogc3RyaW5nKSA9PiB7XG4gIC8vIGluIG5vZGUgcmVwbDpcbiAgLy8gPiByZXF1aXJlKFwibW9kdWxlXCIpLmJ1aWx0aW5Nb2R1bGVzXG4gIGNvbnN0IGJ1aWx0SW5Ob2RlTW9kcyA9IFtcbiAgICBcImFzc2VydFwiLFxuICAgIFwiYXN5bmNfaG9va3NcIixcbiAgICBcImJ1ZmZlclwiLFxuICAgIFwiY2hpbGRfcHJvY2Vzc1wiLFxuICAgIFwiY2x1c3RlclwiLFxuICAgIFwiY29uc29sZVwiLFxuICAgIFwiY29uc3RhbnRzXCIsXG4gICAgXCJjcnlwdG9cIixcbiAgICBcImRncmFtXCIsXG4gICAgXCJkbnNcIixcbiAgICBcImRvbWFpblwiLFxuICAgIFwiZXZlbnRzXCIsXG4gICAgXCJmc1wiLFxuICAgIFwiZnMvcHJvbWlzZXNcIixcbiAgICBcImh0dHBcIixcbiAgICBcImh0dHAyXCIsXG4gICAgXCJodHRwc1wiLFxuICAgIFwiaW5zcGVjdG9yXCIsXG4gICAgXCJtb2R1bGVcIixcbiAgICBcIm5ldFwiLFxuICAgIFwib3NcIixcbiAgICBcInBhdGhcIixcbiAgICBcInBlcmZfaG9va3NcIixcbiAgICBcInByb2Nlc3NcIixcbiAgICBcInB1bnljb2RlXCIsXG4gICAgXCJxdWVyeXN0cmluZ1wiLFxuICAgIFwicmVhZGxpbmVcIixcbiAgICBcInJlcGxcIixcbiAgICBcInN0cmVhbVwiLFxuICAgIFwic3RyaW5nX2RlY29kZXJcIixcbiAgICBcInN5c1wiLFxuICAgIFwidGltZXJzXCIsXG4gICAgXCJ0bHNcIixcbiAgICBcInRyYWNlX2V2ZW50c1wiLFxuICAgIFwidHR5XCIsXG4gICAgXCJ1cmxcIixcbiAgICBcInV0aWxcIixcbiAgICBcInY4XCIsXG4gICAgXCJ2bVwiLFxuICAgIFwid2FzaVwiLFxuICAgIFwid29ya2VyX3RocmVhZHNcIixcbiAgICBcInpsaWJcIixcbiAgXVxuXG4gIGlmIChidWlsdEluTm9kZU1vZHMuaW5jbHVkZXMobmFtZSkpIHtcbiAgICByZXR1cm4gXCJub2RlXCJcbiAgfVxuICByZXR1cm4gbmFtZVxufVxuXG4vLyoqIEEgcmVhbGx5IHNpbXBsZSB2ZXJzaW9uIG9mIHBhdGgucmVzb2x2ZSAqL1xuY29uc3QgbWFwUmVsYXRpdmVQYXRoID0gKG1vZHVsZURlY2xhcmF0aW9uOiBzdHJpbmcsIGN1cnJlbnRQYXRoOiBzdHJpbmcpID0+IHtcbiAgLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTQ3ODAzNTAvY29udmVydC1yZWxhdGl2ZS1wYXRoLXRvLWFic29sdXRlLXVzaW5nLWphdmFzY3JpcHRcbiAgZnVuY3Rpb24gYWJzb2x1dGUoYmFzZTogc3RyaW5nLCByZWxhdGl2ZTogc3RyaW5nKSB7XG4gICAgaWYgKCFiYXNlKSByZXR1cm4gcmVsYXRpdmVcblxuICAgIGNvbnN0IHN0YWNrID0gYmFzZS5zcGxpdChcIi9cIilcbiAgICBjb25zdCBwYXJ0cyA9IHJlbGF0aXZlLnNwbGl0KFwiL1wiKVxuICAgIHN0YWNrLnBvcCgpIC8vIHJlbW92ZSBjdXJyZW50IGZpbGUgbmFtZSAob3IgZW1wdHkgc3RyaW5nKVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHBhcnRzW2ldID09IFwiLlwiKSBjb250aW51ZVxuICAgICAgaWYgKHBhcnRzW2ldID09IFwiLi5cIikgc3RhY2sucG9wKClcbiAgICAgIGVsc2Ugc3RhY2sucHVzaChwYXJ0c1tpXSlcbiAgICB9XG4gICAgcmV0dXJuIHN0YWNrLmpvaW4oXCIvXCIpXG4gIH1cblxuICByZXR1cm4gYWJzb2x1dGUoY3VycmVudFBhdGgsIG1vZHVsZURlY2xhcmF0aW9uKVxufVxuXG5jb25zdCBjb252ZXJ0VG9Nb2R1bGVSZWZlcmVuY2VJRCA9IChvdXRlck1vZHVsZTogc3RyaW5nLCBtb2R1bGVEZWNsYXJhdGlvbjogc3RyaW5nLCBjdXJyZW50UGF0aDogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IG1vZElzU2NvcGVkUGFja2FnZU9ubHkgPSBtb2R1bGVEZWNsYXJhdGlvbi5pbmRleE9mKFwiQFwiKSA9PT0gMCAmJiBtb2R1bGVEZWNsYXJhdGlvbi5zcGxpdChcIi9cIikubGVuZ3RoID09PSAyXG4gIGNvbnN0IG1vZElzUGFja2FnZU9ubHkgPSBtb2R1bGVEZWNsYXJhdGlvbi5pbmRleE9mKFwiQFwiKSA9PT0gLTEgJiYgbW9kdWxlRGVjbGFyYXRpb24uc3BsaXQoXCIvXCIpLmxlbmd0aCA9PT0gMVxuICBjb25zdCBpc1BhY2thZ2VSb290SW1wb3J0ID0gbW9kSXNQYWNrYWdlT25seSB8fCBtb2RJc1Njb3BlZFBhY2thZ2VPbmx5XG5cbiAgaWYgKGlzUGFja2FnZVJvb3RJbXBvcnQpIHtcbiAgICByZXR1cm4gbW9kdWxlRGVjbGFyYXRpb25cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYCR7b3V0ZXJNb2R1bGV9LSR7bWFwUmVsYXRpdmVQYXRoKG1vZHVsZURlY2xhcmF0aW9uLCBjdXJyZW50UGF0aCl9YFxuICB9XG59XG5cbi8qKlxuICogVGFrZXMgYW4gaW5pdGlhbCBtb2R1bGUgYW5kIHRoZSBwYXRoIGZvciB0aGUgcm9vdCBvZiB0aGUgdHlwaW5ncyBhbmQgZ3JhYiBpdCBhbmQgc3RhcnQgZ3JhYmJpbmcgaXRzXG4gKiBkZXBlbmRlbmNpZXMgdGhlbiBhZGQgdGhvc2UgdGhlIHRvIHJ1bnRpbWUuXG4gKi9cbmNvbnN0IGFkZE1vZHVsZVRvUnVudGltZSA9IGFzeW5jIChtb2Q6IHN0cmluZywgcGF0aDogc3RyaW5nLCBjb25maWc6IEFUQUNvbmZpZykgPT4ge1xuICBjb25zdCBpc0Rlbm8gPSBwYXRoICYmIHBhdGguaW5kZXhPZihcImh0dHBzOi8vXCIpID09PSAwXG5cbiAgbGV0IGFjdHVhbE1vZCA9IG1vZDtcbiAgbGV0IGFjdHVhbFBhdGggPSBwYXRoO1xuXG4gIGlmICghbW9kKSB7XG4gICAgYWN0dWFsTW9kID0gcGF0aC5zdWJzdHJpbmcoMCwgcGF0aC5pbmRleE9mKFwiL1wiKSk7XG4gICAgYWN0dWFsUGF0aCA9IHBhdGguc3Vic3RyaW5nKHBhdGguaW5kZXhPZihcIi9cIikgKyAxKTtcbiAgfVxuXG4gIGNvbnN0IGR0c0ZpbGVVUkwgPSBpc0Rlbm8gPyBwYXRoIDogdW5wa2dVUkwoYWN0dWFsTW9kLCBhY3R1YWxQYXRoKVxuXG4gIGxldCBjb250ZW50ID0gYXdhaXQgZ2V0Q2FjaGVkRFRTU3RyaW5nKGNvbmZpZywgZHRzRmlsZVVSTClcbiAgaWYgKCFjb250ZW50KSB7XG4gICAgY29uc3QgaXNEZW5vID0gYWN0dWFsUGF0aCAmJiBhY3R1YWxQYXRoLmluZGV4T2YoXCJodHRwczovL1wiKSA9PT0gMFxuXG4gICAgY29uc3QgZHRzRmlsZVVSTCA9IGlzRGVubyA/IGFjdHVhbFBhdGggOiB1bnBrZ1VSTChhY3R1YWxNb2QsIGAke2FjdHVhbFBhdGgucmVwbGFjZShcIi5kLnRzXCIsIFwiXCIpfS9pbmRleC5kLnRzYCk7XG4gICAgY29udGVudCA9IGF3YWl0IGdldENhY2hlZERUU1N0cmluZyhjb25maWcsIGR0c0ZpbGVVUkwpO1xuXG4gICAgaWYgKCFjb250ZW50KSB7XG4gICAgICByZXR1cm4gZXJyb3JNc2coYENvdWxkIG5vdCBnZXQgcm9vdCBkLnRzIGZpbGUgZm9yIHRoZSBtb2R1bGUgJyR7YWN0dWFsTW9kfScgYXQgJHthY3R1YWxQYXRofWAsIHt9LCBjb25maWcpO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gTm93IGxvb2sgYW5kIGdyYWIgZGVwZW5kZW50IG1vZHVsZXMgd2hlcmUgeW91IG5lZWQgdGhlXG4gIGF3YWl0IGdldERlcGVuZGVuY2llc0Zvck1vZHVsZShjb250ZW50LCBhY3R1YWxNb2QsIGFjdHVhbFBhdGgsIGNvbmZpZylcblxuICBpZiAoaXNEZW5vKSB7XG4gICAgY29uc3Qgd3JhcHBlZCA9IGBkZWNsYXJlIG1vZHVsZSBcIiR7YWN0dWFsUGF0aH1cIiB7ICR7Y29udGVudH0gfWBcbiAgICBjb25maWcuYWRkTGlicmFyeVRvUnVudGltZSh3cmFwcGVkLCBhY3R1YWxQYXRoKVxuICB9IGVsc2Uge1xuICAgIGNvbmZpZy5hZGRMaWJyYXJ5VG9SdW50aW1lKGNvbnRlbnQsIGBmaWxlOi8vL25vZGVfbW9kdWxlcy8ke2FjdHVhbE1vZH0vJHthY3R1YWxQYXRofWApXG4gIH1cbn1cblxuLyoqXG4gKiBUYWtlcyBhIG1vZHVsZSBpbXBvcnQsIHRoZW4gdXNlcyBib3RoIHRoZSBhbGdvbGlhIEFQSSBhbmQgdGhlIHRoZSBwYWNrYWdlLmpzb24gdG8gZGVyaXZlXG4gKiB0aGUgcm9vdCB0eXBlIGRlZiBwYXRoLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYWNrYWdlTmFtZVxuICogQHJldHVybnMge1Byb21pc2U8eyBtb2Q6IHN0cmluZywgcGF0aDogc3RyaW5nLCBwYWNrYWdlSlNPTjogYW55IH0+fVxuICovXG5jb25zdCBnZXRNb2R1bGVBbmRSb290RGVmVHlwZVBhdGggPSBhc3luYyAocGFja2FnZU5hbWU6IHN0cmluZywgY29uZmlnOiBBVEFDb25maWcpID0+IHtcbiAgY29uc3QgdXJsID0gbW9kdWxlSlNPTlVSTChwYWNrYWdlTmFtZSlcblxuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGNvbmZpZy5mZXRjaGVyKHVybClcbiAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgIHJldHVybiBlcnJvck1zZyhgQ291bGQgbm90IGdldCBBbGdvbGlhIEpTT04gZm9yIHRoZSBtb2R1bGUgJyR7cGFja2FnZU5hbWV9J2AsIHJlc3BvbnNlLCBjb25maWcpXG4gIH1cblxuICBjb25zdCByZXNwb25zZUpTT04gPSBhd2FpdCByZXNwb25zZS5qc29uKClcbiAgaWYgKCFyZXNwb25zZUpTT04pIHtcbiAgICByZXR1cm4gZXJyb3JNc2coYENvdWxkIHRoZSBBbGdvbGlhIEpTT04gd2FzIHVuLXBhcnNhYmxlIGZvciB0aGUgbW9kdWxlICcke3BhY2thZ2VOYW1lfSdgLCByZXNwb25zZSwgY29uZmlnKVxuICB9XG5cbiAgaWYgKCFyZXNwb25zZUpTT04udHlwZXMpIHtcbiAgICByZXR1cm4gY29uZmlnLmxvZ2dlci5sb2coYFRoZXJlIHdlcmUgbm8gdHlwZXMgZm9yICcke3BhY2thZ2VOYW1lfScgLSB3aWxsIG5vdCB0cnkgYWdhaW4gaW4gdGhpcyBzZXNzaW9uYClcbiAgfVxuICBpZiAoIXJlc3BvbnNlSlNPTi50eXBlcy50cykge1xuICAgIHJldHVybiBjb25maWcubG9nZ2VyLmxvZyhgVGhlcmUgd2VyZSBubyB0eXBlcyBmb3IgJyR7cGFja2FnZU5hbWV9JyAtIHdpbGwgbm90IHRyeSBhZ2FpbiBpbiB0aGlzIHNlc3Npb25gKVxuICB9XG5cbiAgYWNxdWlyZWRUeXBlRGVmc1twYWNrYWdlTmFtZV0gPSByZXNwb25zZUpTT05cblxuICBpZiAocmVzcG9uc2VKU09OLnR5cGVzLnRzID09PSBcImluY2x1ZGVkXCIpIHtcbiAgICBjb25zdCBtb2RQYWNrYWdlVVJMID0gcGFja2FnZUpTT05VUkwocGFja2FnZU5hbWUpXG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGNvbmZpZy5mZXRjaGVyKG1vZFBhY2thZ2VVUkwpXG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgcmV0dXJuIGVycm9yTXNnKGBDb3VsZCBub3QgZ2V0IFBhY2thZ2UgSlNPTiBmb3IgdGhlIG1vZHVsZSAnJHtwYWNrYWdlTmFtZX0nYCwgcmVzcG9uc2UsIGNvbmZpZylcbiAgICB9XG5cbiAgICBjb25zdCByZXNwb25zZUpTT04gPSBhd2FpdCByZXNwb25zZS5qc29uKClcbiAgICBpZiAoIXJlc3BvbnNlSlNPTikge1xuICAgICAgcmV0dXJuIGVycm9yTXNnKGBDb3VsZCBub3QgZ2V0IFBhY2thZ2UgSlNPTiBmb3IgdGhlIG1vZHVsZSAnJHtwYWNrYWdlTmFtZX0nYCwgcmVzcG9uc2UsIGNvbmZpZylcbiAgICB9XG5cbiAgICBjb25maWcuYWRkTGlicmFyeVRvUnVudGltZShcbiAgICAgIEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlSlNPTiwgbnVsbCwgXCIgIFwiKSxcbiAgICAgIGBmaWxlOi8vL25vZGVfbW9kdWxlcy8ke3BhY2thZ2VOYW1lfS9wYWNrYWdlLmpzb25gXG4gICAgKVxuXG4gICAgLy8gR2V0IHRoZSBwYXRoIG9mIHRoZSByb290IGQudHMgZmlsZVxuXG4gICAgLy8gbm9uLWluZmVycmVkIHJvdXRlXG4gICAgbGV0IHJvb3RUeXBlUGF0aCA9IHJlc3BvbnNlSlNPTi50eXBpbmcgfHwgcmVzcG9uc2VKU09OLnR5cGluZ3MgfHwgcmVzcG9uc2VKU09OLnR5cGVzXG5cbiAgICAvLyBwYWNrYWdlIG1haW4gaXMgY3VzdG9tXG4gICAgaWYgKCFyb290VHlwZVBhdGggJiYgdHlwZW9mIHJlc3BvbnNlSlNPTi5tYWluID09PSBcInN0cmluZ1wiICYmIHJlc3BvbnNlSlNPTi5tYWluLmluZGV4T2YoXCIuanNcIikgPiAwKSB7XG4gICAgICByb290VHlwZVBhdGggPSByZXNwb25zZUpTT04ubWFpbi5yZXBsYWNlKC9qcyQvLCBcImQudHNcIilcbiAgICB9XG5cbiAgICAvLyBGaW5hbCBmYWxsYmFjaywgdG8gaGF2ZSBnb3QgaGVyZSBpdCBtdXN0IGhhdmUgcGFzc2VkIGluIGFsZ29saWFcbiAgICBpZiAoIXJvb3RUeXBlUGF0aCkge1xuICAgICAgcm9vdFR5cGVQYXRoID0gXCJpbmRleC5kLnRzXCJcbiAgICB9XG5cbiAgICByZXR1cm4geyBtb2Q6IHBhY2thZ2VOYW1lLCBwYXRoOiByb290VHlwZVBhdGgsIHBhY2thZ2VKU09OOiByZXNwb25zZUpTT04gfVxuICB9IGVsc2UgaWYgKHJlc3BvbnNlSlNPTi50eXBlcy50cyA9PT0gXCJkZWZpbml0ZWx5LXR5cGVkXCIpIHtcbiAgICByZXR1cm4geyBtb2Q6IHJlc3BvbnNlSlNPTi50eXBlcy5kZWZpbml0ZWx5VHlwZWQsIHBhdGg6IFwiaW5kZXguZC50c1wiLCBwYWNrYWdlSlNPTjogcmVzcG9uc2VKU09OIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBcIlRoaXMgc2hvdWxkbid0IGhhcHBlblwiXG4gIH1cbn1cblxuY29uc3QgZ2V0Q2FjaGVkRFRTU3RyaW5nID0gYXN5bmMgKGNvbmZpZzogQVRBQ29uZmlnLCB1cmw6IHN0cmluZykgPT4ge1xuICBjb25zdCBjYWNoZWQgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSh1cmwpXG4gIGlmIChjYWNoZWQpIHtcbiAgICBjb25zdCBbZGF0ZVN0cmluZywgdGV4dF0gPSBjYWNoZWQuc3BsaXQoXCItPS1eLT0tXCIpXG4gICAgY29uc3QgY2FjaGVkRGF0ZSA9IG5ldyBEYXRlKGRhdGVTdHJpbmcpXG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKVxuXG4gICAgY29uc3QgY2FjaGVUaW1lb3V0ID0gNjA0ODAwMDAwIC8vIDEgd2Vla1xuICAgIC8vIGNvbnN0IGNhY2hlVGltZW91dCA9IDYwMDAwIC8vIDEgbWluXG5cbiAgICBpZiAobm93LmdldFRpbWUoKSAtIGNhY2hlZERhdGUuZ2V0VGltZSgpIDwgY2FjaGVUaW1lb3V0KSB7XG4gICAgICByZXR1cm4gbHpzdHJpbmcuZGVjb21wcmVzc0Zyb21VVEYxNih0ZXh0KVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25maWcubG9nZ2VyLmxvZyhcIlNraXBwaW5nIGNhY2hlIGZvciBcIiwgdXJsKVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY29uZmlnLmZldGNoZXIodXJsKVxuICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgcmV0dXJuIGVycm9yTXNnKGBDb3VsZCBub3QgZ2V0IERUUyByZXNwb25zZSBmb3IgdGhlIG1vZHVsZSBhdCAke3VybH1gLCByZXNwb25zZSwgY29uZmlnKVxuICB9XG5cbiAgLy8gVE9ETzogaGFuZGxlIGNoZWNraW5nIGZvciBhIHJlc29sdmUgdG8gaW5kZXguZC50cyB3aGVucyBzb21lb25lIGltcG9ydHMgdGhlIGZvbGRlclxuICBsZXQgY29udGVudCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKVxuICBpZiAoIWNvbnRlbnQpIHtcbiAgICByZXR1cm4gZXJyb3JNc2coYENvdWxkIG5vdCBnZXQgdGV4dCBmb3IgRFRTIHJlc3BvbnNlIGF0ICR7dXJsfWAsIHJlc3BvbnNlLCBjb25maWcpXG4gIH1cblxuICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpXG4gIGNvbnN0IGNhY2hlQ29udGVudCA9IGAke25vdy50b0lTT1N0cmluZygpfS09LV4tPS0ke2x6c3RyaW5nLmNvbXByZXNzVG9VVEYxNihjb250ZW50KX1gXG4gIGxvY2FsU3RvcmFnZS5zZXRJdGVtKHVybCwgY2FjaGVDb250ZW50KVxuICByZXR1cm4gY29udGVudFxufVxuXG5jb25zdCBnZXRSZWZlcmVuY2VEZXBlbmRlbmNpZXMgPSBhc3luYyAoc291cmNlQ29kZTogc3RyaW5nLCBtb2Q6IHN0cmluZywgcGF0aDogc3RyaW5nLCBjb25maWc6IEFUQUNvbmZpZykgPT4ge1xuICB2YXIgbWF0Y2hcbiAgaWYgKHNvdXJjZUNvZGUuaW5kZXhPZihcInJlZmVyZW5jZSBwYXRoXCIpID4gMCkge1xuICAgIC8vIGh0dHBzOi8vcmVnZXgxMDEuY29tL3IvRGFPZWd3LzFcbiAgICBjb25zdCByZWZlcmVuY2VQYXRoRXh0cmFjdGlvblBhdHRlcm4gPSAvPHJlZmVyZW5jZSBwYXRoPVwiKC4qKVwiIFxcLz4vZ21cbiAgICB3aGlsZSAoKG1hdGNoID0gcmVmZXJlbmNlUGF0aEV4dHJhY3Rpb25QYXR0ZXJuLmV4ZWMoc291cmNlQ29kZSkpICE9PSBudWxsKSB7XG4gICAgICBjb25zdCByZWxhdGl2ZVBhdGggPSBtYXRjaFsxXVxuICAgICAgaWYgKHJlbGF0aXZlUGF0aCkge1xuICAgICAgICBsZXQgbmV3UGF0aCA9IG1hcFJlbGF0aXZlUGF0aChyZWxhdGl2ZVBhdGgsIHBhdGgpXG4gICAgICAgIGlmIChuZXdQYXRoKSB7XG4gICAgICAgICAgY29uc3QgZHRzUmVmVVJMID0gdW5wa2dVUkwobW9kLCBuZXdQYXRoKVxuXG4gICAgICAgICAgY29uc3QgZHRzUmVmZXJlbmNlUmVzcG9uc2VUZXh0ID0gYXdhaXQgZ2V0Q2FjaGVkRFRTU3RyaW5nKGNvbmZpZywgZHRzUmVmVVJMKVxuICAgICAgICAgIGlmICghZHRzUmVmZXJlbmNlUmVzcG9uc2VUZXh0KSB7XG4gICAgICAgICAgICByZXR1cm4gZXJyb3JNc2coYENvdWxkIG5vdCBnZXQgcm9vdCBkLnRzIGZpbGUgZm9yIHRoZSBtb2R1bGUgJyR7bW9kfScgYXQgJHtwYXRofWAsIHt9LCBjb25maWcpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYXdhaXQgZ2V0RGVwZW5kZW5jaWVzRm9yTW9kdWxlKGR0c1JlZmVyZW5jZVJlc3BvbnNlVGV4dCwgbW9kLCBuZXdQYXRoLCBjb25maWcpXG4gICAgICAgICAgY29uc3QgcmVwcmVzZW50YXRpb25hbFBhdGggPSBgZmlsZTovLy9ub2RlX21vZHVsZXMvJHttb2R9LyR7bmV3UGF0aH1gXG4gICAgICAgICAgY29uZmlnLmFkZExpYnJhcnlUb1J1bnRpbWUoZHRzUmVmZXJlbmNlUmVzcG9uc2VUZXh0LCByZXByZXNlbnRhdGlvbmFsUGF0aClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5pbnRlcmZhY2UgQVRBQ29uZmlnIHtcbiAgc291cmNlQ29kZTogc3RyaW5nXG4gIGFkZExpYnJhcnlUb1J1bnRpbWU6IEFkZExpYlRvUnVudGltZUZ1bmNcbiAgZmV0Y2hlcjogdHlwZW9mIGZldGNoXG4gIGxvZ2dlcjogUGxheWdyb3VuZENvbmZpZ1tcImxvZ2dlclwiXVxufVxuXG4vKipcbiAqIFBzZXVkbyBpbi1icm93c2VyIHR5cGUgYWNxdWlzaXRpb24gdG9vbCwgdXNlcyBhXG4gKi9cbmV4cG9ydCBjb25zdCBkZXRlY3ROZXdJbXBvcnRzVG9BY3F1aXJlVHlwZUZvciA9IGFzeW5jIChcbiAgc291cmNlQ29kZTogc3RyaW5nLFxuICB1c2VyQWRkTGlicmFyeVRvUnVudGltZTogQWRkTGliVG9SdW50aW1lRnVuYyxcbiAgZmV0Y2hlciA9IGZldGNoLFxuICBwbGF5Z3JvdW5kQ29uZmlnOiBQbGF5Z3JvdW5kQ29uZmlnXG4pID0+IHtcbiAgLy8gV3JhcCB0aGUgcnVudGltZSBmdW5jIHdpdGggb3VyIG93biBzaWRlLWVmZmVjdCBmb3IgdmlzaWJpbGl0eVxuICBjb25zdCBhZGRMaWJyYXJ5VG9SdW50aW1lID0gKGNvZGU6IHN0cmluZywgcGF0aDogc3RyaW5nKSA9PiB7XG4gICAgZ2xvYmFsaXNoT2JqLnR5cGVEZWZpbml0aW9uc1twYXRoXSA9IGNvZGVcbiAgICB1c2VyQWRkTGlicmFyeVRvUnVudGltZShjb2RlLCBwYXRoKVxuICB9XG5cbiAgLy8gQmFzaWNhbGx5IHN0YXJ0IHRoZSByZWN1cnNpb24gd2l0aCBhbiB1bmRlZmluZWQgbW9kdWxlXG4gIGNvbnN0IGNvbmZpZzogQVRBQ29uZmlnID0geyBzb3VyY2VDb2RlLCBhZGRMaWJyYXJ5VG9SdW50aW1lLCBmZXRjaGVyLCBsb2dnZXI6IHBsYXlncm91bmRDb25maWcubG9nZ2VyIH1cbiAgY29uc3QgcmVzdWx0cyA9IGdldERlcGVuZGVuY2llc0Zvck1vZHVsZShzb3VyY2VDb2RlLCB1bmRlZmluZWQsIFwicGxheWdyb3VuZC50c1wiLCBjb25maWcpXG4gIHJldHVybiByZXN1bHRzXG59XG5cbi8qKlxuICogTG9va3MgYXQgYSBKUy9EVFMgZmlsZSBhbmQgcmVjdXJzZXMgdGhyb3VnaCBhbGwgdGhlIGRlcGVuZGVuY2llcy5cbiAqIEl0IGF2b2lkc1xuICovXG5jb25zdCBnZXREZXBlbmRlbmNpZXNGb3JNb2R1bGUgPSAoXG4gIHNvdXJjZUNvZGU6IHN0cmluZyxcbiAgbW9kdWxlTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICBwYXRoOiBzdHJpbmcsXG4gIGNvbmZpZzogQVRBQ29uZmlnXG4pID0+IHtcbiAgLy8gR2V0IGFsbCB0aGUgaW1wb3J0L3JlcXVpcmVzIGZvciB0aGUgZmlsZVxuICBjb25zdCBmaWx0ZXJlZE1vZHVsZXNUb0xvb2tBdCA9IHBhcnNlRmlsZUZvck1vZHVsZVJlZmVyZW5jZXMoc291cmNlQ29kZSlcbiAgZmlsdGVyZWRNb2R1bGVzVG9Mb29rQXQuZm9yRWFjaChhc3luYyBuYW1lID0+IHtcbiAgICAvLyBTdXBwb3J0IGdyYWJiaW5nIHRoZSBoYXJkLWNvZGVkIG5vZGUgbW9kdWxlcyBpZiBuZWVkZWRcbiAgICBjb25zdCBtb2R1bGVUb0Rvd25sb2FkID0gbWFwTW9kdWxlTmFtZVRvTW9kdWxlKG5hbWUpXG5cbiAgICBpZiAoIW1vZHVsZU5hbWUgJiYgbW9kdWxlVG9Eb3dubG9hZC5zdGFydHNXaXRoKFwiLlwiKSkge1xuICAgICAgcmV0dXJuIGNvbmZpZy5sb2dnZXIubG9nKFwiW0FUQV0gQ2FuJ3QgcmVzb2x2ZSByZWxhdGl2ZSBkZXBlbmRlbmNpZXMgZnJvbSB0aGUgcGxheWdyb3VuZCByb290XCIpXG4gICAgfVxuXG4gICAgY29uc3QgbW9kdWxlSUQgPSBjb252ZXJ0VG9Nb2R1bGVSZWZlcmVuY2VJRChtb2R1bGVOYW1lISwgbW9kdWxlVG9Eb3dubG9hZCwgbW9kdWxlTmFtZSEpXG4gICAgaWYgKGFjcXVpcmVkVHlwZURlZnNbbW9kdWxlSURdIHx8IGFjcXVpcmVkVHlwZURlZnNbbW9kdWxlSURdID09PSBudWxsKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25maWcubG9nZ2VyLmxvZyhgW0FUQV0gTG9va2luZyBhdCAke21vZHVsZVRvRG93bmxvYWR9YClcblxuICAgIGNvbnN0IG1vZElzU2NvcGVkUGFja2FnZU9ubHkgPSBtb2R1bGVUb0Rvd25sb2FkLmluZGV4T2YoXCJAXCIpID09PSAwICYmIG1vZHVsZVRvRG93bmxvYWQuc3BsaXQoXCIvXCIpLmxlbmd0aCA9PT0gMlxuICAgIGNvbnN0IG1vZElzUGFja2FnZU9ubHkgPSBtb2R1bGVUb0Rvd25sb2FkLmluZGV4T2YoXCJAXCIpID09PSAtMSAmJiBtb2R1bGVUb0Rvd25sb2FkLnNwbGl0KFwiL1wiKS5sZW5ndGggPT09IDFcbiAgICBjb25zdCBpc1BhY2thZ2VSb290SW1wb3J0ID0gbW9kSXNQYWNrYWdlT25seSB8fCBtb2RJc1Njb3BlZFBhY2thZ2VPbmx5XG4gICAgY29uc3QgaXNEZW5vTW9kdWxlID0gbW9kdWxlVG9Eb3dubG9hZC5pbmRleE9mKFwiaHR0cHM6Ly9cIikgPT09IDBcblxuICAgIGlmIChpc1BhY2thZ2VSb290SW1wb3J0KSB7XG4gICAgICAvLyBTbyBpdCBkb2Vzbid0IHJ1biB0d2ljZSBmb3IgYSBwYWNrYWdlXG4gICAgICBhY3F1aXJlZFR5cGVEZWZzW21vZHVsZUlEXSA9IG51bGxcblxuICAgICAgLy8gRS5nLiBpbXBvcnQgZGFuZ2VyIGZyb20gXCJkYW5nZXJcIlxuICAgICAgY29uc3QgcGFja2FnZURlZiA9IGF3YWl0IGdldE1vZHVsZUFuZFJvb3REZWZUeXBlUGF0aChtb2R1bGVUb0Rvd25sb2FkLCBjb25maWcpXG5cbiAgICAgIGlmIChwYWNrYWdlRGVmKSB7XG4gICAgICAgIGFjcXVpcmVkVHlwZURlZnNbbW9kdWxlSURdID0gcGFja2FnZURlZi5wYWNrYWdlSlNPTlxuICAgICAgICBhd2FpdCBhZGRNb2R1bGVUb1J1bnRpbWUocGFja2FnZURlZi5tb2QsIHBhY2thZ2VEZWYucGF0aCwgY29uZmlnKVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNEZW5vTW9kdWxlKSB7XG4gICAgICAvLyBFLmcuIGltcG9ydCB7IHNlcnZlIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEB2MC4xMi9odHRwL3NlcnZlci50c1wiO1xuICAgICAgYXdhaXQgYWRkTW9kdWxlVG9SdW50aW1lKG1vZHVsZVRvRG93bmxvYWQsIG1vZHVsZVRvRG93bmxvYWQsIGNvbmZpZylcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRS5nLiBpbXBvcnQge0NvbXBvbmVudH0gZnJvbSBcIi4vTXlUaGluZ1wiXG4gICAgICBpZiAoIW1vZHVsZVRvRG93bmxvYWQgfHwgIXBhdGgpIHRocm93IGBObyBvdXRlciBtb2R1bGUgb3IgcGF0aCBmb3IgYSByZWxhdGl2ZSBpbXBvcnQ6ICR7bW9kdWxlVG9Eb3dubG9hZH1gXG5cbiAgICAgIGNvbnN0IGFic29sdXRlUGF0aEZvck1vZHVsZSA9IG1hcFJlbGF0aXZlUGF0aChtb2R1bGVUb0Rvd25sb2FkLCBwYXRoKVxuXG4gICAgICAvLyBTbyBpdCBkb2Vzbid0IHJ1biB0d2ljZSBmb3IgYSBwYWNrYWdlXG4gICAgICBhY3F1aXJlZFR5cGVEZWZzW21vZHVsZUlEXSA9IG51bGxcblxuICAgICAgY29uc3QgcmVzb2x2ZWRGaWxlcGF0aCA9IGFic29sdXRlUGF0aEZvck1vZHVsZS5lbmRzV2l0aChcIi50c1wiKVxuICAgICAgICA/IGFic29sdXRlUGF0aEZvck1vZHVsZVxuICAgICAgICA6IGFic29sdXRlUGF0aEZvck1vZHVsZSArIFwiLmQudHNcIlxuXG4gICAgICBhd2FpdCBhZGRNb2R1bGVUb1J1bnRpbWUobW9kdWxlTmFtZSEsIHJlc29sdmVkRmlsZXBhdGgsIGNvbmZpZylcbiAgICB9XG4gIH0pXG5cbiAgLy8gQWxzbyBzdXBwb3J0IHRoZVxuICBnZXRSZWZlcmVuY2VEZXBlbmRlbmNpZXMoc291cmNlQ29kZSwgbW9kdWxlTmFtZSEsIHBhdGghLCBjb25maWcpXG59XG4iXX0=