// src/wasi/abi.ts
var WASIAbi = class _WASIAbi {
  /**
   * No error occurred. System call completed successfully.
   */
  static WASI_ESUCCESS = 0;
  /**
   * Bad file descriptor.
   */
  static WASI_ERRNO_BADF = 8;
  static WASI_ERRNO_ISDIR = 31;
  static WASI_ERRNO_INVAL = 28;
  static WASI_ERRNO_NOTDIR = 54;
  static WASI_ERRNO_NOENT = 44;
  static WASI_ERRNO_EXIST = 20;
  static WASI_ERRNO_IO = 29;
  /**
   * Function not supported.
   */
  static WASI_ENOSYS = 52;
  /**
   * The clock measuring real time. Time value zero corresponds with 1970-01-01T00:00:00Z.
   */
  static WASI_CLOCK_REALTIME = 0;
  /**
   * The store-wide monotonic clock, which is defined as a clock measuring real time,
   * whose value cannot be adjusted and which cannot have negative clock jumps.
   * The epoch of this clock is undefined. The absolute time value of this clock therefore has no meaning.
   */
  static WASI_CLOCK_MONOTONIC = 1;
  static WASI_FILETYPE_BLOCK_DEVICE = 1;
  /**
   * The file descriptor or file refers to a character device inode.
   */
  static WASI_FILETYPE_CHARACTER_DEVICE = 2;
  static WASI_FILETYPE_DIRECTORY = 3;
  static WASI_FILETYPE_REGULARFILE = 4;
  static IMPORT_FUNCTIONS = [
    "args_get",
    "args_sizes_get",
    "clock_res_get",
    "clock_time_get",
    "environ_get",
    "environ_sizes_get",
    "fd_advise",
    "fd_allocate",
    "fd_close",
    "fd_datasync",
    "fd_fdstat_get",
    "fd_fdstat_set_flags",
    "fd_fdstat_set_rights",
    "fd_filestat_get",
    "fd_filestat_set_size",
    "fd_filestat_set_times",
    "fd_pread",
    "fd_prestat_dir_name",
    "fd_prestat_get",
    "fd_pwrite",
    "fd_read",
    "fd_readdir",
    "fd_renumber",
    "fd_seek",
    "fd_sync",
    "fd_tell",
    "fd_write",
    "path_create_directory",
    "path_filestat_get",
    "path_filestat_set_times",
    "path_link",
    "path_open",
    "path_readlink",
    "path_remove_directory",
    "path_rename",
    "path_symlink",
    "path_unlink_file",
    "poll_oneoff",
    "proc_exit",
    "proc_raise",
    "random_get",
    "sched_yield",
    "sock_accept",
    "sock_recv",
    "sock_send",
    "sock_shutdown"
  ];
  encoder;
  constructor() {
    this.encoder = new TextEncoder();
  }
  writeString(memory, value, offset) {
    const bytes = this.encoder.encode(value);
    const buffer = new Uint8Array(memory.buffer, offset, bytes.length);
    buffer.set(bytes);
    return bytes.length;
  }
  byteLength(value) {
    return this.encoder.encode(value).length;
  }
  static iovec_t = {
    size: 8,
    bufferOffset: 0,
    lengthOffset: 4
  };
  iovViews(memory, iovs, iovsLen) {
    const iovsBuffers = [];
    let iovsOffset = iovs;
    for (let i = 0; i < iovsLen; i++) {
      const offset = memory.getUint32(iovsOffset + _WASIAbi.iovec_t.bufferOffset, true);
      const len = memory.getUint32(iovsOffset + _WASIAbi.iovec_t.lengthOffset, true);
      iovsBuffers.push(new Uint8Array(memory.buffer, offset, len));
      iovsOffset += _WASIAbi.iovec_t.size;
    }
    return iovsBuffers;
  }
  writeFilestat(memory, ptr, filetype) {
    memory.setBigUint64(
      ptr,
      /* dev */
      BigInt(0),
      true
    );
    memory.setBigUint64(
      ptr + 8,
      /* ino */
      BigInt(0),
      true
    );
    memory.setUint8(ptr + 16, filetype);
    memory.setUint32(
      ptr + 24,
      /* nlink */
      0,
      true
    );
    memory.setBigUint64(
      ptr + 32,
      /* size */
      BigInt(0),
      true
    );
    memory.setBigUint64(
      ptr + 40,
      /* atim */
      BigInt(0),
      true
    );
    memory.setBigUint64(
      ptr + 48,
      /* mtim */
      BigInt(0),
      true
    );
  }
  writeFdstat(memory, ptr, filetype, flags) {
    memory.setUint8(ptr, filetype);
    memory.setUint16(ptr + 2, flags, true);
    memory.setBigUint64(
      ptr + 8,
      /* rights_base */
      BigInt(0),
      true
    );
    memory.setBigUint64(
      ptr + 16,
      /* rights_inheriting */
      BigInt(0),
      true
    );
  }
};
var WASIProcExit = class {
  constructor(code) {
    this.code = code;
  }
  /** @deprecated Use 'code' instead.
   *  Has been renamed to have loose compatibility
   *  with other implementations **/
  get exitCode() {
    return this.code;
  }
};

// src/wasi/features/fd.ts
var WritableTextProxy = class {
  constructor(handler, outputBuffers) {
    this.handler = handler;
    this.outputBuffers = outputBuffers;
    console.log("[WritableTextProxy] Created");
  }
  decoder = new TextDecoder("utf-8");
  writev(iovs) {
    const totalBufferSize = iovs.reduce((acc, iov) => acc + iov.byteLength, 0);
    let offset = 0;
    const concatBuffer = new Uint8Array(totalBufferSize);
    for (const buffer of iovs) {
      concatBuffer.set(buffer, offset);
      offset += buffer.byteLength;
    }
    if (this.outputBuffers) {
      this.handler(concatBuffer);
    } else {
      this.handler(this.decoder.decode(concatBuffer));
    }
    return concatBuffer.length;
  }
  readv(_iovs) {
    return 0;
  }
  close() {
  }
};
var ReadableTextProxy = class {
  constructor(consume) {
    this.consume = consume;
    console.log("[ReadableTextProxy] Created");
  }
  encoder = new TextEncoder();
  pending = null;
  writev(_iovs) {
    return 0;
  }
  consumePending(pending, requestLength) {
    if (pending.byteLength < requestLength) {
      this.pending = null;
      return pending;
    } else {
      const result = pending.slice(0, requestLength);
      this.pending = pending.slice(requestLength);
      return result;
    }
  }
  readv(iovs) {
    let read = 0;
    for (const buffer of iovs) {
      let remaining = buffer.byteLength;
      if (this.pending) {
        const consumed = this.consumePending(this.pending, remaining);
        buffer.set(consumed, 0);
        remaining -= consumed.byteLength;
        read += consumed.byteLength;
      }
      while (remaining > 0) {
        const newData = this.consume();
        let bytes = newData instanceof Uint8Array ? newData : this.encoder.encode(newData);
        if (bytes.length === 0) break;
        if (bytes.length > remaining) {
          buffer.set(bytes.slice(0, remaining), buffer.byteLength - remaining);
          this.pending = bytes.slice(remaining);
          read += remaining;
          remaining = 0;
        } else {
          buffer.set(bytes, buffer.byteLength - remaining);
          read += bytes.length;
          remaining -= bytes.length;
        }
      }
    }
    return read;
  }
  close() {
  }
};
var MemoryFS = class {
  root;
  preopenPaths = [];
  constructor(preopens) {
    this.root = { type: "dir", entries: {} };
    this.ensureDir("/dev");
    this.setNode("/dev/null", { type: "devnull" });
    if (preopens) {
      for (const dirPath in preopens) {
        this.ensureDir(dirPath);
        this.preopenPaths.push(dirPath);
      }
    }
    if (this.preopenPaths.length === 0) {
      this.ensureDir("/");
      this.preopenPaths.push("/");
    }
  }
  addFile(path, content) {
    let data;
    if (typeof content === "string") {
      data = new TextEncoder().encode(content);
    } else {
      data = content;
    }
    this.createFile(path, data);
  }
  ensureDir(path) {
    const parts = path.split("/").filter((p) => p.length > 0);
    let current = this.root;
    for (const part of parts) {
      if (!current.entries[part]) {
        current.entries[part] = { type: "dir", entries: {} };
      }
      const next = current.entries[part];
      if (next.type !== "dir") throw new Error(`"${part}" is not a directory`);
      current = next;
    }
    return current;
  }
  setNode(path, node) {
    const parts = path.split("/").filter((p) => p.length > 0);
    if (parts.length === 0) {
      this.root = node;
      return;
    }
    const fileName = parts.pop();
    const dir = this.ensureDir("/" + parts.join("/"));
    dir.entries[fileName] = node;
  }
  createFile(path, content) {
    const fileNode = { type: "file", content };
    this.setNode(path, fileNode);
    return fileNode;
  }
  lookup(path) {
    if (path === "/") return this.root;
    const parts = path.split("/").filter((p) => p.length > 0);
    let current = this.root;
    for (const part of parts) {
      if (current.type !== "dir") return null;
      current = current.entries[part];
      if (!current) return null;
    }
    return current;
  }
  resolve(dir, relativePath) {
    const parts = relativePath.split("/").filter((p) => p.length > 0);
    let current = dir;
    for (const part of parts) {
      if (part === ".") continue;
      if (part === "..") {
        current = this.root;
        continue;
      }
      if (current.type !== "dir") return null;
      current = current.entries[part];
      if (!current) return null;
    }
    return current;
  }
  createFileIn(dir, relativePath) {
    const parts = relativePath.split("/").filter((p) => p.length > 0);
    const fileName = parts.pop();
    let current = dir;
    for (const part of parts) {
      if (!current.entries[part]) {
        current.entries[part] = { type: "dir", entries: {} };
      }
      current = current.entries[part];
      if (current.type !== "dir") throw new Error(`"${part}" is not a directory`);
    }
    const fileNode = { type: "file", content: new Uint8Array(0) };
    current.entries[fileName] = fileNode;
    return fileNode;
  }
  getDevNull() {
    const node = this.lookup("/dev/null");
    if (!node) throw new Error("/dev/null not found");
    return node;
  }
  getPreopenPaths() {
    return this.preopenPaths;
  }
};
function useStdioAndFS(options = {}) {
  return (wasiOptions, abi, memoryView) => {
    console.log("[useStdioAndFS] Initializing");
    const stdioFDs = [
      new ReadableTextProxy(options.stdin || (() => "")),
      new WritableTextProxy(options.stdout || console.log, options.outputBuffers || false),
      new WritableTextProxy(options.stderr || console.error, options.outputBuffers || false)
    ];
    const fs = options.memFs || new MemoryFS(options.preopens);
    const fsFDs = {};
    let nextFd = 3;
    for (const preopenPath of fs.getPreopenPaths()) {
      const node = fs.lookup(preopenPath);
      if (node && node.type === "dir") {
        fsFDs[nextFd] = {
          node,
          position: 0,
          isPreopen: true,
          preopenPath,
          path: preopenPath,
          fd: nextFd
        };
        console.log("[useStdioAndFS] Preopened FD", nextFd, "->", preopenPath);
        nextFd++;
      }
    }
    function getFdByPath(guestPath) {
      for (const fd in fsFDs) {
        if (fsFDs[fd].path === guestPath) return fsFDs[fd];
      }
      return void 0;
    }
    function getFD(fd) {
      if (fd < 3) return { kind: "stdio", entry: stdioFDs[fd] };
      if (fsFDs[fd]) return { kind: "fs", openFile: fsFDs[fd] };
      return void 0;
    }
    function getFSEntry(fd) {
      return fsFDs[fd];
    }
    return {
      fd_read: async (fd, iovs, iovsLen, nread) => {
        console.log("[fd_read] Reading from FD", fd);
        const view = memoryView();
        const iovViews = abi.iovViews(view, iovs, iovsLen);
        const entry = getFD(fd);
        if (!entry) {
          console.log("[fd_read] Bad file descriptor");
          return WASIAbi.WASI_ERRNO_BADF;
        }
        if (entry.kind === "stdio") {
          console.log("[fd_read] Reading from STDIO");
          const bytesRead = entry.entry.readv(iovViews);
          view.setUint32(nread, bytesRead, true);
          return WASIAbi.WASI_ESUCCESS;
        }
        if (entry.openFile.node.type === "dir") {
          return WASIAbi.WASI_ERRNO_ISDIR;
        }
        if (entry.openFile.node.type === "devnull") {
          view.setUint32(nread, 0, true);
          return WASIAbi.WASI_ESUCCESS;
        }
        const fileNode = entry.openFile.node;
        let totalRead = 0;
        if (fileNode.content instanceof Blob) {
          console.log("[fd_read] Reading from Blob");
          const blob = fileNode.content;
          for (const buf of iovViews) {
            console.log("[fd_read] Position:", entry.openFile.position, "Size:", blob.size);
            if (entry.openFile.position >= blob.size) break;
            const bytesToRead = Math.min(buf.byteLength, blob.size - entry.openFile.position);
            console.log("[fd_read] Reading", bytesToRead, "bytes from", entry.openFile.path);
            if (bytesToRead <= 0) break;
            const slice = blob.slice(entry.openFile.position, entry.openFile.position + bytesToRead);
            const arrayBuffer = await slice.arrayBuffer();
            console.log("[fd_read] Read", arrayBuffer.byteLength, "bytes from", entry.openFile.path);
            const chunk = new Uint8Array(arrayBuffer);
            buf.set(chunk);
            totalRead += chunk.byteLength;
            entry.openFile.position += chunk.byteLength;
          }
        } else {
          console.log("[fd_read] Reading from Uint8Array");
          const data = fileNode.content;
          const available = data.byteLength - entry.openFile.position;
          if (available <= 0) {
            view.setUint32(nread, 0, true);
            return WASIAbi.WASI_ESUCCESS;
          }
          for (const buf of iovViews) {
            if (totalRead >= available) break;
            const bytesToRead = Math.min(buf.byteLength, available - totalRead);
            if (bytesToRead <= 0) break;
            const sourceStart = entry.openFile.position + totalRead;
            const chunk = data.subarray(sourceStart, sourceStart + bytesToRead);
            buf.set(chunk);
            totalRead += bytesToRead;
          }
          entry.openFile.position += totalRead;
        }
        view.setUint32(nread, totalRead, true);
        console.log("[fd_read] Read", totalRead, "bytes from", entry.openFile.path);
        return WASIAbi.WASI_ESUCCESS;
      },
      fd_write: (fd, iovs, iovsLen, nwritten) => {
        const view = memoryView();
        const iovViews = abi.iovViews(view, iovs, iovsLen);
        const entry = getFD(fd);
        if (!entry) return WASIAbi.WASI_ERRNO_BADF;
        let totalWritten = 0;
        if (entry.kind === "stdio") {
          const bytesWritten = entry.entry.writev(iovViews);
          view.setUint32(nwritten, bytesWritten, true);
          return WASIAbi.WASI_ESUCCESS;
        } else {
          if (entry.openFile.node.type === "dir") return WASIAbi.WASI_ERRNO_ISDIR;
          if (entry.openFile.node.type === "devnull") {
            const total = iovViews.reduce((acc, buf) => acc + buf.byteLength, 0);
            view.setUint32(nwritten, total, true);
            return WASIAbi.WASI_ESUCCESS;
          }
          const fileNode = entry.openFile.node;
          let pos = entry.openFile.position;
          const dataToWrite = iovViews.reduce((acc, buf) => acc + buf.byteLength, 0);
          const requiredLength = pos + dataToWrite;
          let newContent;
          if (fileNode.content instanceof Blob) {
            return WASIAbi.WASI_ERRNO_INVAL;
          }
          if (requiredLength > fileNode.content.byteLength) {
            newContent = new Uint8Array(requiredLength);
            newContent.set(fileNode.content, 0);
          } else {
            newContent = fileNode.content;
          }
          for (const buf of iovViews) {
            newContent.set(buf, pos);
            pos += buf.byteLength;
            totalWritten += buf.byteLength;
          }
          fileNode.content = newContent;
          entry.openFile.position = pos;
          view.setUint32(nwritten, totalWritten, true);
          return WASIAbi.WASI_ESUCCESS;
        }
      },
      fd_close: (fd) => {
        if (fd < 3) {
          stdioFDs[fd].close();
          return WASIAbi.WASI_ESUCCESS;
        } else {
          if (fsFDs[fd] === void 0) return WASIAbi.WASI_ERRNO_BADF;
          delete fsFDs[fd];
          return WASIAbi.WASI_ESUCCESS;
        }
      },
      fd_seek: (fd, offset, whence, newOffset) => {
        const view = memoryView();
        if (fd < 3) return WASIAbi.WASI_ERRNO_BADF;
        const openFile = getFSEntry(fd);
        if (!openFile || openFile.node.type !== "file") return WASIAbi.WASI_ERRNO_BADF;
        let pos = openFile.position;
        const fileLength = openFile.node.content instanceof Blob ? openFile.node.content.size : openFile.node.content.byteLength;
        switch (whence) {
          case 0:
            pos = Number(offset);
            break;
          case 1:
            pos = pos + Number(offset);
            break;
          case 2:
            pos = fileLength + Number(offset);
            break;
          default:
            return WASIAbi.WASI_ERRNO_INVAL;
        }
        if (pos < 0) pos = 0;
        openFile.position = pos;
        view.setUint32(newOffset, pos, true);
        return WASIAbi.WASI_ESUCCESS;
      },
      fd_tell: (fd, offset_ptr) => {
        const view = memoryView();
        if (fd < 3) return WASIAbi.WASI_ERRNO_BADF;
        const openFile = getFSEntry(fd);
        if (!openFile) return WASIAbi.WASI_ERRNO_BADF;
        view.setBigUint64(offset_ptr, BigInt(openFile.position), true);
        return WASIAbi.WASI_ESUCCESS;
      },
      fd_fdstat_get: (fd, buf) => {
        const view = memoryView();
        const entry = getFD(fd);
        if (!entry) return WASIAbi.WASI_ERRNO_BADF;
        let filetype;
        if (entry.kind === "stdio") {
          filetype = WASIAbi.WASI_FILETYPE_CHARACTER_DEVICE;
        } else {
          filetype = entry.openFile.node.type === "dir" ? WASIAbi.WASI_FILETYPE_DIRECTORY : entry.openFile.node.type === "devnull" ? WASIAbi.WASI_FILETYPE_CHARACTER_DEVICE : WASIAbi.WASI_FILETYPE_REGULARFILE;
        }
        abi.writeFdstat(view, buf, filetype, 0);
        return WASIAbi.WASI_ESUCCESS;
      },
      fd_filestat_get: (fd, buf) => {
        const view = memoryView();
        const entry = getFD(fd);
        if (!entry) return WASIAbi.WASI_ERRNO_BADF;
        let filetype;
        let size = 0;
        if (entry.kind === "stdio") {
          filetype = WASIAbi.WASI_FILETYPE_CHARACTER_DEVICE;
        } else {
          if (entry.openFile.node.type === "dir") {
            filetype = WASIAbi.WASI_FILETYPE_DIRECTORY;
          } else if (entry.openFile.node.type === "devnull") {
            filetype = WASIAbi.WASI_FILETYPE_CHARACTER_DEVICE;
          } else {
            filetype = WASIAbi.WASI_FILETYPE_REGULARFILE;
            size = entry.openFile.node.content instanceof Blob ? entry.openFile.node.content.size : entry.openFile.node.content.byteLength;
          }
        }
        abi.writeFilestat(view, buf, filetype);
        view.setBigUint64(buf + 32, BigInt(size), true);
        return WASIAbi.WASI_ESUCCESS;
      },
      fd_prestat_get: (fd, buf) => {
        const view = memoryView();
        if (fd < 3) return WASIAbi.WASI_ERRNO_BADF;
        const openFile = getFSEntry(fd);
        if (!openFile || !openFile.isPreopen) return WASIAbi.WASI_ERRNO_BADF;
        view.setUint8(buf, 0);
        const pathStr = openFile.preopenPath || "";
        view.setUint32(buf + 4, pathStr.length, true);
        return WASIAbi.WASI_ESUCCESS;
      },
      fd_prestat_dir_name: (fd, pathPtr, pathLen) => {
        if (fd < 3) return WASIAbi.WASI_ERRNO_BADF;
        const openFile = getFSEntry(fd);
        if (!openFile || !openFile.isPreopen) return WASIAbi.WASI_ERRNO_BADF;
        const pathStr = openFile.preopenPath || "";
        if (pathStr.length !== pathLen) return WASIAbi.WASI_ERRNO_INVAL;
        const view = memoryView();
        for (let i = 0; i < pathStr.length; i++) {
          view.setUint8(pathPtr + i, pathStr.charCodeAt(i));
        }
        return WASIAbi.WASI_ESUCCESS;
      },
      // proc_exit: minimal implementation
      proc_exit: (exit_code) => {
        console.log("[proc_exit] Exiting with code:", exit_code);
        throw new Error("proc_exit called with code: " + exit_code);
      },
      // fd_open (legacy interface)
      fd_open: (dirfd, pathPtr, pathLen, oflags, _fs_rights_base, _fs_rights_inheriting, _fdflags, opened_fd) => {
        const view = memoryView();
        let path = "";
        for (let i = 0; i < pathLen; i++) {
          path += String.fromCharCode(view.getUint8(pathPtr + i));
        }
        if (dirfd < 3) return WASIAbi.WASI_ERRNO_NOTDIR;
        const dirEntry = getFSEntry(dirfd);
        if (!dirEntry || dirEntry.node.type !== "dir") return WASIAbi.WASI_ERRNO_NOTDIR;
        const guestPath = (dirEntry.path.endsWith("/") ? dirEntry.path : dirEntry.path + "/") + path;
        const existing = getFdByPath(guestPath);
        if (existing) {
          view.setUint32(opened_fd, existing.fd, true);
          return WASIAbi.WASI_ESUCCESS;
        }
        let target = fs.resolve(dirEntry.node, path);
        const O_CREAT = 1 << 0, O_EXCL = 1 << 1, O_TRUNC = 1 << 2;
        if (target) {
          if (oflags & O_EXCL) return WASIAbi.WASI_ERRNO_EXIST;
          if (oflags & O_TRUNC) {
            if (target.type !== "file") return WASIAbi.WASI_ERRNO_INVAL;
            target.content = new Uint8Array(0);
          }
        } else {
          if (!(oflags & O_CREAT)) return WASIAbi.WASI_ERRNO_NOENT;
          target = fs.createFileIn(dirEntry.node, path);
        }
        fsFDs[nextFd] = {
          node: target,
          position: 0,
          isPreopen: false,
          path: guestPath,
          fd: nextFd
        };
        view.setUint32(opened_fd, nextFd, true);
        nextFd++;
        return WASIAbi.WASI_ESUCCESS;
      },
      // path_open implementation
      path_open: (dirfd, _dirflags, pathPtr, pathLen, oflags, _fs_rights_base, _fs_rights_inheriting, _fdflags, opened_fd) => {
        const view = memoryView();
        let path = "";
        for (let i = 0; i < pathLen; i++) {
          path += String.fromCharCode(view.getUint8(pathPtr + i));
        }
        if (dirfd < 3) return WASIAbi.WASI_ERRNO_NOTDIR;
        const dirEntry = getFSEntry(dirfd);
        if (!dirEntry || dirEntry.node.type !== "dir") return WASIAbi.WASI_ERRNO_NOTDIR;
        const guestPath = (dirEntry.path.endsWith("/") ? dirEntry.path : dirEntry.path + "/") + path;
        const existing = getFdByPath(guestPath);
        if (existing) {
          view.setUint32(opened_fd, existing.fd, true);
          return WASIAbi.WASI_ESUCCESS;
        }
        let target = fs.resolve(dirEntry.node, path);
        const O_CREAT = 1 << 0, O_EXCL = 1 << 1, O_TRUNC = 1 << 2;
        if (target) {
          if (oflags & O_EXCL) return WASIAbi.WASI_ERRNO_EXIST;
          if (oflags & O_TRUNC) {
            if (target.type !== "file") return WASIAbi.WASI_ERRNO_INVAL;
            target.content = new Uint8Array(0);
          }
        } else {
          if (!(oflags & O_CREAT)) return WASIAbi.WASI_ERRNO_NOENT;
          target = fs.createFileIn(dirEntry.node, path);
        }
        fsFDs[nextFd] = {
          node: target,
          position: 0,
          isPreopen: false,
          path: guestPath,
          fd: nextFd
        };
        view.setUint32(opened_fd, nextFd, true);
        nextFd++;
        return WASIAbi.WASI_ESUCCESS;
      },
      path_filestat_get: (fd, flags, pathPtr, pathLen, buf) => {
        const view = memoryView();
        let guestRelPath = "";
        for (let i = 0; i < pathLen; i++) {
          guestRelPath += String.fromCharCode(view.getUint8(pathPtr + i));
        }
        const baseEntry = getFD(fd);
        if (!baseEntry) return WASIAbi.WASI_ERRNO_BADF;
        if (baseEntry.kind === "stdio" || baseEntry.openFile.node.type !== "dir") {
          return WASIAbi.WASI_ERRNO_NOTDIR;
        }
        const basePath = baseEntry.openFile.path;
        const fullGuestPath = basePath.endsWith("/") ? basePath + guestRelPath : basePath + "/" + guestRelPath;
        const node = fs.lookup(fullGuestPath);
        if (!node) return WASIAbi.WASI_ERRNO_NOENT;
        let filetype;
        let size = 0;
        if (node.type === "dir") {
          filetype = WASIAbi.WASI_FILETYPE_DIRECTORY;
        } else if (node.type === "devnull") {
          filetype = WASIAbi.WASI_FILETYPE_CHARACTER_DEVICE;
        } else {
          filetype = WASIAbi.WASI_FILETYPE_REGULARFILE;
          const fileNode = node;
          size = fileNode.content instanceof Blob ? fileNode.content.size : fileNode.content.byteLength;
        }
        abi.writeFilestat(view, buf, filetype);
        view.setBigUint64(buf + 32, BigInt(size), true);
        return WASIAbi.WASI_ESUCCESS;
      }
    };
  };
}

// src/wasi/features/args.ts
function useArgs(options, abi, memoryView) {
  const args = options.args || [];
  return {
    args_get: (argv, argvBuf) => {
      let offsetOffset = argv;
      let bufferOffset = argvBuf;
      const view = memoryView();
      for (const arg of args) {
        view.setUint32(offsetOffset, bufferOffset, true);
        offsetOffset += 4;
        bufferOffset += abi.writeString(view, `${arg}\0`, bufferOffset);
      }
      return WASIAbi.WASI_ESUCCESS;
    },
    args_sizes_get: (argc, argvBufSize) => {
      const view = memoryView();
      view.setUint32(argc, args.length, true);
      const bufferSize = args.reduce((acc, arg) => acc + abi.byteLength(arg) + 1, 0);
      view.setUint32(argvBufSize, bufferSize, true);
      return WASIAbi.WASI_ESUCCESS;
    }
  };
}

// src/wasi/features/clock.ts
function useClock(options, abi, memoryView) {
  return {
    clock_res_get: (clockId, resolution) => {
      let resolutionValue;
      switch (clockId) {
        case WASIAbi.WASI_CLOCK_MONOTONIC: {
          resolutionValue = 5e3;
          break;
        }
        case WASIAbi.WASI_CLOCK_REALTIME: {
          resolutionValue = 1e3;
          break;
        }
        default:
          return WASIAbi.WASI_ENOSYS;
      }
      const view = memoryView();
      view.setUint32(resolution, resolutionValue, true);
      return WASIAbi.WASI_ESUCCESS;
    },
    clock_time_get: (clockId, precision, time) => {
      let nowMs = 0;
      switch (clockId) {
        case WASIAbi.WASI_CLOCK_MONOTONIC: {
          nowMs = performance.now();
          break;
        }
        case WASIAbi.WASI_CLOCK_REALTIME: {
          nowMs = Date.now();
          break;
        }
        default:
          return WASIAbi.WASI_ENOSYS;
      }
      const view = memoryView();
      if (BigInt) {
        const msToNs = (ms) => {
          const msInt = Math.trunc(ms);
          const decimal = BigInt(Math.round((ms - msInt) * 1e6));
          const ns = BigInt(msInt) * BigInt(1e6);
          return ns + decimal;
        };
        const now = BigInt(msToNs(nowMs));
        view.setBigUint64(time, now, true);
      } else {
        const now = Date.now() * 1e6;
        view.setUint32(time, now & 65535, true);
        view.setUint32(time + 4, now & 4294901760, true);
      }
      return WASIAbi.WASI_ESUCCESS;
    }
  };
}

// src/wasi/features/environ.ts
function useEnviron(options, abi, memoryView) {
  return {
    environ_get: (environ, environBuf) => {
      let offsetOffset = environ;
      let bufferOffset = environBuf;
      const view = memoryView();
      for (const key in options.env) {
        const value = options.env[key];
        view.setUint32(offsetOffset, bufferOffset, true);
        offsetOffset += 4;
        bufferOffset += abi.writeString(view, `${key}=${value}\0`, bufferOffset);
      }
      return WASIAbi.WASI_ESUCCESS;
    },
    environ_sizes_get: (environ, environBufSize) => {
      const view = memoryView();
      view.setUint32(environ, Object.keys(options.env || {}).length, true);
      view.setUint32(
        environBufSize,
        Object.entries(options.env || {}).reduce(
          (acc, [key, value]) => {
            return acc + abi.byteLength(key) + 1 + abi.byteLength(value) + 1;
          },
          0
        ),
        true
      );
      return WASIAbi.WASI_ESUCCESS;
    }
  };
}

// src/wasi/features/random.ts
function useRandom(useOptions = {}) {
  return (options, abi, memoryView) => {
    return {
      random_get: (bufferOffset, length) => {
        const view = memoryView();
        const buffer = new Uint8Array(view.buffer, bufferOffset, length);
        crypto.getRandomValues(buffer);
        return WASIAbi.WASI_ESUCCESS;
      }
    };
  };
}

// src/wasi/index.ts
var WASI = class {
  /**
   * `wasiImport` is an object that implements the WASI system call API. This object
   * should be passed as the `wasi_snapshot_preview1` import during the instantiation
   * of a [`WebAssembly.Instance`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/Instance).
   */
  wasiImport;
  instance = null;
  isStarted = false;
  constructor(options) {
    this.wasiImport = {};
    const abi = new WASIAbi();
    if (options && options.features) {
      for (const useFeature of options.features) {
        const imports = useFeature(options, abi, this.view.bind(this));
        this.wasiImport = { ...this.wasiImport, ...imports };
      }
    }
    for (const key of WASIAbi.IMPORT_FUNCTIONS) {
      if (!(key in this.wasiImport)) {
        this.wasiImport[key] = () => {
          console.log("trying to call unimpleted function", key);
          return WASIAbi.WASI_ENOSYS;
        };
      }
    }
  }
  view() {
    if (!this.instance) {
      throw new Error("wasi.start() or wasi.initialize() has not been called");
    }
    if (!this.instance.exports.memory) {
      throw new Error("instance.exports.memory is undefined");
    }
    if (!(this.instance.exports.memory instanceof WebAssembly.Memory)) {
      throw new Error("instance.exports.memory is not a WebAssembly.Memory");
    }
    return new DataView(this.instance.exports.memory.buffer);
  }
  /**
   * Attempt to begin execution of `instance` as a WASI command by invoking its`_start()` export. If `instance` does not contain a `_start()` export, or if`instance` contains an `_initialize()`
   * export, then an exception is thrown.
   *
   * `start()` requires that `instance` exports a [`WebAssembly.Memory`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/Memory) named`memory`. If
   * `instance` does not have a `memory` export an exception is thrown.
   *
   * If `start()` is called more than once, an exception is thrown.
   */
  async start(instance) {
    if (this.isStarted) {
      throw new Error("wasi.start() or wasi.initialize() has already been called");
    }
    this.isStarted = true;
    this.instance = instance;
    if (!this.instance.exports._start) {
      throw new Error("instance.exports._start is undefined");
    }
    if (typeof this.instance.exports._start !== "function") {
      throw new Error("instance.exports._start is not a function");
    }
    try {
      console.log(this.instance.exports);
      await this.instance.exports._start();
      return WASIAbi.WASI_ESUCCESS;
    } catch (e2) {
      if (e2 instanceof WASIProcExit) {
        return e2.code;
      }
      throw e2;
    }
  }
  /**
   * Attempt to initialize `instance` as a WASI reactor by invoking its`_initialize()` export, if it is present. If `instance` contains a `_start()`export, then an exception is thrown.
   *
   * `initialize()` requires that `instance` exports a [`WebAssembly.Memory`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/Memory) named`memory`.
   * If `instance` does not have a `memory` export an exception is thrown.
   *
   * If `initialize()` is called more than once, an exception is thrown.
   */
  initialize(instance) {
    if (this.isStarted) {
      throw new Error("wasi.start() or wasi.initialize() has already been called");
    }
    this.isStarted = true;
    this.instance = instance;
    if (!this.instance.exports._initialize) {
      throw new Error("instance.exports._initialize is undefined");
    }
    if (typeof this.instance.exports._initialize !== "function") {
      throw new Error("instance.exports._initialize is not a function");
    }
    this.instance.exports._initialize();
  }
};

// node_modules/asyncify-wasm/dist/asyncify.mjs
var t = /* @__PURE__ */ new WeakMap();
function e(t2, e2) {
  return new Proxy(t2, { get: (t3, r2) => e2(t3[r2]) });
}
var r = class {
  constructor() {
    this.value = void 0, this.exports = null;
  }
  getState() {
    return this.exports.asyncify_get_state();
  }
  assertNoneState() {
    let t2 = this.getState();
    if (0 !== t2) throw new Error(`Invalid async state ${t2}, expected 0.`);
  }
  wrapImportFn(t2) {
    return (...e2) => {
      if (2 === this.getState()) return this.exports.asyncify_stop_rewind(), this.value;
      this.assertNoneState();
      let r2 = t2(...e2);
      if (!(s2 = r2) || "object" != typeof s2 && "function" != typeof s2 || "function" != typeof s2.then) return r2;
      var s2;
      this.exports.asyncify_start_unwind(16), this.value = r2;
    };
  }
  wrapModuleImports(t2) {
    return e(t2, (t3) => "function" == typeof t3 ? this.wrapImportFn(t3) : t3);
  }
  wrapImports(t2) {
    if (void 0 !== t2) return e(t2, (t3 = /* @__PURE__ */ Object.create(null)) => this.wrapModuleImports(t3));
  }
  wrapExportFn(e2) {
    let r2 = t.get(e2);
    return void 0 !== r2 || (r2 = async (...t2) => {
      this.assertNoneState();
      let r3 = e2(...t2);
      for (; 1 === this.getState(); ) this.exports.asyncify_stop_unwind(), this.value = await this.value, this.assertNoneState(), this.exports.asyncify_start_rewind(16), r3 = e2();
      return this.assertNoneState(), r3;
    }, t.set(e2, r2)), r2;
  }
  wrapExports(e2) {
    let r2 = /* @__PURE__ */ Object.create(null);
    for (let t2 in e2) {
      let s2 = e2[t2];
      "function" != typeof s2 || t2.startsWith("asyncify_") || (s2 = this.wrapExportFn(s2)), Object.defineProperty(r2, t2, { enumerable: true, value: s2 });
    }
    return t.set(e2, r2), r2;
  }
  init(t2, e2) {
    const { exports: r2 } = t2, n = r2.memory || e2.env && e2.env.memory;
    new Int32Array(n.buffer, 16).set([24, 8388608]), this.exports = this.wrapExports(r2), Object.setPrototypeOf(t2, s.prototype);
  }
};
var s = class extends WebAssembly.Instance {
  constructor(t2, e2) {
    let s2 = new r();
    super(t2, s2.wrapImports(e2)), s2.init(this, e2);
  }
  get exports() {
    return t.get(super.exports);
  }
};
async function a(t2, e2) {
  let s2 = new r(), n = await WebAssembly.instantiateStreaming(t2, s2.wrapImports(e2));
  return s2.init(n.instance, e2), n;
}
Object.defineProperty(s.prototype, "exports", { enumerable: true });

// src/index.ts
function hello(name) {
  return `Hello, ${name}!`;
}
async function runWasmModuleWithFile(file) {
  console.log("Running WASM module with file", file);
  const mem = new MemoryFS({
    "/": true
  });
  mem.addFile(`/${file.name}`, file);
  const wasi = new WASI({
    args: ["example", `/${file.name}`],
    features: [
      useEnviron,
      useArgs,
      useRandom(),
      useClock,
      useStdioAndFS({
        memFs: mem,
        stdout: (str) => {
          console.log(str);
          const outputElem = document.getElementById("output");
          if (outputElem) {
            outputElem.innerHTML += `<p>${str}</p>`;
          }
        },
        stderr: (str) => {
          console.error(str);
          const outputElem = document.getElementById("output");
          if (outputElem) {
            outputElem.innerHTML += `<p style="color:red;">${str}</p>`;
          }
        }
      })
    ]
  });
  const { instance } = await a(fetch("example.wasm"), {
    wasi_snapshot_preview1: wasi.wasiImport
  });
  const exitCode = await wasi.start(instance);
  alert(exitCode);
}
export {
  hello,
  runWasmModuleWithFile
};
//# sourceMappingURL=index.esm.js.map
