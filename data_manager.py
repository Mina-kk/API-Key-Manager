import json
import os
import tkinter as tk
from tkinter import filedialog

import webview


class DataManagerAPI:
    _is_maximized = False
    _saved_rect = None
    _default_width = 550
    _default_height = 700

    def save_file(self, content, default_name="apikey_backup.json"):
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)

        file_path = filedialog.asksaveasfilename(
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
            initialfile=default_name,
            title="导出数据",
        )

        root.destroy()

        if not file_path:
            return False

        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            return True
        except Exception as e:
            print(f"Save error: {e}")
            return False

    def open_file(self):
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)

        file_path = filedialog.askopenfilename(
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
            title="导入数据",
        )

        root.destroy()

        if not file_path:
            return None

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            print(f"Open error: {e}")
            return None

    def minimize(self):
        if webview.windows:
            webview.windows[0].minimize()

    def maximize(self):
        if not webview.windows:
            return

        win = webview.windows[0]
        if self._is_maximized:
            if self._saved_rect:
                x, y, width, height = self._saved_rect
                win.restore()
                win.resize(width, height)
                win.move(x, y)
            else:
                win.restore()
                win.resize(self._default_width, self._default_height)
            self._is_maximized = False
            return

        try:
            self._saved_rect = (win.x, win.y, win.width, win.height)
        except Exception:
            self._saved_rect = None
        win.maximize()
        self._is_maximized = True

    def close(self):
        if webview.windows:
            try:
                webview.windows[0].destroy()
            except Exception:
                pass
        import threading
        threading.Thread(target=lambda: (
            __import__('time').sleep(1),
            __import__('os')._exit(0)
        ), daemon=True).start()

    def drag_win(self, dx, dy):
        if webview.windows:
            try:
                win = webview.windows[0]
                win.move(win.x + int(dx), win.y + int(dy))
            except Exception:
                pass
