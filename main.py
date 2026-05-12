import sys
import server


if __name__ == "__main__":
    if "--server" in sys.argv:
        port = 8765
        for i, arg in enumerate(sys.argv):
            if arg == "--port" and i + 1 < len(sys.argv):
                port = int(sys.argv[i + 1])
        server.run_server_only(port)
    else:
        port = 8765
        srv, port = server.start_server(port)
        try:
            server.run_desktop(port)
        except SystemExit:
            pass
        finally:
            try:
                srv.shutdown()
            except Exception:
                pass
