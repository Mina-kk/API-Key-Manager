import json
import os
import socket
import sys
import threading
import tkinter as tk
from http.server import HTTPServer, SimpleHTTPRequestHandler
from tkinter import filedialog
from urllib.parse import urlparse

import webview


class APIHandler(SimpleHTTPRequestHandler):
    api_instance = None

    def log_message(self, format, *args):
        pass

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/save-file":
            self._handle_save_file()
        elif parsed.path == "/api/open-file":
            self._handle_open_file()
        elif parsed.path == "/api/persist-data":
            self._handle_persist_data()
        elif parsed.path == "/api/load-persisted-data":
            self._handle_load_persisted_data()
        else:
            self.send_error(404)

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        return self.rfile.read(length).decode("utf-8") if length > 0 else ""

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def _handle_save_file(self):
        body = self._read_body()
        try:
            payload = json.loads(body)
            content = payload.get("content", "")
            default_name = payload.get("default_name", "apikey_backup.json")
        except Exception:
            content = body
            default_name = "apikey_backup.json"
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        path = filedialog.asksaveasfilename(
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
            initialfile=default_name,
            title="导出数据",
        )
        root.destroy()
        if not path:
            self._send_json({"ok": False})
            return
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            self._send_json({"ok": True})
        except Exception as e:
            self._send_json({"ok": False, "error": str(e)})

    def _handle_open_file(self):
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        path = filedialog.askopenfilename(
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
            title="导入数据",
        )
        root.destroy()
        if not path:
            self._send_json({"ok": False})
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            self._send_json({"ok": True, "content": content})
        except Exception as e:
            self._send_json({"ok": False, "error": str(e)})

    def _get_data_path(self):
        if getattr(sys, 'frozen', False):
            base = os.path.dirname(sys.executable)
        else:
            base = os.path.dirname(os.path.abspath(__file__))
        return os.path.join(base, "data", "apikeys.json")

    def _handle_persist_data(self):
        body = self._read_body()
        try:
            payload = json.loads(body)
            data_str = payload.get("data", "")
        except Exception:
            self._send_json({"ok": False, "error": "invalid json"})
            return
        path = self._get_data_path()
        os.makedirs(os.path.dirname(path), exist_ok=True)
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(data_str)
            self._send_json({"ok": True})
        except Exception as e:
            self._send_json({"ok": False, "error": str(e)})

    def _handle_load_persisted_data(self):
        path = self._get_data_path()
        if not os.path.exists(path):
            self._send_json({"ok": True, "data": None})
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            self._send_json({"ok": True, "data": content})
        except Exception as e:
            self._send_json({"ok": False, "error": str(e)})


def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def start_server(port=8765):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base_dir)

    server = HTTPServer(("0.0.0.0", port), APIHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, port


def run_desktop(port=8765):
    from data_manager import DataManagerAPI

    api = DataManagerAPI()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    html_path = "file:///" + os.path.join(base_dir, "index.html").replace("\\", "/")

    window = webview.create_window(
        "API Key Manager",
        html_path,
        width=550,
        height=700,
        min_size=(400, 500),
        frameless=True,
        easy_drag=False,
        js_api=api,
    )

    _closed = [False]

    def _on_close():
        if _closed[0]:
            return
        _closed[0] = True
        try:
            window.destroy()
        except Exception:
            pass

    import ctypes
    from ctypes import wintypes
    ctypes.windll.kernel32.GetLastError.restype = wintypes.DWORD

    kernel32 = ctypes.windll.kernel32
    job = kernel32.CreateJobObjectW(None, None)
    JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000
    JobObjectExtendedLimitInformation = 9

    class IO_COUNTERS(ctypes.Structure):
        _fields_ = [
            ("ReadOperationCount", ctypes.c_uint64),
            ("WriteOperationCount", ctypes.c_uint64),
            ("OtherOperationCount", ctypes.c_uint64),
            ("ReadTransferCount", ctypes.c_uint64),
            ("WriteTransferCount", ctypes.c_uint64),
            ("OtherTransferCount", ctypes.c_uint64),
        ]

    class JOBOBJECT_BASIC_LIMIT_INFORMATION(ctypes.Structure):
        _fields_ = [
            ("PerProcessUserTimeLimit", ctypes.c_int64),
            ("PerJobUserTimeLimit", ctypes.c_int64),
            ("LimitFlags", wintypes.DWORD),
            ("MinimumWorkingSetSize", ctypes.c_size_t),
            ("MaximumWorkingSetSize", ctypes.c_size_t),
            ("ActiveProcessLimit", wintypes.DWORD),
            ("Affinity", ctypes.c_size_t),
            ("PriorityClass", wintypes.DWORD),
            ("SchedulingClass", wintypes.DWORD),
        ]

    class JOBOBJECT_EXTENDED_LIMIT_INFORMATION(ctypes.Structure):
        _fields_ = [
            ("BasicLimitInformation", JOBOBJECT_BASIC_LIMIT_INFORMATION),
            ("IoInfo", IO_COUNTERS),
            ("ProcessMemoryLimit", ctypes.c_size_t),
            ("JobMemoryLimit", ctypes.c_size_t),
            ("PeakProcessMemoryUsed", ctypes.c_size_t),
            ("PeakJobMemoryUsed", ctypes.c_size_t),
        ]

    if job:
        info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION()
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        kernel32.SetInformationJobObject(job, JobObjectExtendedLimitInformation, ctypes.byref(info), ctypes.sizeof(info))
        kernel32.AssignProcessToJobObject(job, kernel32.GetCurrentProcess())

    window.on_close = _on_close
    icon_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Mina.ico")

    def _set_icon():
        try:
            hwnd = ctypes.windll.user32.FindWindowW(None, "API Key Manager")
            if hwnd and os.path.exists(icon_path):
                hicon = ctypes.windll.user32.LoadImageW(None, icon_path, 1, 0, 0, 0x00000010 | 0x00000040)
                if hicon:
                    ctypes.windll.user32.SendMessageW(hwnd, 0x0080, 0, hicon)
                    ctypes.windll.user32.SendMessageW(hwnd, 0x0080, 1, hicon)
        except Exception:
            pass

    window.events.shown += _set_icon

    try:
        webview.start()
    except Exception:
        pass
    finally:
        if job:
            kernel32.CloseHandle(job)


def run_server_only(port=8765):
    local_ip = get_local_ip()
    print(f"\n  API Key Manager 服务器已启动")
    print(f"  ─────────────────────────────────────")
    print(f"  本机访问:  http://localhost:{port}")
    print(f"  手机访问:  http://{local_ip}:{port}")
    print(f"  (请确保手机与电脑在同一 WiFi 网络)")
    print(f"  按 Ctrl+C 停止服务器\n")

    server, _ = start_server(port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
        server.shutdown()
