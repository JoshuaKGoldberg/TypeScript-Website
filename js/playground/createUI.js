define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createUI = void 0;
    const createUI = () => {
        const flashInfo = (message) => {
            var _a;
            let flashBG = document.getElementById("flash-bg");
            if (flashBG) {
                (_a = flashBG.parentElement) === null || _a === void 0 ? void 0 : _a.removeChild(flashBG);
            }
            flashBG = document.createElement("div");
            flashBG.id = "flash-bg";
            const p = document.createElement("p");
            p.textContent = message;
            flashBG.appendChild(p);
            document.body.appendChild(flashBG);
            setTimeout(() => {
                var _a;
                (_a = flashBG === null || flashBG === void 0 ? void 0 : flashBG.parentElement) === null || _a === void 0 ? void 0 : _a.removeChild(flashBG);
            }, 1000);
        };
        const createModalOverlay = (postFocalElement, classList) => {
            document.querySelectorAll(".navbar-sub li.open").forEach(i => i.classList.remove("open"));
            const existingPopover = document.getElementById("popover-modal");
            if (existingPopover)
                existingPopover.parentElement.removeChild(existingPopover);
            const modalBG = document.createElement("div");
            modalBG.id = "popover-background";
            document.body.appendChild(modalBG);
            const modal = document.createElement("div");
            modal.id = "popover-modal";
            if (classList)
                modal.className = classList;
            const closeButton = document.createElement("button");
            closeButton.innerText = "Close";
            closeButton.classList.add("close");
            closeButton.tabIndex = 1;
            modal.appendChild(closeButton);
            const oldOnkeyDown = document.onkeydown;
            const close = () => {
                modalBG.parentNode.removeChild(modalBG);
                modal.parentNode.removeChild(modal);
                // @ts-ignore
                document.onkeydown = oldOnkeyDown;
                postFocalElement.focus();
            };
            modalBG.onclick = close;
            closeButton.onclick = close;
            // Support hiding the modal via escape
            document.onkeydown = whenEscape(close);
            document.body.appendChild(modal);
            return modal;
        };
        /** For showing a lot of code */
        const showModal = (code, postFocalElement, subtitle, links, event) => {
            const modal = createModalOverlay(postFocalElement);
            // I've not been able to get this to work in a way which
            // works with every screenreader and browser combination, so
            // instead I'm dropping the feature.
            const isNotMouse = false; //  event && event.screenX === 0 && event.screenY === 0
            if (subtitle) {
                const titleElement = document.createElement("h3");
                titleElement.textContent = subtitle;
                setTimeout(() => {
                    titleElement.setAttribute("role", "alert");
                }, 100);
                modal.appendChild(titleElement);
            }
            const textarea = document.createElement("textarea");
            textarea.readOnly = true;
            textarea.wrap = "off";
            textarea.style.marginBottom = "20px";
            modal.appendChild(textarea);
            textarea.textContent = code;
            textarea.rows = 60;
            const buttonContainer = document.createElement("div");
            const copyButton = document.createElement("button");
            copyButton.innerText = "Copy";
            buttonContainer.appendChild(copyButton);
            const selectAllButton = document.createElement("button");
            selectAllButton.innerText = "Select All";
            buttonContainer.appendChild(selectAllButton);
            modal.appendChild(buttonContainer);
            const close = modal.querySelector(".close");
            close.addEventListener("keydown", e => {
                if (e.key === "Tab") {
                    ;
                    modal.querySelector("textarea").focus();
                    e.preventDefault();
                }
            });
            if (links) {
                Object.keys(links).forEach(name => {
                    const href = links[name];
                    const extraButton = document.createElement("button");
                    extraButton.innerText = name;
                    extraButton.onclick = () => (document.location = href);
                    buttonContainer.appendChild(extraButton);
                });
            }
            const selectAll = () => {
                textarea.select();
            };
            const shouldAutoSelect = !isNotMouse;
            if (shouldAutoSelect) {
                selectAll();
            }
            else {
                textarea.focus();
            }
            const buttons = modal.querySelectorAll("button");
            const lastButton = buttons.item(buttons.length - 1);
            lastButton.addEventListener("keydown", e => {
                if (e.key === "Tab") {
                    ;
                    document.querySelector(".close").focus();
                    e.preventDefault();
                }
            });
            selectAllButton.onclick = selectAll;
            copyButton.onclick = () => {
                navigator.clipboard.writeText(code);
            };
        };
        return {
            createModalOverlay,
            showModal,
            flashInfo,
        };
    };
    exports.createUI = createUI;
    /**
     * Runs the closure when escape is tapped
     * @param func closure to run on escape being pressed
     */
    const whenEscape = (func) => (event) => {
        const evt = event || window.event;
        let isEscape = false;
        if ("key" in evt) {
            isEscape = evt.key === "Escape" || evt.key === "Esc";
        }
        else {
            // @ts-ignore - this used to be the case
            isEscape = evt.keyCode === 27;
        }
        if (isEscape) {
            func();
        }
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlVUkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wbGF5Z3JvdW5kL3NyYy9jcmVhdGVVSS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0lBZU8sTUFBTSxRQUFRLEdBQUcsR0FBTyxFQUFFO1FBQy9CLE1BQU0sU0FBUyxHQUFHLENBQUMsT0FBZSxFQUFFLEVBQUU7O1lBQ3BDLElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDakQsSUFBSSxPQUFPLEVBQUU7Z0JBQ1gsTUFBQSxPQUFPLENBQUMsYUFBYSwwQ0FBRSxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUE7YUFDNUM7WUFFRCxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN2QyxPQUFPLENBQUMsRUFBRSxHQUFHLFVBQVUsQ0FBQTtZQUV2QixNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3JDLENBQUMsQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFBO1lBQ3ZCLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdEIsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUE7WUFFbEMsVUFBVSxDQUFDLEdBQUcsRUFBRTs7Z0JBQ2QsTUFBQSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsYUFBYSwwQ0FBRSxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDOUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ1YsQ0FBQyxDQUFBO1FBRUQsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLGdCQUE2QixFQUFFLFNBQWtCLEVBQUUsRUFBRTtZQUMvRSxRQUFRLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENB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TyxHQUFHLEdBQUcsRUFBRTtnQkFDeEIsU0FBUyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDckMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFBO1FBRUQsT0FBTztZQUNMLGtCQUFrQjtZQUNsQixTQUFTO1lBQ1QsU0FBUztTQUNWLENBQUE7SUFDSCxDQUFDLENBQUE7SUF6SlksUUFBQSxRQUFRLFlBeUpwQjtJQUVEOzs7T0FHRztJQUNILE1BQU0sVUFBVSxHQUFHLENBQUMsSUFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFvQixFQUFFLEVBQUU7UUFDaEUsTUFBTSxHQUFHLEdBQUcsS0FBSyxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUE7UUFDakMsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFBO1FBQ3BCLElBQUksS0FBSyxJQUFJLEdBQUcsRUFBRTtZQUNoQixRQUFRLEdBQUcsR0FBRyxDQUFDLEdBQUcsS0FBSyxRQUFRLElBQUksR0FBRyxDQUFDLEdBQUcsS0FBSyxLQUFLLENBQUE7U0FDckQ7YUFBTTtZQUNMLHdDQUF3QztZQUN4QyxRQUFRLEdBQUcsR0FBRyxDQUFDLE9BQU8sS0FBSyxFQUFFLENBQUE7U0FDOUI7UUFDRCxJQUFJLFFBQVEsRUFBRTtZQUNaLElBQUksRUFBRSxDQUFBO1NBQ1A7SUFDSCxDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgaW50ZXJmYWNlIFVJIHtcbiAgLyoqIFNob3cgYSB0ZXh0IG1vZGFsLCB3aXRoIHNvbWUgYnV0dG9ucyAqL1xuICBzaG93TW9kYWw6IChcbiAgICBtZXNzYWdlOiBzdHJpbmcsXG4gICAgcG9zdEZvY2FsRWxlbWVudDogSFRNTEVsZW1lbnQsXG4gICAgc3VidGl0bGU/OiBzdHJpbmcsXG4gICAgYnV0dG9ucz86IHsgW3RleHQ6IHN0cmluZ106IHN0cmluZyB9LFxuICAgIGV2ZW50PzogUmVhY3QuTW91c2VFdmVudFxuICApID0+IHZvaWRcbiAgLyoqIEEgcXVpY2sgZmxhc2ggb2Ygc29tZSB0ZXh0ICovXG4gIGZsYXNoSW5mbzogKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZFxuICAvKiogQ3JlYXRlcyBhIG1vZGFsIGNvbnRhaW5lciB3aGljaCB5b3UgY2FuIHB1dCB5b3VyIG93biBET00gZWxlbWVudHMgaW5zaWRlICovXG4gIGNyZWF0ZU1vZGFsT3ZlcmxheTogKHBvc3RGb2NhbEVsZW1lbnQ6IEhUTUxFbGVtZW50LCBjbGFzc2VzPzogc3RyaW5nKSA9PiBIVE1MRGl2RWxlbWVudFxufVxuXG5leHBvcnQgY29uc3QgY3JlYXRlVUkgPSAoKTogVUkgPT4ge1xuICBjb25zdCBmbGFzaEluZm8gPSAobWVzc2FnZTogc3RyaW5nKSA9PiB7XG4gICAgbGV0IGZsYXNoQkcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImZsYXNoLWJnXCIpXG4gICAgaWYgKGZsYXNoQkcpIHtcbiAgICAgIGZsYXNoQkcucGFyZW50RWxlbWVudD8ucmVtb3ZlQ2hpbGQoZmxhc2hCRylcbiAgICB9XG5cbiAgICBmbGFzaEJHID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgIGZsYXNoQkcuaWQgPSBcImZsYXNoLWJnXCJcblxuICAgIGNvbnN0IHAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwicFwiKVxuICAgIHAudGV4dENvbnRlbnQgPSBtZXNzYWdlXG4gICAgZmxhc2hCRy5hcHBlbmRDaGlsZChwKVxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZmxhc2hCRylcblxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgZmxhc2hCRz8ucGFyZW50RWxlbWVudD8ucmVtb3ZlQ2hpbGQoZmxhc2hCRylcbiAgICB9LCAxMDAwKVxuICB9XG5cbiAgY29uc3QgY3JlYXRlTW9kYWxPdmVybGF5ID0gKHBvc3RGb2NhbEVsZW1lbnQ6IEhUTUxFbGVtZW50LCBjbGFzc0xpc3Q/OiBzdHJpbmcpID0+IHtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLm5hdmJhci1zdWIgbGkub3BlblwiKS5mb3JFYWNoKGkgPT4gaS5jbGFzc0xpc3QucmVtb3ZlKFwib3BlblwiKSlcblxuICAgIGNvbnN0IGV4aXN0aW5nUG9wb3ZlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicG9wb3Zlci1tb2RhbFwiKVxuICAgIGlmIChleGlzdGluZ1BvcG92ZXIpIGV4aXN0aW5nUG9wb3Zlci5wYXJlbnRFbGVtZW50IS5yZW1vdmVDaGlsZChleGlzdGluZ1BvcG92ZXIpXG5cbiAgICBjb25zdCBtb2RhbEJHID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgIG1vZGFsQkcuaWQgPSBcInBvcG92ZXItYmFja2dyb3VuZFwiXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChtb2RhbEJHKVxuXG4gICAgY29uc3QgbW9kYWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gICAgbW9kYWwuaWQgPSBcInBvcG92ZXItbW9kYWxcIlxuICAgIGlmIChjbGFzc0xpc3QpIG1vZGFsLmNsYXNzTmFtZSA9IGNsYXNzTGlzdFxuXG4gICAgY29uc3QgY2xvc2VCdXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpXG4gICAgY2xvc2VCdXR0b24uaW5uZXJUZXh0ID0gXCJDbG9zZVwiXG4gICAgY2xvc2VCdXR0b24uY2xhc3NMaXN0LmFkZChcImNsb3NlXCIpXG4gICAgY2xvc2VCdXR0b24udGFiSW5kZXggPSAxXG4gICAgbW9kYWwuYXBwZW5kQ2hpbGQoY2xvc2VCdXR0b24pXG5cbiAgICBjb25zdCBvbGRPbmtleURvd24gPSBkb2N1bWVudC5vbmtleWRvd25cblxuICAgIGNvbnN0IGNsb3NlID0gKCkgPT4ge1xuICAgICAgbW9kYWxCRy5wYXJlbnROb2RlIS5yZW1vdmVDaGlsZChtb2RhbEJHKVxuICAgICAgbW9kYWwucGFyZW50Tm9kZSEucmVtb3ZlQ2hpbGQobW9kYWwpXG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBkb2N1bWVudC5vbmtleWRvd24gPSBvbGRPbmtleURvd25cbiAgICAgIHBvc3RGb2NhbEVsZW1lbnQuZm9jdXMoKVxuICAgIH1cblxuICAgIG1vZGFsQkcub25jbGljayA9IGNsb3NlXG4gICAgY2xvc2VCdXR0b24ub25jbGljayA9IGNsb3NlXG5cbiAgICAvLyBTdXBwb3J0IGhpZGluZyB0aGUgbW9kYWwgdmlhIGVzY2FwZVxuICAgIGRvY3VtZW50Lm9ua2V5ZG93biA9IHdoZW5Fc2NhcGUoY2xvc2UpXG5cbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG1vZGFsKVxuXG4gICAgcmV0dXJuIG1vZGFsXG4gIH1cblxuICAvKiogRm9yIHNob3dpbmcgYSBsb3Qgb2YgY29kZSAqL1xuICBjb25zdCBzaG93TW9kYWwgPSAoXG4gICAgY29kZTogc3RyaW5nLFxuICAgIHBvc3RGb2NhbEVsZW1lbnQ6IEhUTUxFbGVtZW50LFxuICAgIHN1YnRpdGxlPzogc3RyaW5nLFxuICAgIGxpbmtzPzogeyBbdGV4dDogc3RyaW5nXTogc3RyaW5nIH0sXG4gICAgZXZlbnQ/OiBSZWFjdC5Nb3VzZUV2ZW50XG4gICkgPT4ge1xuICAgIGNvbnN0IG1vZGFsID0gY3JlYXRlTW9kYWxPdmVybGF5KHBvc3RGb2NhbEVsZW1lbnQpXG4gICAgLy8gSSd2ZSBub3QgYmVlbiBhYmxlIHRvIGdldCB0aGlzIHRvIHdvcmsgaW4gYSB3YXkgd2hpY2hcbiAgICAvLyB3b3JrcyB3aXRoIGV2ZXJ5IHNjcmVlbnJlYWRlciBhbmQgYnJvd3NlciBjb21iaW5hdGlvbiwgc29cbiAgICAvLyBpbnN0ZWFkIEknbSBkcm9wcGluZyB0aGUgZmVhdHVyZS5cblxuICAgIGNvbnN0IGlzTm90TW91c2UgPSBmYWxzZSAvLyAgZXZlbnQgJiYgZXZlbnQuc2NyZWVuWCA9PT0gMCAmJiBldmVudC5zY3JlZW5ZID09PSAwXG5cbiAgICBpZiAoc3VidGl0bGUpIHtcbiAgICAgIGNvbnN0IHRpdGxlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJoM1wiKVxuICAgICAgdGl0bGVFbGVtZW50LnRleHRDb250ZW50ID0gc3VidGl0bGVcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aXRsZUVsZW1lbnQuc2V0QXR0cmlidXRlKFwicm9sZVwiLCBcImFsZXJ0XCIpXG4gICAgICB9LCAxMDApXG4gICAgICBtb2RhbC5hcHBlbmRDaGlsZCh0aXRsZUVsZW1lbnQpXG4gICAgfVxuXG4gICAgY29uc3QgdGV4dGFyZWEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGV4dGFyZWFcIilcbiAgICB0ZXh0YXJlYS5yZWFkT25seSA9IHRydWVcbiAgICB0ZXh0YXJlYS53cmFwID0gXCJvZmZcIlxuICAgIHRleHRhcmVhLnN0eWxlLm1hcmdpbkJvdHRvbSA9IFwiMjBweFwiXG4gICAgbW9kYWwuYXBwZW5kQ2hpbGQodGV4dGFyZWEpXG4gICAgdGV4dGFyZWEudGV4dENvbnRlbnQgPSBjb2RlXG4gICAgdGV4dGFyZWEucm93cyA9IDYwXG5cbiAgICBjb25zdCBidXR0b25Db250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG5cbiAgICBjb25zdCBjb3B5QnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKVxuICAgIGNvcHlCdXR0b24uaW5uZXJUZXh0ID0gXCJDb3B5XCJcbiAgICBidXR0b25Db250YWluZXIuYXBwZW5kQ2hpbGQoY29weUJ1dHRvbilcblxuICAgIGNvbnN0IHNlbGVjdEFsbEJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIilcbiAgICBzZWxlY3RBbGxCdXR0b24uaW5uZXJUZXh0ID0gXCJTZWxlY3QgQWxsXCJcbiAgICBidXR0b25Db250YWluZXIuYXBwZW5kQ2hpbGQoc2VsZWN0QWxsQnV0dG9uKVxuXG4gICAgbW9kYWwuYXBwZW5kQ2hpbGQoYnV0dG9uQ29udGFpbmVyKVxuICAgIGNvbnN0IGNsb3NlID0gbW9kYWwucXVlcnlTZWxlY3RvcihcIi5jbG9zZVwiKSBhcyBIVE1MRWxlbWVudFxuICAgIGNsb3NlLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGUgPT4ge1xuICAgICAgaWYgKGUua2V5ID09PSBcIlRhYlwiKSB7XG4gICAgICAgIDsobW9kYWwucXVlcnlTZWxlY3RvcihcInRleHRhcmVhXCIpIGFzIGFueSkuZm9jdXMoKVxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgaWYgKGxpbmtzKSB7XG4gICAgICBPYmplY3Qua2V5cyhsaW5rcykuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgICAgY29uc3QgaHJlZiA9IGxpbmtzW25hbWVdXG4gICAgICAgIGNvbnN0IGV4dHJhQnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKVxuICAgICAgICBleHRyYUJ1dHRvbi5pbm5lclRleHQgPSBuYW1lXG4gICAgICAgIGV4dHJhQnV0dG9uLm9uY2xpY2sgPSAoKSA9PiAoZG9jdW1lbnQubG9jYXRpb24gPSBocmVmIGFzIGFueSlcbiAgICAgICAgYnV0dG9uQ29udGFpbmVyLmFwcGVuZENoaWxkKGV4dHJhQnV0dG9uKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBjb25zdCBzZWxlY3RBbGwgPSAoKSA9PiB7XG4gICAgICB0ZXh0YXJlYS5zZWxlY3QoKVxuICAgIH1cblxuICAgIGNvbnN0IHNob3VsZEF1dG9TZWxlY3QgPSAhaXNOb3RNb3VzZVxuICAgIGlmIChzaG91bGRBdXRvU2VsZWN0KSB7XG4gICAgICBzZWxlY3RBbGwoKVxuICAgIH0gZWxzZSB7XG4gICAgICB0ZXh0YXJlYS5mb2N1cygpXG4gICAgfVxuXG4gICAgY29uc3QgYnV0dG9ucyA9IG1vZGFsLnF1ZXJ5U2VsZWN0b3JBbGwoXCJidXR0b25cIilcbiAgICBjb25zdCBsYXN0QnV0dG9uID0gYnV0dG9ucy5pdGVtKGJ1dHRvbnMubGVuZ3RoIC0gMSkgYXMgSFRNTEVsZW1lbnRcbiAgICBsYXN0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGUgPT4ge1xuICAgICAgaWYgKGUua2V5ID09PSBcIlRhYlwiKSB7XG4gICAgICAgIDsoZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5jbG9zZVwiKSBhcyBhbnkpLmZvY3VzKClcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHNlbGVjdEFsbEJ1dHRvbi5vbmNsaWNrID0gc2VsZWN0QWxsXG4gICAgY29weUJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoY29kZSlcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGNyZWF0ZU1vZGFsT3ZlcmxheSxcbiAgICBzaG93TW9kYWwsXG4gICAgZmxhc2hJbmZvLFxuICB9XG59XG5cbi8qKlxuICogUnVucyB0aGUgY2xvc3VyZSB3aGVuIGVzY2FwZSBpcyB0YXBwZWRcbiAqIEBwYXJhbSBmdW5jIGNsb3N1cmUgdG8gcnVuIG9uIGVzY2FwZSBiZWluZyBwcmVzc2VkXG4gKi9cbmNvbnN0IHdoZW5Fc2NhcGUgPSAoZnVuYzogKCkgPT4gdm9pZCkgPT4gKGV2ZW50OiBLZXlib2FyZEV2ZW50KSA9PiB7XG4gIGNvbnN0IGV2dCA9IGV2ZW50IHx8IHdpbmRvdy5ldmVudFxuICBsZXQgaXNFc2NhcGUgPSBmYWxzZVxuICBpZiAoXCJrZXlcIiBpbiBldnQpIHtcbiAgICBpc0VzY2FwZSA9IGV2dC5rZXkgPT09IFwiRXNjYXBlXCIgfHwgZXZ0LmtleSA9PT0gXCJFc2NcIlxuICB9IGVsc2Uge1xuICAgIC8vIEB0cy1pZ25vcmUgLSB0aGlzIHVzZWQgdG8gYmUgdGhlIGNhc2VcbiAgICBpc0VzY2FwZSA9IGV2dC5rZXlDb2RlID09PSAyN1xuICB9XG4gIGlmIChpc0VzY2FwZSkge1xuICAgIGZ1bmMoKVxuICB9XG59XG4iXX0=