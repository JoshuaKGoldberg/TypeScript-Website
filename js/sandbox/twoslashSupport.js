define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.twoslashCompletions = exports.parsePrimitive = exports.extractTwoSlashComplierOptions = void 0;
    const booleanConfigRegexp = /^\/\/\s?@(\w+)$/;
    // https://regex101.com/r/8B2Wwh/1
    const valuedConfigRegexp = /^\/\/\s?@(\w+):\s?(.+)$/;
    /**
     * This is a port of the twoslash bit which grabs compiler options
     * from the source code
     */
    const extractTwoSlashComplierOptions = (ts) => {
        let optMap = new Map();
        if (!("optionDeclarations" in ts)) {
            console.error("Could not get compiler options from ts.optionDeclarations - skipping twoslash support.");
        }
        else {
            // @ts-ignore - optionDeclarations is not public API
            for (const opt of ts.optionDeclarations) {
                optMap.set(opt.name.toLowerCase(), opt);
            }
        }
        return (code) => {
            const codeLines = code.split("\n");
            const options = {};
            codeLines.forEach(line => {
                let match;
                if ((match = booleanConfigRegexp.exec(line))) {
                    if (optMap.has(match[1].toLowerCase())) {
                        options[match[1]] = true;
                        setOption(match[1], "true", options, optMap);
                    }
                }
                else if ((match = valuedConfigRegexp.exec(line))) {
                    if (optMap.has(match[1].toLowerCase())) {
                        setOption(match[1], match[2], options, optMap);
                    }
                }
            });
            return options;
        };
    };
    exports.extractTwoSlashComplierOptions = extractTwoSlashComplierOptions;
    function setOption(name, value, opts, optMap) {
        const opt = optMap.get(name.toLowerCase());
        if (!opt)
            return;
        switch (opt.type) {
            case "number":
            case "string":
            case "boolean":
                opts[opt.name] = parsePrimitive(value, opt.type);
                break;
            case "list":
                opts[opt.name] = value.split(",").map(v => parsePrimitive(v, opt.element.type));
                break;
            default:
                opts[opt.name] = opt.type.get(value.toLowerCase());
                if (opts[opt.name] === undefined) {
                    const keys = Array.from(opt.type.keys());
                    console.log(`Invalid value ${value} for ${opt.name}. Allowed values: ${keys.join(",")}`);
                }
        }
    }
    function parsePrimitive(value, type) {
        switch (type) {
            case "number":
                return +value;
            case "string":
                return value;
            case "boolean":
                return value.toLowerCase() === "true" || value.length === 0;
        }
        console.log(`Unknown primitive type ${type} with - ${value}`);
    }
    exports.parsePrimitive = parsePrimitive;
    // Function to generate autocompletion results
    const twoslashCompletions = (ts, monaco) => (model, position, _token) => {
        const result = [];
        // Split everything the user has typed on the current line up at each space, and only look at the last word
        const thisLine = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: 0,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
        });
        // Not a comment
        if (!thisLine.startsWith("//")) {
            return { suggestions: [] };
        }
        const words = thisLine.replace("\t", "").split(" ");
        // Not the right amount of
        if (words.length !== 2) {
            return { suggestions: [] };
        }
        const word = words[1];
        if (word.startsWith("-")) {
            return {
                suggestions: [
                    {
                        label: "---cut---",
                        kind: 14,
                        detail: "Twoslash split output",
                        insertText: "---cut---".replace(word, ""),
                    },
                ],
            };
        }
        // Not a @ at the first word
        if (!word.startsWith("@")) {
            return { suggestions: [] };
        }
        const knowns = [
            "noErrors",
            "errors",
            "showEmit",
            "showEmittedFile",
            "noStaticSemanticInfo",
            "emit",
            "noErrorValidation",
            "filename",
        ];
        // @ts-ignore - ts.optionDeclarations is private
        const optsNames = ts.optionDeclarations.map(o => o.name);
        knowns.concat(optsNames).forEach(name => {
            if (name.startsWith(word.slice(1))) {
                // somehow adding the range seems to not give autocomplete results?
                result.push({
                    label: name,
                    kind: 14,
                    detail: "Twoslash comment",
                    insertText: name,
                });
            }
        });
        return {
            suggestions: result,
        };
    };
    exports.twoslashCompletions = twoslashCompletions;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHdvc2xhc2hTdXBwb3J0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc2FuZGJveC9zcmMvdHdvc2xhc2hTdXBwb3J0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7SUFBQSxNQUFNLG1CQUFtQixHQUFHLGlCQUFpQixDQUFBO0lBRTdDLGtDQUFrQztJQUNsQyxNQUFNLGtCQUFrQixHQUFHLHlCQUF5QixDQUFBO0lBS3BEOzs7T0FHRztJQUVJLE1BQU0sOEJBQThCLEdBQUcsQ0FBQyxFQUFNLEVBQUUsRUFBRTtRQUN2RCxJQUFJLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFBO1FBRW5DLElBQUksQ0FBQyxDQUFDLG9CQUFvQixJQUFJLEVBQUUsQ0FBQyxFQUFFO1lBQ2pDLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0ZBQXdGLENBQUMsQ0FBQTtTQUN4RzthQUFNO1lBQ0wsb0RBQW9EO1lBQ3BELEtBQUssTUFBTSxHQUFHLElBQUksRUFBRSxDQUFDLGtCQUFrQixFQUFFO2dCQUN2QyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7YUFDeEM7U0FDRjtRQUVELE9BQU8sQ0FBQyxJQUFZLEVBQUUsRUFBRTtZQUN0QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2xDLE1BQU0sT0FBTyxHQUFHLEVBQVMsQ0FBQTtZQUV6QixTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN2QixJQUFJLEtBQUssQ0FBQTtnQkFDVCxJQUFJLENBQUMsS0FBSyxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO29CQUM1QyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUU7d0JBQ3RD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RUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLENBQUE7U0FDM0I7UUFFRCxNQUFNLE1BQU0sR0FBRztZQUNiLFVBQVU7WUFDVixRQUFRO1lBQ1IsVUFBVTtZQUNWLGlCQUFpQjtZQUNqQixzQkFBc0I7WUFDdEIsTUFBTTtZQUNOLG1CQUFtQjtZQUNuQixVQUFVO1NBQ1gsQ0FBQTtRQUNELGdEQUFnRDtRQUNoRCxNQUFNLFNBQVMsR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3RDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2xDLG1FQUFtRTtnQkFDbkUsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDVixLQUFLLEVBQUUsSUFBSTtvQkFDWCxJQUFJLEVBQUUsRUFBRTtvQkFDUixNQUFNLEVBQUUsa0JBQWtCO29CQUMxQixVQUFVLEVBQUUsSUFBSTtpQkFDVixDQUFDLENBQUE7YUFDVjtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTztZQUNMLFdBQVcsRUFBRSxNQUFNO1NBQ3BCLENBQUE7SUFDSCxDQUFDLENBQUE7SUF6RVksUUFBQSxtQkFBbUIsdUJBeUUvQiIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGJvb2xlYW5Db25maWdSZWdleHAgPSAvXlxcL1xcL1xccz9AKFxcdyspJC9cblxuLy8gaHR0cHM6Ly9yZWdleDEwMS5jb20vci84QjJXd2gvMVxuY29uc3QgdmFsdWVkQ29uZmlnUmVnZXhwID0gL15cXC9cXC9cXHM/QChcXHcrKTpcXHM/KC4rKSQvXG5cbnR5cGUgVFMgPSB0eXBlb2YgaW1wb3J0KFwidHlwZXNjcmlwdFwiKVxudHlwZSBDb21waWxlck9wdGlvbnMgPSBpbXBvcnQoXCJ0eXBlc2NyaXB0XCIpLkNvbXBpbGVyT3B0aW9uc1xuXG4vKipcbiAqIFRoaXMgaXMgYSBwb3J0IG9mIHRoZSB0d29zbGFzaCBiaXQgd2hpY2ggZ3JhYnMgY29tcGlsZXIgb3B0aW9uc1xuICogZnJvbSB0aGUgc291cmNlIGNvZGVcbiAqL1xuXG5leHBvcnQgY29uc3QgZXh0cmFjdFR3b1NsYXNoQ29tcGxpZXJPcHRpb25zID0gKHRzOiBUUykgPT4ge1xuICBsZXQgb3B0TWFwID0gbmV3IE1hcDxzdHJpbmcsIGFueT4oKVxuXG4gIGlmICghKFwib3B0aW9uRGVjbGFyYXRpb25zXCIgaW4gdHMpKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkNvdWxkIG5vdCBnZXQgY29tcGlsZXIgb3B0aW9ucyBmcm9tIHRzLm9wdGlvbkRlY2xhcmF0aW9ucyAtIHNraXBwaW5nIHR3b3NsYXNoIHN1cHBvcnQuXCIpXG4gIH0gZWxzZSB7XG4gICAgLy8gQHRzLWlnbm9yZSAtIG9wdGlvbkRlY2xhcmF0aW9ucyBpcyBub3QgcHVibGljIEFQSVxuICAgIGZvciAoY29uc3Qgb3B0IG9mIHRzLm9wdGlvbkRlY2xhcmF0aW9ucykge1xuICAgICAgb3B0TWFwLnNldChvcHQubmFtZS50b0xvd2VyQ2FzZSgpLCBvcHQpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIChjb2RlOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBjb2RlTGluZXMgPSBjb2RlLnNwbGl0KFwiXFxuXCIpXG4gICAgY29uc3Qgb3B0aW9ucyA9IHt9IGFzIGFueVxuXG4gICAgY29kZUxpbmVzLmZvckVhY2gobGluZSA9PiB7XG4gICAgICBsZXQgbWF0Y2hcbiAgICAgIGlmICgobWF0Y2ggPSBib29sZWFuQ29uZmlnUmVnZXhwLmV4ZWMobGluZSkpKSB7XG4gICAgICAgIGlmIChvcHRNYXAuaGFzKG1hdGNoWzFdLnRvTG93ZXJDYXNlKCkpKSB7XG4gICAgICAgICAgb3B0aW9uc1ttYXRjaFsxXV0gPSB0cnVlXG4gICAgICAgICAgc2V0T3B0aW9uKG1hdGNoWzFdLCBcInRydWVcIiwgb3B0aW9ucywgb3B0TWFwKVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKChtYXRjaCA9IHZhbHVlZENvbmZpZ1JlZ2V4cC5leGVjKGxpbmUpKSkge1xuICAgICAgICBpZiAob3B0TWFwLmhhcyhtYXRjaFsxXS50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICAgIHNldE9wdGlvbihtYXRjaFsxXSwgbWF0Y2hbMl0sIG9wdGlvbnMsIG9wdE1hcClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIG9wdGlvbnNcbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRPcHRpb24obmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nLCBvcHRzOiBDb21waWxlck9wdGlvbnMsIG9wdE1hcDogTWFwPHN0cmluZywgYW55Pikge1xuICBjb25zdCBvcHQgPSBvcHRNYXAuZ2V0KG5hbWUudG9Mb3dlckNhc2UoKSlcbiAgaWYgKCFvcHQpIHJldHVyblxuICBzd2l0Y2ggKG9wdC50eXBlKSB7XG4gICAgY2FzZSBcIm51bWJlclwiOlxuICAgIGNhc2UgXCJzdHJpbmdcIjpcbiAgICBjYXNlIFwiYm9vbGVhblwiOlxuICAgICAgb3B0c1tvcHQubmFtZV0gPSBwYXJzZVByaW1pdGl2ZSh2YWx1ZSwgb3B0LnR5cGUpXG4gICAgICBicmVha1xuXG4gICAgY2FzZSBcImxpc3RcIjpcbiAgICAgIG9wdHNbb3B0Lm5hbWVdID0gdmFsdWUuc3BsaXQoXCIsXCIpLm1hcCh2ID0+IHBhcnNlUHJpbWl0aXZlKHYsIG9wdC5lbGVtZW50IS50eXBlIGFzIHN0cmluZykpXG4gICAgICBicmVha1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIG9wdHNbb3B0Lm5hbWVdID0gb3B0LnR5cGUuZ2V0KHZhbHVlLnRvTG93ZXJDYXNlKCkpXG5cbiAgICAgIGlmIChvcHRzW29wdC5uYW1lXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnN0IGtleXMgPSBBcnJheS5mcm9tKG9wdC50eXBlLmtleXMoKSBhcyBhbnkpXG4gICAgICAgIGNvbnNvbGUubG9nKGBJbnZhbGlkIHZhbHVlICR7dmFsdWV9IGZvciAke29wdC5uYW1lfS4gQWxsb3dlZCB2YWx1ZXM6ICR7a2V5cy5qb2luKFwiLFwiKX1gKVxuICAgICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVByaW1pdGl2ZSh2YWx1ZTogc3RyaW5nLCB0eXBlOiBzdHJpbmcpOiBhbnkge1xuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlIFwibnVtYmVyXCI6XG4gICAgICByZXR1cm4gK3ZhbHVlXG4gICAgY2FzZSBcInN0cmluZ1wiOlxuICAgICAgcmV0dXJuIHZhbHVlXG4gICAgY2FzZSBcImJvb2xlYW5cIjpcbiAgICAgIHJldHVybiB2YWx1ZS50b0xvd2VyQ2FzZSgpID09PSBcInRydWVcIiB8fCB2YWx1ZS5sZW5ndGggPT09IDBcbiAgfVxuICBjb25zb2xlLmxvZyhgVW5rbm93biBwcmltaXRpdmUgdHlwZSAke3R5cGV9IHdpdGggLSAke3ZhbHVlfWApXG59XG5cbi8vIEZ1bmN0aW9uIHRvIGdlbmVyYXRlIGF1dG9jb21wbGV0aW9uIHJlc3VsdHNcbmV4cG9ydCBjb25zdCB0d29zbGFzaENvbXBsZXRpb25zID0gKHRzOiBUUywgbW9uYWNvOiB0eXBlb2YgaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKSkgPT4gKFxuICBtb2RlbDogaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKS5lZGl0b3IuSVRleHRNb2RlbCxcbiAgcG9zaXRpb246IGltcG9ydChcIm1vbmFjby1lZGl0b3JcIikuUG9zaXRpb24sXG4gIF90b2tlbjogYW55XG4pOiBpbXBvcnQoXCJtb25hY28tZWRpdG9yXCIpLmxhbmd1YWdlcy5Db21wbGV0aW9uTGlzdCA9PiB7XG4gIGNvbnN0IHJlc3VsdDogaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKS5sYW5ndWFnZXMuQ29tcGxldGlvbkl0ZW1bXSA9IFtdXG5cbiAgLy8gU3BsaXQgZXZlcnl0aGluZyB0aGUgdXNlciBoYXMgdHlwZWQgb24gdGhlIGN1cnJlbnQgbGluZSB1cCBhdCBlYWNoIHNwYWNlLCBhbmQgb25seSBsb29rIGF0IHRoZSBsYXN0IHdvcmRcbiAgY29uc3QgdGhpc0xpbmUgPSBtb2RlbC5nZXRWYWx1ZUluUmFuZ2Uoe1xuICAgIHN0YXJ0TGluZU51bWJlcjogcG9zaXRpb24ubGluZU51bWJlcixcbiAgICBzdGFydENvbHVtbjogMCxcbiAgICBlbmRMaW5lTnVtYmVyOiBwb3NpdGlvbi5saW5lTnVtYmVyLFxuICAgIGVuZENvbHVtbjogcG9zaXRpb24uY29sdW1uLFxuICB9KVxuXG4gIC8vIE5vdCBhIGNvbW1lbnRcbiAgaWYgKCF0aGlzTGluZS5zdGFydHNXaXRoKFwiLy9cIikpIHtcbiAgICByZXR1cm4geyBzdWdnZXN0aW9uczogW10gfVxuICB9XG5cbiAgY29uc3Qgd29yZHMgPSB0aGlzTGluZS5yZXBsYWNlKFwiXFx0XCIsIFwiXCIpLnNwbGl0KFwiIFwiKVxuXG4gIC8vIE5vdCB0aGUgcmlnaHQgYW1vdW50IG9mXG4gIGlmICh3b3Jkcy5sZW5ndGggIT09IDIpIHtcbiAgICByZXR1cm4geyBzdWdnZXN0aW9uczogW10gfVxuICB9XG5cbiAgY29uc3Qgd29yZCA9IHdvcmRzWzFdXG4gIGlmICh3b3JkLnN0YXJ0c1dpdGgoXCItXCIpKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Z2dlc3Rpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogXCItLS1jdXQtLS1cIixcbiAgICAgICAgICBraW5kOiAxNCxcbiAgICAgICAgICBkZXRhaWw6IFwiVHdvc2xhc2ggc3BsaXQgb3V0cHV0XCIsXG4gICAgICAgICAgaW5zZXJ0VGV4dDogXCItLS1jdXQtLS1cIi5yZXBsYWNlKHdvcmQsIFwiXCIpLFxuICAgICAgICB9IGFzIGFueSxcbiAgICAgIF0sXG4gICAgfVxuICB9XG5cbiAgLy8gTm90IGEgQCBhdCB0aGUgZmlyc3Qgd29yZFxuICBpZiAoIXdvcmQuc3RhcnRzV2l0aChcIkBcIikpIHtcbiAgICByZXR1cm4geyBzdWdnZXN0aW9uczogW10gfVxuICB9XG5cbiAgY29uc3Qga25vd25zID0gW1xuICAgIFwibm9FcnJvcnNcIixcbiAgICBcImVycm9yc1wiLFxuICAgIFwic2hvd0VtaXRcIixcbiAgICBcInNob3dFbWl0dGVkRmlsZVwiLFxuICAgIFwibm9TdGF0aWNTZW1hbnRpY0luZm9cIixcbiAgICBcImVtaXRcIixcbiAgICBcIm5vRXJyb3JWYWxpZGF0aW9uXCIsXG4gICAgXCJmaWxlbmFtZVwiLFxuICBdXG4gIC8vIEB0cy1pZ25vcmUgLSB0cy5vcHRpb25EZWNsYXJhdGlvbnMgaXMgcHJpdmF0ZVxuICBjb25zdCBvcHRzTmFtZXMgPSB0cy5vcHRpb25EZWNsYXJhdGlvbnMubWFwKG8gPT4gby5uYW1lKVxuICBrbm93bnMuY29uY2F0KG9wdHNOYW1lcykuZm9yRWFjaChuYW1lID0+IHtcbiAgICBpZiAobmFtZS5zdGFydHNXaXRoKHdvcmQuc2xpY2UoMSkpKSB7XG4gICAgICAvLyBzb21laG93IGFkZGluZyB0aGUgcmFuZ2Ugc2VlbXMgdG8gbm90IGdpdmUgYXV0b2NvbXBsZXRlIHJlc3VsdHM/XG4gICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgIGxhYmVsOiBuYW1lLFxuICAgICAgICBraW5kOiAxNCxcbiAgICAgICAgZGV0YWlsOiBcIlR3b3NsYXNoIGNvbW1lbnRcIixcbiAgICAgICAgaW5zZXJ0VGV4dDogbmFtZSxcbiAgICAgIH0gYXMgYW55KVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4ge1xuICAgIHN1Z2dlc3Rpb25zOiByZXN1bHQsXG4gIH1cbn1cbiJdfQ==