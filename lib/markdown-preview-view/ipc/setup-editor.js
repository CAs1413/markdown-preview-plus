"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
const electron_1 = require("electron");
const request_handler_1 = require("./request-handler");
const util_1 = require("../../util");
const should_scroll_sync_1 = require("./should-scroll-sync");
class RemoteEditorServer {
    constructor(editor) {
        this.editor = editor;
        this.disposables = new atom_1.CompositeDisposable();
        this.windowId = electron_1.remote.getCurrentWindow().id;
        this.destroyTimeoutLength = 60000;
        this.usageCounter = 0;
        this.eventHandlers = {
            scrollToBufferRange: ([min, max]) => {
                if (min === 0) {
                    this.editor.scrollToBufferPosition([min, 0]);
                }
                else if (max >= this.editor.getLastBufferRow() - 1) {
                    this.editor.scrollToBufferPosition([max, 0]);
                }
                else {
                    const range = atom_1.Range.fromObject([[min, 0], [max, 0]]);
                    this.editor.scrollToScreenRange(this.editor.screenRangeForBufferRange(range), {
                        center: false,
                    });
                }
            },
            destroy: () => {
                this.usageCounter -= 1;
                if (this.usageCounter <= 0) {
                    this.resetTimeout();
                    this.destroyTimeout = window.setTimeout(() => {
                        this.destroy();
                    }, this.destroyTimeoutLength);
                }
            },
            init: () => {
                this.usageCounter += 1;
                this.resetTimeout();
                return {
                    path: this.editor.getPath(),
                    title: this.editor.getTitle(),
                    grammar: this.editor.getGrammar().scopeName,
                    text: this.editor.getText(),
                };
            },
            openSource: (row) => {
                if (row !== undefined) {
                    this.editor.setCursorBufferPosition([row, 0]);
                }
                electron_1.remote.getCurrentWindow().focus();
                const pane = atom.workspace.paneForItem(this.editor);
                if (!pane)
                    return;
                pane.activateItem(this.editor);
                pane.activate();
            },
        };
        this.disposables.add(new request_handler_1.RequestHandler(this.windowId, editor.id, this.eventHandlers));
        this.handleEditorEvents();
    }
    static create(editor) {
        const res = RemoteEditorServer.editorMap.get(editor);
        if (res)
            return res;
        const newRes = new RemoteEditorServer(editor);
        RemoteEditorServer.editorMap.set(editor, newRes);
        return newRes;
    }
    destroy() {
        RemoteEditorServer.editorMap.delete(this.editor);
        this.disposables.dispose();
    }
    resetTimeout() {
        if (this.destroyTimeout !== undefined) {
            window.clearTimeout(this.destroyTimeout);
            this.destroyTimeout = undefined;
        }
    }
    handleEditorEvents() {
        this.disposables.add(this.editor.getBuffer().onDidStopChanging(() => {
            if (util_1.atomConfig().previewConfig.liveUpdate) {
                this.emit('changeText', this.editor.getText());
            }
            if (util_1.atomConfig().syncConfig.syncPreviewOnChange) {
                this.emit('syncPreview', {
                    pos: this.editor.getCursorBufferPosition().row,
                    flash: false,
                });
            }
        }), this.editor.onDidChangePath(() => {
            this.emit('changePath', {
                path: this.editor.getPath(),
                title: this.editor.getTitle(),
            });
        }), this.editor.onDidChangeGrammar((grammar) => {
            this.emit('changeGrammar', grammar.scopeName);
        }), this.editor.onDidDestroy(() => {
            this.destroy();
            if (util_1.atomConfig().previewConfig.closePreviewWithEditor) {
                this.emit('destroy', undefined);
            }
        }), this.editor.getBuffer().onDidSave(() => {
            if (!util_1.atomConfig().previewConfig.liveUpdate) {
                this.emit('changeText', this.editor.getText());
            }
        }), this.editor.getBuffer().onDidReload(() => {
            if (!util_1.atomConfig().previewConfig.liveUpdate) {
                this.emit('changeText', this.editor.getText());
            }
        }), atom.views.getView(this.editor).onDidChangeScrollTop(() => {
            if (!should_scroll_sync_1.shouldScrollSync('editor'))
                return;
            const [first, last] = this.editor.getVisibleRowRange();
            const firstLine = this.editor.bufferRowForScreenRow(first);
            const lastLine = this.editor.bufferRowForScreenRow(last);
            this.emit('scrollSync', [firstLine, lastLine]);
        }), atom.commands.add(atom.views.getView(this.editor), {
            'markdown-preview-plus:sync-preview': () => {
                this.emit('syncPreview', {
                    pos: this.editor.getCursorBufferPosition().row,
                    flash: true,
                });
            },
        }));
    }
    emit(event, arg) {
        electron_1.remote.ipcMain.emit('markdown-preview-plus:editor-event', {
            editorId: this.editor.id,
            windowId: this.windowId,
            event,
            arg,
        });
    }
}
exports.RemoteEditorServer = RemoteEditorServer;
RemoteEditorServer.editorMap = new WeakMap();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dXAtZWRpdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL21hcmtkb3duLXByZXZpZXctdmlldy9pcGMvc2V0dXAtZWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0JBQTZEO0FBQzdELHVDQUFpQztBQUNqQyx1REFBa0Q7QUFDbEQscUNBQXVDO0FBQ3ZDLDZEQUF1RDtBQWtCdkQsTUFBYSxrQkFBa0I7SUFzRDdCLFlBQXFDLE1BQWtCO1FBQWxCLFdBQU0sR0FBTixNQUFNLENBQVk7UUFwRHRDLGdCQUFXLEdBQUcsSUFBSSwwQkFBbUIsRUFBRSxDQUFBO1FBQ3ZDLGFBQVEsR0FBRyxpQkFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUMsRUFBRSxDQUFBO1FBQ3ZDLHlCQUFvQixHQUFHLEtBQUssQ0FBQTtRQUNyQyxpQkFBWSxHQUFHLENBQUMsQ0FBQTtRQUVoQixrQkFBYSxHQUFHO1lBQ3RCLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFtQixFQUFFLEVBQUU7Z0JBQ3BELElBQUksR0FBRyxLQUFLLENBQUMsRUFBRTtvQkFDYixJQUFJLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7aUJBQzdDO3FCQUFNLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLEVBQUU7b0JBQ3BELElBQUksQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtpQkFDN0M7cUJBQU07b0JBQ0wsTUFBTSxLQUFLLEdBQUcsWUFBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDcEQsSUFBSSxDQUFD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SSxDQUFDLENBQUE7WUFDeEQsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxDQUFDLENBQUMsRUFDRixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDakQsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO2dCQUN6QyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRTtvQkFDdkIsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxHQUFHO29CQUM5QyxLQUFLLEVBQUUsSUFBSTtpQkFDWixDQUFDLENBQUE7WUFDSixDQUFDO1NBQ0YsQ0FBQyxDQUNILENBQUE7SUFDSCxDQUFDO0lBRU8sSUFBSSxDQUE0QixLQUFRLEVBQUUsR0FBaUI7UUFDakUsaUJBQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxFQUFFO1lBQ3hELFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDeEIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO1lBQ3ZCLEtBQUs7WUFDTCxHQUFHO1NBQ0osQ0FBQyxDQUFBO0lBQ0osQ0FBQzs7QUFoSkgsZ0RBaUpDO0FBaEpnQiw0QkFBUyxHQUFHLElBQUksT0FBTyxFQUFrQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVGV4dEVkaXRvciwgQ29tcG9zaXRlRGlzcG9zYWJsZSwgUmFuZ2UgfSBmcm9tICdhdG9tJ1xuaW1wb3J0IHsgcmVtb3RlIH0gZnJvbSAnZWxlY3Ryb24nXG5pbXBvcnQgeyBSZXF1ZXN0SGFuZGxlciB9IGZyb20gJy4vcmVxdWVzdC1oYW5kbGVyJ1xuaW1wb3J0IHsgYXRvbUNvbmZpZyB9IGZyb20gJy4uLy4uL3V0aWwnXG5pbXBvcnQgeyBzaG91bGRTY3JvbGxTeW5jIH0gZnJvbSAnLi9zaG91bGQtc2Nyb2xsLXN5bmMnXG5pbXBvcnQgeyBJUENFdmVudHMgfSBmcm9tICcuL2V2ZW50LWhhbmRsZXInXG5cbi8qIE5PVEU6IFdlaXJkIHJlZmVyZW5jZSBjb3VudGluZyBhbmQgV2Vha01hcCBhcmUgaGVyZSBiZWNhdXNlXG4gKiB0aGVyZSBjYW4gYmUgaW4gdGhlb3J5IG11bHRpcGxlIHdpbmRvd3Mgd2l0aFxuICogTWFya2Rvd25QcmV2aWV3Vmlld0VkaXRvclJlbW90ZSByZWZlcmVuY2luZyB0aGUgc2FtZVxuICogZWRpdG9yIGJ5IHdpbmRvd0lkL2VkaXRvcklkLCB3aGljaCB3b3VsZCBsZWFkIHRvXG4gKiBtdWx0aXBsZSB0cmlnZ2VycyBpZiBuZXcgXCJzZXJ2ZXJcIiB3b3VsZCBiZSBjcmVhdGVkIGZvciBldmVyeSBuZXdcbiAqIHByZXZpZXcgaW5zdGFuY2U7XG4gKiBXZWlyZCBkZWZlcnJlZCBkaXNwb3NhbCBpcyBoZXJlIGJlY2F1c2UgbmV3LXdpbmRvdyBleGVjdXRlZCBvblxuICogTWFya2Rvd25QcmV2aWV3Vmlld0VkaXRvclJlbW90ZSB3aWxsIGZpcnN0IGRlc3Ryb3kgdGhlIGN1cnJlbnRcbiAqIGluc3RhbmNlLCBhbmQgb25seSB0aGVuLCBhZnRlciBhIG5ldyBBdG9tIHdpbmRvdyBpbml0aWFsaXplcyxcbiAqIHdpbGwgY3JlYXRlIGEgbmV3IG9uZS4gV2hpY2ggbWlnaHQgZWFzaWx5IHRha2UgdGVucyBvZiBzZWNvbmRzLlxuICogV2hhdCBtYWtlcyB0aGlzIGV2ZW4gbW9yZSBjb21wbGljYXRlZCwgdGhlcmUgaXMgbm8gc2FuZSB3YXkgdG9cbiAqIGNyZWF0ZSBhIG5ldyBpbnN0YW5jZSBvZiBSZW1vdGVFZGl0b3JTZXJ2ZXIgcmVtb3RlbHk7IGhlbmNlLFxuICogaXQgd2FpdHMganVzdCBpbiBjYXNlIG5ldyBjbGllbnRzIGFwcGVhciBiZWZvcmUgZGlzcG9zaW5nIG9mIGl0c2VsZi5cbiAqL1xuXG5leHBvcnQgY2xhc3MgUmVtb3RlRWRpdG9yU2VydmVyIHtcbiAgcHJpdmF0ZSBzdGF0aWMgZWRpdG9yTWFwID0gbmV3IFdlYWtNYXA8VGV4dEVkaXRvciwgUmVtb3RlRWRpdG9yU2VydmVyPigpXG4gIHByaXZhdGUgcmVhZG9ubHkgZGlzcG9zYWJsZXMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpXG4gIHByaXZhdGUgcmVhZG9ubHkgd2luZG93SWQgPSByZW1vdGUuZ2V0Q3VycmVudFdpbmRvdygpLmlkXG4gIHByaXZhdGUgcmVhZG9ubHkgZGVzdHJveVRpbWVvdXRMZW5ndGggPSA2MDAwMFxuICBwcml2YXRlIHVzYWdlQ291bnRlciA9IDBcbiAgcHJpdmF0ZSBkZXN0cm95VGltZW91dDogbnVtYmVyIHwgdW5kZWZpbmVkXG4gIHByaXZhdGUgZXZlbnRIYW5kbGVycyA9IHtcbiAgICBzY3JvbGxUb0J1ZmZlclJhbmdlOiAoW21pbiwgbWF4XTogW251bWJlciwgbnVtYmVyXSkgPT4ge1xuICAgICAgaWYgKG1pbiA9PT0gMCkge1xuICAgICAgICB0aGlzLmVkaXRvci5zY3JvbGxUb0J1ZmZlclBvc2l0aW9uKFttaW4sIDBdKVxuICAgICAgfSBlbHNlIGlmIChtYXggPj0gdGhpcy5lZGl0b3IuZ2V0TGFzdEJ1ZmZlclJvdygpIC0gMSkge1xuICAgICAgICB0aGlzLmVkaXRvci5zY3JvbGxUb0J1ZmZlclBvc2l0aW9uKFttYXgsIDBdKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcmFuZ2UgPSBSYW5nZS5mcm9tT2JqZWN0KFtbbWluLCAwXSwgW21heCwgMF1dKVxuICAgICAgICB0aGlzLmVkaXRvci5zY3JvbGxUb1NjcmVlblJhbmdlKFxuICAgICAgICAgIHRoaXMuZWRpdG9yLnNjcmVlblJhbmdlRm9yQnVmZmVyUmFuZ2UocmFuZ2UpLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNlbnRlcjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgKVxuICAgICAgfVxuICAgIH0sXG4gICAgZGVzdHJveTogKCkgPT4ge1xuICAgICAgdGhpcy51c2FnZUNvdW50ZXIgLT0gMVxuICAgICAgaWYgKHRoaXMudXNhZ2VDb3VudGVyIDw9IDApIHtcbiAgICAgICAgdGhpcy5yZXNldFRpbWVvdXQoKVxuICAgICAgICB0aGlzLmRlc3Ryb3lUaW1lb3V0ID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMuZGVzdHJveSgpXG4gICAgICAgIH0sIHRoaXMuZGVzdHJveVRpbWVvdXRMZW5ndGgpXG4gICAgICB9XG4gICAgfSxcbiAgICBpbml0OiAoKSA9PiB7XG4gICAgICB0aGlzLnVzYWdlQ291bnRlciArPSAxXG4gICAgICB0aGlzLnJlc2V0VGltZW91dCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICBwYXRoOiB0aGlzLmVkaXRvci5nZXRQYXRoKCksXG4gICAgICAgIHRpdGxlOiB0aGlzLmVkaXRvci5nZXRUaXRsZSgpLFxuICAgICAgICBncmFtbWFyOiB0aGlzLmVkaXRvci5nZXRHcmFtbWFyKCkuc2NvcGVOYW1lLFxuICAgICAgICB0ZXh0OiB0aGlzLmVkaXRvci5nZXRUZXh0KCksXG4gICAgICB9XG4gICAgfSxcbiAgICBvcGVuU291cmNlOiAocm93PzogbnVtYmVyKSA9PiB7XG4gICAgICBpZiAocm93ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5lZGl0b3Iuc2V0Q3Vyc29yQnVmZmVyUG9zaXRpb24oW3JvdywgMF0pXG4gICAgICB9XG4gICAgICByZW1vdGUuZ2V0Q3VycmVudFdpbmRvdygpLmZvY3VzKClcbiAgICAgIGNvbnN0IHBhbmUgPSBhdG9tLndvcmtzcGFjZS5wYW5lRm9ySXRlbSh0aGlzLmVkaXRvcilcbiAgICAgIGlmICghcGFuZSkgcmV0dXJuXG4gICAgICBwYW5lLmFjdGl2YXRlSXRlbSh0aGlzLmVkaXRvcilcbiAgICAgIHBhbmUuYWN0aXZhdGUoKVxuICAgIH0sXG4gIH1cblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgZWRpdG9yOiBUZXh0RWRpdG9yKSB7XG4gICAgdGhpcy5kaXNwb3NhYmxlcy5hZGQoXG4gICAgICBuZXcgUmVxdWVzdEhhbmRsZXIodGhpcy53aW5kb3dJZCwgZWRpdG9yLmlkLCB0aGlzLmV2ZW50SGFuZGxlcnMpLFxuICAgIClcbiAgICB0aGlzLmhhbmRsZUVkaXRvckV2ZW50cygpXG4gIH1cblxuICBwdWJsaWMgc3RhdGljIGNyZWF0ZShlZGl0b3I6IFRleHRFZGl0b3IpIHtcbiAgICBjb25zdCByZXMgPSBSZW1vdGVFZGl0b3JTZXJ2ZXIuZWRpdG9yTWFwLmdldChlZGl0b3IpXG4gICAgaWYgKHJlcykgcmV0dXJuIHJlc1xuICAgIGNvbnN0IG5ld1JlcyA9IG5ldyBSZW1vdGVFZGl0b3JTZXJ2ZXIoZWRpdG9yKVxuICAgIFJlbW90ZUVkaXRvclNlcnZlci5lZGl0b3JNYXAuc2V0KGVkaXRvciwgbmV3UmVzKVxuICAgIHJldHVybiBuZXdSZXNcbiAgfVxuXG4gIHByaXZhdGUgZGVzdHJveSgpIHtcbiAgICBSZW1vdGVFZGl0b3JTZXJ2ZXIuZWRpdG9yTWFwLmRlbGV0ZSh0aGlzLmVkaXRvcilcbiAgICB0aGlzLmRpc3Bvc2FibGVzLmRpc3Bvc2UoKVxuICB9XG5cbiAgcHJpdmF0ZSByZXNldFRpbWVvdXQoKSB7XG4gICAgaWYgKHRoaXMuZGVzdHJveVRpbWVvdXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLmRlc3Ryb3lUaW1lb3V0KVxuICAgICAgdGhpcy5kZXN0cm95VGltZW91dCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgaGFuZGxlRWRpdG9yRXZlbnRzKCkge1xuICAgIHRoaXMuZGlzcG9zYWJsZXMuYWRkKFxuICAgICAgdGhpcy5lZGl0b3IuZ2V0QnVmZmVyKCkub25EaWRTdG9wQ2hhbmdpbmcoKCkgPT4ge1xuICAgICAgICBpZiAoYXRvbUNvbmZpZygpLnByZXZpZXdDb25maWcubGl2ZVVwZGF0ZSkge1xuICAgICAgICAgIHRoaXMuZW1pdCgnY2hhbmdlVGV4dCcsIHRoaXMuZWRpdG9yLmdldFRleHQoKSlcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXRvbUNvbmZpZygpLnN5bmNDb25maWcuc3luY1ByZXZpZXdPbkNoYW5nZSkge1xuICAgICAgICAgIHRoaXMuZW1pdCgnc3luY1ByZXZpZXcnLCB7XG4gICAgICAgICAgICBwb3M6IHRoaXMuZWRpdG9yLmdldEN1cnNvckJ1ZmZlclBvc2l0aW9uKCkucm93LFxuICAgICAgICAgICAgZmxhc2g6IGZhbHNlLFxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgdGhpcy5lZGl0b3Iub25EaWRDaGFuZ2VQYXRoKCgpID0+IHtcbiAgICAgICAgdGhpcy5lbWl0KCdjaGFuZ2VQYXRoJywge1xuICAgICAgICAgIHBhdGg6IHRoaXMuZWRpdG9yLmdldFBhdGgoKSxcbiAgICAgICAgICB0aXRsZTogdGhpcy5lZGl0b3IuZ2V0VGl0bGUoKSxcbiAgICAgICAgfSlcbiAgICAgIH0pLFxuICAgICAgdGhpcy5lZGl0b3Iub25EaWRDaGFuZ2VHcmFtbWFyKChncmFtbWFyKSA9PiB7XG4gICAgICAgIHRoaXMuZW1pdCgnY2hhbmdlR3JhbW1hcicsIGdyYW1tYXIuc2NvcGVOYW1lKVxuICAgICAgfSksXG4gICAgICB0aGlzLmVkaXRvci5vbkRpZERlc3Ryb3koKCkgPT4ge1xuICAgICAgICB0aGlzLmRlc3Ryb3koKVxuICAgICAgICBpZiAoYXRvbUNvbmZpZygpLnByZXZpZXdDb25maWcuY2xvc2VQcmV2aWV3V2l0aEVkaXRvcikge1xuICAgICAgICAgIHRoaXMuZW1pdCgnZGVzdHJveScsIHVuZGVmaW5lZClcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICB0aGlzLmVkaXRvci5nZXRCdWZmZXIoKS5vbkRpZFNhdmUoKCkgPT4ge1xuICAgICAgICBpZiAoIWF0b21Db25maWcoKS5wcmV2aWV3Q29uZmlnLmxpdmVVcGRhdGUpIHtcbiAgICAgICAgICB0aGlzLmVtaXQoJ2NoYW5nZVRleHQnLCB0aGlzLmVkaXRvci5nZXRUZXh0KCkpXG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgdGhpcy5lZGl0b3IuZ2V0QnVmZmVyKCkub25EaWRSZWxvYWQoKCkgPT4ge1xuICAgICAgICBpZiAoIWF0b21Db25maWcoKS5wcmV2aWV3Q29uZmlnLmxpdmVVcGRhdGUpIHtcbiAgICAgICAgICB0aGlzLmVtaXQoJ2NoYW5nZVRleHQnLCB0aGlzLmVkaXRvci5nZXRUZXh0KCkpXG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgYXRvbS52aWV3cy5nZXRWaWV3KHRoaXMuZWRpdG9yKS5vbkRpZENoYW5nZVNjcm9sbFRvcCgoKSA9PiB7XG4gICAgICAgIGlmICghc2hvdWxkU2Nyb2xsU3luYygnZWRpdG9yJykpIHJldHVyblxuICAgICAgICBjb25zdCBbZmlyc3QsIGxhc3RdID0gdGhpcy5lZGl0b3IuZ2V0VmlzaWJsZVJvd1JhbmdlKClcbiAgICAgICAgY29uc3QgZmlyc3RMaW5lID0gdGhpcy5lZGl0b3IuYnVmZmVyUm93Rm9yU2NyZWVuUm93KGZpcnN0KVxuICAgICAgICBjb25zdCBsYXN0TGluZSA9IHRoaXMuZWRpdG9yLmJ1ZmZlclJvd0ZvclNjcmVlblJvdyhsYXN0KVxuICAgICAgICB0aGlzLmVtaXQoJ3Njcm9sbFN5bmMnLCBbZmlyc3RMaW5lLCBsYXN0TGluZV0pXG4gICAgICB9KSxcbiAgICAgIGF0b20uY29tbWFuZHMuYWRkKGF0b20udmlld3MuZ2V0Vmlldyh0aGlzLmVkaXRvciksIHtcbiAgICAgICAgJ21hcmtkb3duLXByZXZpZXctcGx1czpzeW5jLXByZXZpZXcnOiAoKSA9PiB7XG4gICAgICAgICAgdGhpcy5lbWl0KCdzeW5jUHJldmlldycsIHtcbiAgICAgICAgICAgIHBvczogdGhpcy5lZGl0b3IuZ2V0Q3Vyc29yQnVmZmVyUG9zaXRpb24oKS5yb3csXG4gICAgICAgICAgICBmbGFzaDogdHJ1ZSxcbiAgICAgICAgICB9KVxuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgKVxuICB9XG5cbiAgcHJpdmF0ZSBlbWl0PFQgZXh0ZW5kcyBrZXlvZiBJUENFdmVudHM+KGV2ZW50OiBULCBhcmc6IElQQ0V2ZW50c1tUXSkge1xuICAgIHJlbW90ZS5pcGNNYWluLmVtaXQoJ21hcmtkb3duLXByZXZpZXctcGx1czplZGl0b3ItZXZlbnQnLCB7XG4gICAgICBlZGl0b3JJZDogdGhpcy5lZGl0b3IuaWQsXG4gICAgICB3aW5kb3dJZDogdGhpcy53aW5kb3dJZCxcbiAgICAgIGV2ZW50LFxuICAgICAgYXJnLFxuICAgIH0pXG4gIH1cbn1cbiJdfQ==