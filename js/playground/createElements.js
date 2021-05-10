define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.activatePlugin = exports.createTabForPlugin = exports.createPluginContainer = exports.createTabBar = exports.setupSidebarToggle = exports.createSidebar = exports.sidebarHidden = exports.createDragBar = void 0;
    const createDragBar = () => {
        const sidebar = document.createElement("div");
        sidebar.className = "playground-dragbar";
        let left, right;
        const drag = (e) => {
            if (left && right) {
                // Get how far right the mouse is from the right
                const rightX = right.getBoundingClientRect().right;
                const offset = rightX - e.pageX;
                const screenClampLeft = window.innerWidth - 320;
                const clampedOffset = Math.min(Math.max(offset, 280), screenClampLeft);
                // Set the widths
                left.style.width = `calc(100% - ${clampedOffset}px)`;
                right.style.width = `${clampedOffset}px`;
                right.style.flexBasis = `${clampedOffset}px`;
                right.style.maxWidth = `${clampedOffset}px`;
                // Save the x coordinate of the
                if (window.localStorage) {
                    window.localStorage.setItem("dragbar-x", "" + clampedOffset);
                    window.localStorage.setItem("dragbar-window-width", "" + window.innerWidth);
                }
                // @ts-ignore - I know what I'm doing
                window.sandbox.editor.layout();
                // Don't allow selection
                e.stopPropagation();
                e.cancelBubble = true;
            }
        };
        sidebar.addEventListener("mousedown", e => {
            var _a;
            left = document.getElementById("editor-container");
            right = (_a = sidebar.parentElement) === null || _a === void 0 ? void 0 : _a.getElementsByClassName("playground-sidebar").item(0);
            // Handle dragging all over the screen
            document.addEventListener("mousemove", drag);
            // Remove it when you lt go anywhere
            document.addEventListener("mouseup", () => {
                document.removeEventListener("mousemove", drag);
                document.body.style.userSelect = "auto";
            });
            // Don't allow the drag to select text accidentally
            document.body.style.userSelect = "none";
            e.stopPropagation();
            e.cancelBubble = true;
        });
        return sidebar;
    };
    exports.createDragBar = createDragBar;
    const sidebarHidden = () => !!window.localStorage.getItem("sidebar-hidden");
    exports.sidebarHidden = sidebarHidden;
    const createSidebar = () => {
        const sidebar = document.createElement("div");
        sidebar.className = "playground-sidebar";
        // Start with the sidebar hidden on small screens
        const isTinyScreen = window.innerWidth < 800;
        // This is independent of the sizing below so that you keep the same sized sidebar
        if (isTinyScreen || exports.sidebarHidden()) {
            sidebar.style.display = "none";
        }
        if (window.localStorage && window.localStorage.getItem("dragbar-x")) {
            // Don't restore the x pos if the window isn't the same size
            if (window.innerWidth === Number(window.localStorage.getItem("dragbar-window-width"))) {
                // Set the dragger to the previous x pos
                let width = window.localStorage.getItem("dragbar-x");
                if (isTinyScreen) {
                    width = String(Math.min(Number(width), 280));
                }
                sidebar.style.width = `${width}px`;
                sidebar.style.flexBasis = `${width}px`;
                sidebar.style.maxWidth = `${width}px`;
                const left = document.getElementById("editor-container");
                left.style.width = `calc(100% - ${width}px)`;
            }
        }
        return sidebar;
    };
    exports.createSidebar = createSidebar;
    const toggleIconWhenOpen = "&#x21E5;";
    const toggleIconWhenClosed = "&#x21E4;";
    const setupSidebarToggle = () => {
        const toggle = document.getElementById("sidebar-toggle");
        const updateToggle = () => {
            const sidebar = window.document.querySelector(".playground-sidebar");
            const sidebarShowing = sidebar.style.display !== "none";
            toggle.innerHTML = sidebarShowing ? toggleIconWhenOpen : toggleIconWhenClosed;
            toggle.setAttribute("aria-label", sidebarShowing ? "Hide Sidebar" : "Show Sidebar");
        };
        toggle.onclick = () => {
            const sidebar = window.document.querySelector(".playground-sidebar");
            const newState = sidebar.style.display !== "none";
            if (newState) {
                localStorage.setItem("sidebar-hidden", "true");
                sidebar.style.display = "none";
            }
            else {
                localStorage.removeItem("sidebar-hidden");
                sidebar.style.display = "block";
            }
            updateToggle();
            // @ts-ignore - I know what I'm doing
            window.sandbox.editor.layout();
            return false;
        };
        // Ensure its set up at the start
        updateToggle();
    };
    exports.setupSidebarToggle = setupSidebarToggle;
    const createTabBar = () => {
        const tabBar = document.createElement("div");
        tabBar.classList.add("playground-plugin-tabview");
        tabBar.id = "playground-plugin-tabbar";
        tabBar.setAttribute("aria-label", "Tabs for plugins");
        tabBar.setAttribute("role", "tablist");
        /** Support left/right in the tab bar for accessibility */
        let tabFocus = 0;
        tabBar.addEventListener("keydown", e => {
            const tabs = document.querySelectorAll('.playground-plugin-tabview [role="tab"]');
            // Move right
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                tabs[tabFocus].setAttribute("tabindex", "-1");
                if (e.key === "ArrowRight") {
                    tabFocus++;
                    // If we're at the end, go to the start
                    if (tabFocus >= tabs.length) {
                        tabFocus = 0;
                    }
                    // Move left
                }
                else if (e.key === "ArrowLeft") {
                    tabFocus--;
                    // If we're at the start, move to the end
                    if (tabFocus < 0) {
                        tabFocus = tabs.length - 1;
                    }
                }
                tabs[tabFocus].setAttribute("tabindex", "0");
                tabs[tabFocus].focus();
            }
        });
        return tabBar;
    };
    exports.createTabBar = createTabBar;
    const createPluginContainer = () => {
        const container = document.createElement("div");
        container.setAttribute("role", "tabpanel");
        container.classList.add("playground-plugin-container");
        return container;
    };
    exports.createPluginContainer = createPluginContainer;
    const createTabForPlugin = (plugin) => {
        const element = document.createElement("button");
        element.setAttribute("role", "tab");
        element.id = "playground-plugin-tab-" + plugin.id;
        element.textContent = plugin.displayName;
        return element;
    };
    exports.createTabForPlugin = createTabForPlugin;
    const activatePlugin = (plugin, previousPlugin, sandbox, tabBar, container) => {
        let newPluginTab, oldPluginTab;
        // @ts-ignore - This works at runtime
        for (const tab of tabBar.children) {
            if (tab.id === `playground-plugin-tab-${plugin.id}`)
                newPluginTab = tab;
            if (previousPlugin && tab.id === `playground-plugin-tab-${previousPlugin.id}`)
                oldPluginTab = tab;
        }
        // @ts-ignore
        if (!newPluginTab)
            throw new Error("Could not get a tab for the plugin: " + plugin.displayName);
        // Tell the old plugin it's getting the boot
        // @ts-ignore
        if (previousPlugin && oldPluginTab) {
            if (previousPlugin.willUnmount)
                previousPlugin.willUnmount(sandbox, container);
            oldPluginTab.classList.remove("active");
            oldPluginTab.setAttribute("aria-selected", "false");
            oldPluginTab.setAttribute("tabindex", "-1");
        }
        // Wipe the sidebar
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        // Start booting up the new plugin
        newPluginTab.classList.add("active");
        newPluginTab.setAttribute("aria-selected", "true");
        newPluginTab.setAttribute("tabindex", "0");
        // Tell the new plugin to start doing some work
        if (plugin.willMount)
            plugin.willMount(sandbox, container);
        if (plugin.modelChanged)
            plugin.modelChanged(sandbox, sandbox.getModel(), container);
        if (plugin.modelChangedDebounce)
            plugin.modelChangedDebounce(sandbox, sandbox.getModel(), container);
        if (plugin.didMount)
            plugin.didMount(sandbox, container);
        // Let the previous plugin do any slow work after it's all done
        if (previousPlugin && previousPlugin.didUnmount)
            previousPlugin.didUnmount(sandbox, container);
    };
    exports.activatePlugin = activatePlugin;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlRWxlbWVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wbGF5Z3JvdW5kL3NyYy9jcmVhdGVFbGVtZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0lBSU8sTUFBTSxhQUFhLEdBQUcsR0FBRyxFQUFFO1FBQ2hDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0MsT0FBTyxDQUFDLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQTtRQUV4QyxJQUFJLElBQWlCLEVBQUUsS0FBa0IsQ0FBQTtRQUN6QyxNQUFNLElBQUksR0FBRyxDQUFDLENBQWEsRUFBRSxFQUFFO1lBQzdCLElBQUksSUFBSSxJQUFJLEtBQUssRUFBRTtnQkFDakIsZ0RBQWdEO2dCQUNoRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxLQUFLLENBQUE7Z0JBQ2xELE1BQU0sTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFBO2dCQUMvQixNQUFNLGVBQWUsR0FBRyxNQUFNLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQTtnQkFDL0MsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQTtnQkFFdEUsaUJBQWlCO2dCQUNqQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxlQUFlLGFBQWEsS0FBSyxDQUFBO2dCQUNwRCxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLGFBQWEsSUFBSSxDQUFBO2dCQUN4QyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxHQUFHLGFBQWEsSUFBSSxDQUFBO2dCQUM1QyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxHQUFHLGFBQWEsSUFBSSxDQUFBO2dCQUUzQywr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QVE7WUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUV4RCwrREFBK0Q7UUFDL0QsSUFBSSxjQUFjLElBQUksY0FBYyxDQUFDLFVBQVU7WUFBRSxjQUFjLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNoRyxDQUFDLENBQUE7SUE1Q1ksUUFBQSxjQUFjLGtCQTRDMUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQbGF5Z3JvdW5kUGx1Z2luIH0gZnJvbSBcIi5cIlxuXG50eXBlIFNhbmRib3ggPSBpbXBvcnQoXCJAdHlwZXNjcmlwdC9zYW5kYm94XCIpLlNhbmRib3hcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZURyYWdCYXIgPSAoKSA9PiB7XG4gIGNvbnN0IHNpZGViYXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gIHNpZGViYXIuY2xhc3NOYW1lID0gXCJwbGF5Z3JvdW5kLWRyYWdiYXJcIlxuXG4gIGxldCBsZWZ0OiBIVE1MRWxlbWVudCwgcmlnaHQ6IEhUTUxFbGVtZW50XG4gIGNvbnN0IGRyYWcgPSAoZTogTW91c2VFdmVudCkgPT4ge1xuICAgIGlmIChsZWZ0ICYmIHJpZ2h0KSB7XG4gICAgICAvLyBHZXQgaG93IGZhciByaWdodCB0aGUgbW91c2UgaXMgZnJvbSB0aGUgcmlnaHRcbiAgICAgIGNvbnN0IHJpZ2h0WCA9IHJpZ2h0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnJpZ2h0XG4gICAgICBjb25zdCBvZmZzZXQgPSByaWdodFggLSBlLnBhZ2VYXG4gICAgICBjb25zdCBzY3JlZW5DbGFtcExlZnQgPSB3aW5kb3cuaW5uZXJXaWR0aCAtIDMyMFxuICAgICAgY29uc3QgY2xhbXBlZE9mZnNldCA9IE1hdGgubWluKE1hdGgubWF4KG9mZnNldCwgMjgwKSwgc2NyZWVuQ2xhbXBMZWZ0KVxuXG4gICAgICAvLyBTZXQgdGhlIHdpZHRoc1xuICAgICAgbGVmdC5zdHlsZS53aWR0aCA9IGBjYWxjKDEwMCUgLSAke2NsYW1wZWRPZmZzZXR9cHgpYFxuICAgICAgcmlnaHQuc3R5bGUud2lkdGggPSBgJHtjbGFtcGVkT2Zmc2V0fXB4YFxuICAgICAgcmlnaHQuc3R5bGUuZmxleEJhc2lzID0gYCR7Y2xhbXBlZE9mZnNldH1weGBcbiAgICAgIHJpZ2h0LnN0eWxlLm1heFdpZHRoID0gYCR7Y2xhbXBlZE9mZnNldH1weGBcblxuICAgICAgLy8gU2F2ZSB0aGUgeCBjb29yZGluYXRlIG9mIHRoZVxuICAgICAgaWYgKHdpbmRvdy5sb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiZHJhZ2Jhci14XCIsIFwiXCIgKyBjbGFtcGVkT2Zmc2V0KVxuICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJkcmFnYmFyLXdpbmRvdy13aWR0aFwiLCBcIlwiICsgd2luZG93LmlubmVyV2lkdGgpXG4gICAgICB9XG5cbiAgICAgIC8vIEB0cy1pZ25vcmUgLSBJIGtub3cgd2hhdCBJJ20gZG9pbmdcbiAgICAgIHdpbmRvdy5zYW5kYm94LmVkaXRvci5sYXlvdXQoKVxuXG4gICAgICAvLyBEb24ndCBhbGxvdyBzZWxlY3Rpb25cbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgICAgIGUuY2FuY2VsQnViYmxlID0gdHJ1ZVxuICAgIH1cbiAgfVxuXG4gIHNpZGViYXIuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBlID0+IHtcbiAgICBsZWZ0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJlZGl0b3ItY29udGFpbmVyXCIpIVxuICAgIHJpZ2h0ID0gc2lkZWJhci5wYXJlbnRFbGVtZW50Py5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwicGxheWdyb3VuZC1zaWRlYmFyXCIpLml0ZW0oMCkhIGFzIGFueVxuICAgIC8vIEhhbmRsZSBkcmFnZ2luZyBhbGwgb3ZlciB0aGUgc2NyZWVuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBkcmFnKVxuICAgIC8vIFJlbW92ZSBpdCB3aGVuIHlvdSBsdCBnbyBhbnl3aGVyZVxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsICgpID0+IHtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgZHJhZylcbiAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUudXNlclNlbGVjdCA9IFwiYXV0b1wiXG4gICAgfSlcblxuICAgIC8vIERvbid0IGFsbG93IHRoZSBkcmFnIHRvIHNlbGVjdCB0ZXh0IGFjY2lkZW50YWxseVxuICAgIGRvY3VtZW50LmJvZHkuc3R5bGUudXNlclNlbGVjdCA9IFwibm9uZVwiXG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKVxuICAgIGUuY2FuY2VsQnViYmxlID0gdHJ1ZVxuICB9KVxuXG4gIHJldHVybiBzaWRlYmFyXG59XG5cbmV4cG9ydCBjb25zdCBzaWRlYmFySGlkZGVuID0gKCkgPT4gISF3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJzaWRlYmFyLWhpZGRlblwiKVxuXG5leHBvcnQgY29uc3QgY3JlYXRlU2lkZWJhciA9ICgpID0+IHtcbiAgY29uc3Qgc2lkZWJhciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgc2lkZWJhci5jbGFzc05hbWUgPSBcInBsYXlncm91bmQtc2lkZWJhclwiXG5cbiAgLy8gU3RhcnQgd2l0aCB0aGUgc2lkZWJhciBoaWRkZW4gb24gc21hbGwgc2NyZWVuc1xuICBjb25zdCBpc1RpbnlTY3JlZW4gPSB3aW5kb3cuaW5uZXJXaWR0aCA8IDgwMFxuXG4gIC8vIFRoaXMgaXMgaW5kZXBlbmRlbnQgb2YgdGhlIHNpemluZyBiZWxvdyBzbyB0aGF0IHlvdSBrZWVwIHRoZSBzYW1lIHNpemVkIHNpZGViYXJcbiAgaWYgKGlzVGlueVNjcmVlbiB8fCBzaWRlYmFySGlkZGVuKCkpIHtcbiAgICBzaWRlYmFyLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIlxuICB9XG5cbiAgaWYgKHdpbmRvdy5sb2NhbFN0b3JhZ2UgJiYgd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiZHJhZ2Jhci14XCIpKSB7XG4gICAgLy8gRG9uJ3QgcmVzdG9yZSB0aGUgeCBwb3MgaWYgdGhlIHdpbmRvdyBpc24ndCB0aGUgc2FtZSBzaXplXG4gICAgaWYgKHdpbmRvdy5pbm5lcldpZHRoID09PSBOdW1iZXIod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiZHJhZ2Jhci13aW5kb3ctd2lkdGhcIikpKSB7XG4gICAgICAvLyBTZXQgdGhlIGRyYWdnZXIgdG8gdGhlIHByZXZpb3VzIHggcG9zXG4gICAgICBsZXQgd2lkdGggPSB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJkcmFnYmFyLXhcIilcblxuICAgICAgaWYgKGlzVGlueVNjcmVlbikge1xuICAgICAgICB3aWR0aCA9IFN0cmluZyhNYXRoLm1pbihOdW1iZXIod2lkdGgpLCAyODApKVxuICAgICAgfVxuXG4gICAgICBzaWRlYmFyLnN0eWxlLndpZHRoID0gYCR7d2lkdGh9cHhgXG4gICAgICBzaWRlYmFyLnN0eWxlLmZsZXhCYXNpcyA9IGAke3dpZHRofXB4YFxuICAgICAgc2lkZWJhci5zdHlsZS5tYXhXaWR0aCA9IGAke3dpZHRofXB4YFxuXG4gICAgICBjb25zdCBsZWZ0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJlZGl0b3ItY29udGFpbmVyXCIpIVxuICAgICAgbGVmdC5zdHlsZS53aWR0aCA9IGBjYWxjKDEwMCUgLSAke3dpZHRofXB4KWBcbiAgICB9XG4gIH1cblxuICByZXR1cm4gc2lkZWJhclxufVxuXG5jb25zdCB0b2dnbGVJY29uV2hlbk9wZW4gPSBcIiYjeDIxRTU7XCJcbmNvbnN0IHRvZ2dsZUljb25XaGVuQ2xvc2VkID0gXCImI3gyMUU0O1wiXG5cbmV4cG9ydCBjb25zdCBzZXR1cFNpZGViYXJUb2dnbGUgPSAoKSA9PiB7XG4gIGNvbnN0IHRvZ2dsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2lkZWJhci10b2dnbGVcIikhXG5cbiAgY29uc3QgdXBkYXRlVG9nZ2xlID0gKCkgPT4ge1xuICAgIGNvbnN0IHNpZGViYXIgPSB3aW5kb3cuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5wbGF5Z3JvdW5kLXNpZGViYXJcIikgYXMgSFRNTERpdkVsZW1lbnRcbiAgICBjb25zdCBzaWRlYmFyU2hvd2luZyA9IHNpZGViYXIuc3R5bGUuZGlzcGxheSAhPT0gXCJub25lXCJcblxuICAgIHRvZ2dsZS5pbm5lckhUTUwgPSBzaWRlYmFyU2hvd2luZyA/IHRvZ2dsZUljb25XaGVuT3BlbiA6IHRvZ2dsZUljb25XaGVuQ2xvc2VkXG4gICAgdG9nZ2xlLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgc2lkZWJhclNob3dpbmcgPyBcIkhpZGUgU2lkZWJhclwiIDogXCJTaG93IFNpZGViYXJcIilcbiAgfVxuXG4gIHRvZ2dsZS5vbmNsaWNrID0gKCkgPT4ge1xuICAgIGNvbnN0IHNpZGViYXIgPSB3aW5kb3cuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5wbGF5Z3JvdW5kLXNpZGViYXJcIikgYXMgSFRNTERpdkVsZW1lbnRcbiAgICBjb25zdCBuZXdTdGF0ZSA9IHNpZGViYXIuc3R5bGUuZGlzcGxheSAhPT0gXCJub25lXCJcblxuICAgIGlmIChuZXdTdGF0ZSkge1xuICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJzaWRlYmFyLWhpZGRlblwiLCBcInRydWVcIilcbiAgICAgIHNpZGViYXIuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiXG4gICAgfSBlbHNlIHtcbiAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKFwic2lkZWJhci1oaWRkZW5cIilcbiAgICAgIHNpZGViYXIuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIlxuICAgIH1cblxuICAgIHVwZGF0ZVRvZ2dsZSgpXG5cbiAgICAvLyBAdHMtaWdub3JlIC0gSSBrbm93IHdoYXQgSSdtIGRvaW5nXG4gICAgd2luZG93LnNhbmRib3guZWRpdG9yLmxheW91dCgpXG5cbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8vIEVuc3VyZSBpdHMgc2V0IHVwIGF0IHRoZSBzdGFydFxuICB1cGRhdGVUb2dnbGUoKVxufVxuXG5leHBvcnQgY29uc3QgY3JlYXRlVGFiQmFyID0gKCkgPT4ge1xuICBjb25zdCB0YWJCYXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gIHRhYkJhci5jbGFzc0xpc3QuYWRkKFwicGxheWdyb3VuZC1wbHVnaW4tdGFidmlld1wiKVxuICB0YWJCYXIuaWQgPSBcInBsYXlncm91bmQtcGx1Z2luLXRhYmJhclwiXG4gIHRhYkJhci5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIFwiVGFicyBmb3IgcGx1Z2luc1wiKVxuICB0YWJCYXIuc2V0QXR0cmlidXRlKFwicm9sZVwiLCBcInRhYmxpc3RcIilcblxuICAvKiogU3VwcG9ydCBsZWZ0L3JpZ2h0IGluIHRoZSB0YWIgYmFyIGZvciBhY2Nlc3NpYmlsaXR5ICovXG4gIGxldCB0YWJGb2N1cyA9IDBcbiAgdGFiQmFyLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGUgPT4ge1xuICAgIGNvbnN0IHRhYnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucGxheWdyb3VuZC1wbHVnaW4tdGFidmlldyBbcm9sZT1cInRhYlwiXScpXG4gICAgLy8gTW92ZSByaWdodFxuICAgIGlmIChlLmtleSA9PT0gXCJBcnJvd1JpZ2h0XCIgfHwgZS5rZXkgPT09IFwiQXJyb3dMZWZ0XCIpIHtcbiAgICAgIHRhYnNbdGFiRm9jdXNdLnNldEF0dHJpYnV0ZShcInRhYmluZGV4XCIsIFwiLTFcIilcbiAgICAgIGlmIChlLmtleSA9PT0gXCJBcnJvd1JpZ2h0XCIpIHtcbiAgICAgICAgdGFiRm9jdXMrK1xuICAgICAgICAvLyBJZiB3ZSdyZSBhdCB0aGUgZW5kLCBnbyB0byB0aGUgc3RhcnRcbiAgICAgICAgaWYgKHRhYkZvY3VzID49IHRhYnMubGVuZ3RoKSB7XG4gICAgICAgICAgdGFiRm9jdXMgPSAwXG4gICAgICAgIH1cbiAgICAgICAgLy8gTW92ZSBsZWZ0XG4gICAgICB9IGVsc2UgaWYgKGUua2V5ID09PSBcIkFycm93TGVmdFwiKSB7XG4gICAgICAgIHRhYkZvY3VzLS1cbiAgICAgICAgLy8gSWYgd2UncmUgYXQgdGhlIHN0YXJ0LCBtb3ZlIHRvIHRoZSBlbmRcbiAgICAgICAgaWYgKHRhYkZvY3VzIDwgMCkge1xuICAgICAgICAgIHRhYkZvY3VzID0gdGFicy5sZW5ndGggLSAxXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGFic1t0YWJGb2N1c10uc2V0QXR0cmlidXRlKFwidGFiaW5kZXhcIiwgXCIwXCIpXG4gICAgICA7KHRhYnNbdGFiRm9jdXNdIGFzIGFueSkuZm9jdXMoKVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gdGFiQmFyXG59XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVQbHVnaW5Db250YWluZXIgPSAoKSA9PiB7XG4gIGNvbnN0IGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgY29udGFpbmVyLnNldEF0dHJpYnV0ZShcInJvbGVcIiwgXCJ0YWJwYW5lbFwiKVxuICBjb250YWluZXIuY2xhc3NMaXN0LmFkZChcInBsYXlncm91bmQtcGx1Z2luLWNvbnRhaW5lclwiKVxuICByZXR1cm4gY29udGFpbmVyXG59XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVUYWJGb3JQbHVnaW4gPSAocGx1Z2luOiBQbGF5Z3JvdW5kUGx1Z2luKSA9PiB7XG4gIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpXG4gIGVsZW1lbnQuc2V0QXR0cmlidXRlKFwicm9sZVwiLCBcInRhYlwiKVxuICBlbGVtZW50LmlkID0gXCJwbGF5Z3JvdW5kLXBsdWdpbi10YWItXCIgKyBwbHVnaW4uaWRcbiAgZWxlbWVudC50ZXh0Q29udGVudCA9IHBsdWdpbi5kaXNwbGF5TmFtZVxuICByZXR1cm4gZWxlbWVudFxufVxuXG5leHBvcnQgY29uc3QgYWN0aXZhdGVQbHVnaW4gPSAoXG4gIHBsdWdpbjogUGxheWdyb3VuZFBsdWdpbixcbiAgcHJldmlvdXNQbHVnaW46IFBsYXlncm91bmRQbHVnaW4gfCB1bmRlZmluZWQsXG4gIHNhbmRib3g6IFNhbmRib3gsXG4gIHRhYkJhcjogSFRNTERpdkVsZW1lbnQsXG4gIGNvbnRhaW5lcjogSFRNTERpdkVsZW1lbnRcbikgPT4ge1xuICBsZXQgbmV3UGx1Z2luVGFiOiBFbGVtZW50LCBvbGRQbHVnaW5UYWI6IEVsZW1lbnRcbiAgLy8gQHRzLWlnbm9yZSAtIFRoaXMgd29ya3MgYXQgcnVudGltZVxuICBmb3IgKGNvbnN0IHRhYiBvZiB0YWJCYXIuY2hpbGRyZW4pIHtcbiAgICBpZiAodGFiLmlkID09PSBgcGxheWdyb3VuZC1wbHVnaW4tdGFiLSR7cGx1Z2luLmlkfWApIG5ld1BsdWdpblRhYiA9IHRhYlxuICAgIGlmIChwcmV2aW91c1BsdWdpbiAmJiB0YWIuaWQgPT09IGBwbGF5Z3JvdW5kLXBsdWdpbi10YWItJHtwcmV2aW91c1BsdWdpbi5pZH1gKSBvbGRQbHVnaW5UYWIgPSB0YWJcbiAgfVxuXG4gIC8vIEB0cy1pZ25vcmVcbiAgaWYgKCFuZXdQbHVnaW5UYWIpIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBnZXQgYSB0YWIgZm9yIHRoZSBwbHVnaW46IFwiICsgcGx1Z2luLmRpc3BsYXlOYW1lKVxuXG4gIC8vIFRlbGwgdGhlIG9sZCBwbHVnaW4gaXQncyBnZXR0aW5nIHRoZSBib290XG4gIC8vIEB0cy1pZ25vcmVcbiAgaWYgKHByZXZpb3VzUGx1Z2luICYmIG9sZFBsdWdpblRhYikge1xuICAgIGlmIChwcmV2aW91c1BsdWdpbi53aWxsVW5tb3VudCkgcHJldmlvdXNQbHVnaW4ud2lsbFVubW91bnQoc2FuZGJveCwgY29udGFpbmVyKVxuICAgIG9sZFBsdWdpblRhYi5jbGFzc0xpc3QucmVtb3ZlKFwiYWN0aXZlXCIpXG4gICAgb2xkUGx1Z2luVGFiLnNldEF0dHJpYnV0ZShcImFyaWEtc2VsZWN0ZWRcIiwgXCJmYWxzZVwiKVxuICAgIG9sZFBsdWdpblRhYi5zZXRBdHRyaWJ1dGUoXCJ0YWJpbmRleFwiLCBcIi0xXCIpXG4gIH1cblxuICAvLyBXaXBlIHRoZSBzaWRlYmFyXG4gIHdoaWxlIChjb250YWluZXIuZmlyc3RDaGlsZCkge1xuICAgIGNvbnRhaW5lci5yZW1vdmVDaGlsZChjb250YWluZXIuZmlyc3RDaGlsZClcbiAgfVxuXG4gIC8vIFN0YXJ0IGJvb3RpbmcgdXAgdGhlIG5ldyBwbHVnaW5cbiAgbmV3UGx1Z2luVGFiLmNsYXNzTGlzdC5hZGQoXCJhY3RpdmVcIilcbiAgbmV3UGx1Z2luVGFiLnNldEF0dHJpYnV0ZShcImFyaWEtc2VsZWN0ZWRcIiwgXCJ0cnVlXCIpXG4gIG5ld1BsdWdpblRhYi5zZXRBdHRyaWJ1dGUoXCJ0YWJpbmRleFwiLCBcIjBcIilcblxuICAvLyBUZWxsIHRoZSBuZXcgcGx1Z2luIHRvIHN0YXJ0IGRvaW5nIHNvbWUgd29ya1xuICBpZiAocGx1Z2luLndpbGxNb3VudCkgcGx1Z2luLndpbGxNb3VudChzYW5kYm94LCBjb250YWluZXIpXG4gIGlmIChwbHVnaW4ubW9kZWxDaGFuZ2VkKSBwbHVnaW4ubW9kZWxDaGFuZ2VkKHNhbmRib3gsIHNhbmRib3guZ2V0TW9kZWwoKSwgY29udGFpbmVyKVxuICBpZiAocGx1Z2luLm1vZGVsQ2hhbmdlZERlYm91bmNlKSBwbHVnaW4ubW9kZWxDaGFuZ2VkRGVib3VuY2Uoc2FuZGJveCwgc2FuZGJveC5nZXRNb2RlbCgpLCBjb250YWluZXIpXG4gIGlmIChwbHVnaW4uZGlkTW91bnQpIHBsdWdpbi5kaWRNb3VudChzYW5kYm94LCBjb250YWluZXIpXG5cbiAgLy8gTGV0IHRoZSBwcmV2aW91cyBwbHVnaW4gZG8gYW55IHNsb3cgd29yayBhZnRlciBpdCdzIGFsbCBkb25lXG4gIGlmIChwcmV2aW91c1BsdWdpbiAmJiBwcmV2aW91c1BsdWdpbi5kaWRVbm1vdW50KSBwcmV2aW91c1BsdWdpbi5kaWRVbm1vdW50KHNhbmRib3gsIGNvbnRhaW5lcilcbn1cbiJdfQ==