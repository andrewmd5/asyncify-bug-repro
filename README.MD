# WASI setjmp Bug Reproduction

This repo reproduces an issue in the [ruby/wasm](https://github.com/ruby/ruby/tree/master/wasm) setjmp implementation which causes instrumentation to fail when invoking imported async functions (e.g. `wasi.fd_read` using an async web API).

## Building

1. Open the `build.sh` file and replace the path to the WASI SDK with your local path.
2. Build without setjmp:
   ```bash
   ./build.sh
   ```
3. Build with setjmp (reproduces the bug):
   ```bash
   ./build.sh --setjmp
   ```
   Optional: Add `--debug` for setjmp logging.

## Running

Start a web server:
```bash
cd web
http-server -c-1 --mimeTypes '{ "application/wasm": ["wasm"] }'
```

## Reproducing the issue

1. Select any file in the file input
2. Click "Run WASM Module with selected file"
3. Result:
   - Normal build: File contents display correctly
   - With setjmp: Hits an unreachable trap