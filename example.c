#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "setjmp.h"
#include <unistd.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <errno.h>

#define BUFFER_SIZE 4096

// Define the jump buffer for error handling
jmp_buf error_jmp_buf;

// Error codes
enum ErrorCode
{
    ERROR_FILE_NOT_FOUND = 1,
    ERROR_READ_FAILURE = 2,
    ERROR_MEMORY_ALLOCATION = 3
};


__attribute__((noinline)) char *read_file(const char *path)
{
    int fd = open(path, O_RDONLY);
    if (fd == -1)
    {
#ifdef USE_JMP
        longjmp(error_jmp_buf, ERROR_FILE_NOT_FOUND);
#else
        fprintf(stderr, "Error: Could not open file %s (errno: %d)\n", path, errno);
        return NULL;
#endif
    }

    // Get file size
    struct stat st;
    if (fstat(fd, &st) == -1)
    {
        close(fd);
#ifdef USE_JMP
        longjmp(error_jmp_buf, ERROR_READ_FAILURE);
#else
        fprintf(stderr, "Error: Could not determine file size (errno: %d)\n", errno);
        return NULL;
#endif
    }

    size_t file_size = st.st_size;

    // Allocate memory for file content
    char *buffer = (char *)malloc(file_size + 1);
    if (!buffer)
    {
        close(fd);
#ifdef USE_JMP
        longjmp(error_jmp_buf, ERROR_MEMORY_ALLOCATION);
#else
        fprintf(stderr, "Error: Memory allocation failed\n");
        return NULL;
#endif
    }

    // Read file content using read()
    ssize_t bytes_read = 0;
    size_t total_read = 0;

    while (total_read < file_size)
    {
        bytes_read = read(fd, buffer + total_read, file_size - total_read);

        if (bytes_read == -1)
        {
            // Read error
            free(buffer);
            close(fd);
#ifdef USE_JMP
            longjmp(error_jmp_buf, ERROR_READ_FAILURE);
#else
            fprintf(stderr, "Error: Failed to read file (errno: %d)\n", errno);
            return NULL;
#endif
        }

        if (bytes_read == 0)
        {
            // End of file reached unexpectedly
            break;
        }

        total_read += bytes_read;
    }

    // Null-terminate the string
    buffer[total_read] = '\0';
    close(fd);
    return buffer;
}

// Function to print file contents
__attribute__((noinline)) void print_file_contents(const char *content)
{
    if (content)
    {
        printf("File contents:\n%s\n", content);
    }
    else
    {
        printf("No content to display.\n");
    }
}

__attribute__((noinline)) int real_main(int argc, char *argv[])
{
    if (argc < 2)
    {
        fprintf(stderr, "Usage: %s <file_path>\n", argv[0]);
        return 1;
    }

    const char *file_path = argv[1];
    char *file_content = NULL;

#ifdef USE_JMP
    // Setup error handling with setjmp
    int error_code = setjmp(error_jmp_buf);

    if (error_code == 0)
    {
        // First time through, read the file
        file_content = read_file(file_path);
        // If we get here, reading was successful
        print_file_contents(file_content);
        free(file_content);
    }
    else
    {
        // We got here via longjmp, handle the error
        switch (error_code)
        {
        case ERROR_FILE_NOT_FOUND:
            fprintf(stderr, "Error: File not found or cannot be opened: %s\n", file_path);
            break;
        case ERROR_READ_FAILURE:
            fprintf(stderr, "Error: Failed to read file: %s\n", file_path);
            break;
        case ERROR_MEMORY_ALLOCATION:
            fprintf(stderr, "Error: Memory allocation failed\n");
            break;
        default:
            fprintf(stderr, "Unknown error occurred\n");
        }
        return error_code;
    }
#else
    // Normal error handling
    file_content = read_file(file_path);
    print_file_contents(file_content);
    free(file_content);
#endif

    return 0;
}

int main(int argc, char **argv)
{
#ifdef USE_JMP
    return asyncjmp_rt_start(real_main, argc, argv);
#else
    return real_main(argc, argv);
#endif
}
