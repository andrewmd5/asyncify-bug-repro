#!/bin/bash

# Set WASI SDK path
export WASI_SDK_PATH="/Users/andrew/.wasi-sdk/wasi-sdk-25.0-arm64-macos"
echo "Building WASI.."
echo "WASI SDK path: $WASI_SDK_PATH"

# Define wasic alias to use clang from WASI SDK
wasic="${WASI_SDK_PATH}/bin/clang"

if [ ! -x "$wasic" ]; then
    echo "Error: WASI clang compiler not found at $wasic or not executable"
    exit 1
fi

USE_SETJMP=0
DEBUG_LOG=0

# Parse command line arguments
USE_SETJMP=0
DEBUG_LOG=0

while [[ $# -gt 0 ]]; do
    case $1 in
        --setjmp)
            USE_SETJMP=1
            shift
            ;;
        --debug)
            DEBUG_LOG=1
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--setjmp] [--debug]"
            exit 1
            ;;
    esac
done

# Set debug flag if enabled
DEBUG_FLAG=""
if [ $DEBUG_LOG -eq 1 ]; then
    DEBUG_FLAG="-DASYNCJMP_ENABLE_DEBUG_LOG"
fi

if [ $USE_SETJMP -eq 1 ]; then
    echo "Building with setjmp support..."
    
    # Compile setjmp library components
    $wasic -O3 -c machine.c -o machine.o $DEBUG_FLAG
    $wasic -O3 -c runtime.c -o runtime.o $DEBUG_FLAG
    $wasic -O3 -c setjmp.c -o setjmp.o $DEBUG_FLAG
    $wasic -O3 -c machine_core.S -o machine_core.o $DEBUG_FLAG
    $wasic -O3 -c setjmp_core.S -o setjmp_core.o $DEBUG_FLAG
    
    # Create static library
    "${WASI_SDK_PATH}/bin/llvm-ar" crs libasyncjmp.a \
        machine.o runtime.o setjmp.o \
        machine_core.o setjmp_core.o
    
    # Compile main program with setjmp enabled
    echo "Compiling example.c with setjmp support..."
    $wasic -O3 example.c -o example.wasm -DUSE_JMP -L. -lasyncjmp
    
    # Clean up object files
    rm -f machine.o runtime.o setjmp.o machine_core.o setjmp_core.o
else
    # Compile without setjmp support
    echo "Compiling example.c without setjmp support..."
    $wasic -O3 example.c -o example.wasm
fi

# Check if output file exists
if [ -f "example.wasm" ]; then
    wasm-opt example.wasm -Oz --strip-dwarf --enable-bulk-memory --enable-tail-call --asyncify --pass-arg=asyncify-imports@wasi_snapshot_preview1.fd_read -o  example.wasm
    echo "Build successful!"
    ls -lah example.wasm
    cp example.wasm web/example.wasm
else
    echo "Build failed: output file not found."
    exit 1
fi