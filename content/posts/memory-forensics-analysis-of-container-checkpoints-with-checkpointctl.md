---
title: "Memory Forensics analysis of container checkpoints with checkpointctl"
author: "Kouame Behouba Manassé"
date: 2023-10-03T11:25:52+03:00
tags: [
   "CRIU", "Cybersecurity", "Container", "Docker", "Podman", "Checkpoint/Restore", "Golang", "Linux",
]
---


## Introduction

In the field of computer science, forensic analysis, also known as computer forensics, is a specialized domain that focuses on the extraction of evidence from electronic devices and digital data. Forensic analysis goals are to identify, preserve, recover, analyze, and ultimately present factual information and expert opinions about cybercrimes or other digital activities. The computer forensic analyst uses various techniques and tools to guide his investigations. Tools such as Wireshark, Volatility, Autopsy, and others are popular forensic analysis tools across various operating systems. In recent years, containerized applications have become popular. Containers are not immune to cyberattacks, and when there are suspicious malicious activities, it may be useful to be able to investigate our container without disturbing the operation of that container. This is when `checkpoinctl` came in handy. `checkpointcl` is CLI project from the open-source organization CRIU (Checkpoint Restore In Userspace) that makes it easy to inspect container checkpoints created by CRIU. In this article, we will see how `checkpointcl` can be used as a forensic analysis tool for container checkpoints.

## Prerequisite

* A Linux operating system
    
* Podman ([Podman Installation Instructions](https://podman.io/docs/installation))
    
* [CRIU](https://criu.org/Installation)
    
* [checkpointcl](https://github.com/checkpoint-restore/checkpointctl)
    

## Creating a container checkpoint

We start by starting a Postgres container with Podman:

```bash
podman run --name postgres -d -e POSTGRES_PASSWORD=secret_password postgres
```

Because checkpoints currently work with root containers only, it is necessary to run the Postgres container as root. I have switched to root for all the examples in this tutorial. Alternatively, you can prefix your commands with `sudo` to achieve the same effect.

Create a checkpoint for the container:

```bash
mkdir checkpoints
cd checkpoints
podman container checkpoint postgres --leave-running --export postgres-checkpoint.tar.gz
```

```bash
ls postgres-checkpoint.tar.gz
```

Install `checkpointctl`

```bash
go install github.com/checkpoint-restore/checkpointctl@main
```

Verify the installation:

```bash
checkpointctl --help
```

## Checkpoint analysis with `checkpointctl`

Use `show` subcommand to get an overview of the checkpoint.

```bash
checkpointctl show postgres-checkpoint.tar.gz

Displaying container checkpoint data from postgres-checkpoint.tar.gz

+-----------+-----------------------------------+--------------+---------+---------------------------+--------+------------+-------------------+
| CONTAINER |               IMAGE               |      ID      | RUNTIME |          CREATED          | ENGINE | CHKPT SIZE | ROOT FS DIFF SIZE |
+-----------+-----------------------------------+--------------+---------+---------------------------+--------+------------+-------------------+
| postgres  | docker.io/library/postgres:latest | e95b555d040d | crun    | 2024-01-28T14:37:56-05:00 | Podman | 27.3 MiB   | 2.0 KiB           |
+-----------+-----------------------------------+--------------+---------+---------------------------+--------+------------+-------------------+
```

Use `inspect` subcommand to get more detailed information about the container checkpoint.

```bash
checkpointctl inspect postgres-checkpoint.tar.gz

Displaying container checkpoint tree view from postgres-checkpoint.tar.gz

postgres
├── Image: docker.io/library/postgres:latest
├── ID: e95b555d040dcb2f61c3c8f62511827e58b8733456f3ec797c4a846c4bd7ac8c
├── Runtime: crun
├── Created: 2024-01-28T14:37:56-05:00
├── Engine: Podman
├── Checkpoint size: 27.3 MiB
│   └── Memory pages size: 27.2 MiB
└── Root FS diff size: 2.0 KiB
```

To see the process tree of the container, add the `--ps-tree` option:

```bash
checkpointctl inspect postgres-checkpoint.tar.gz --ps-tree

Displaying container checkpoint tree view from postgres-checkpoint.tar.gz

postgres
├── Image: docker.io/library/postgres:latest
├── ID: e95b555d040dcb2f61c3c8f62511827e58b8733456f3ec797c4a846c4bd7ac8c
├── Runtime: crun
├── Created: 2024-01-28T14:37:56-05:00
├── Engine: Podman
├── Checkpoint size: 27.3 MiB
│   └── Memory pages size: 27.2 MiB
├── Root FS diff size: 2.0 KiB
└── Process tree
    └── [1]  postgres
        ├── [55]  postgres
        ├── [56]  postgres
        ├── [58]  postgres
        ├── [59]  postgres
        └── [60]  postgres
```

The `inspect` subcommand provides additional capabilities, so refer to the command-line documentation for more details:

```bash
checkpointctl inspect --help
```

Finally, you can use `memparse` subcommand to read the contents of the memory pages of the container checkpoint to get a more in-depth overview of the state of the container when it was checkpointed.

```bash
checkpointctl memparse postgres-checkpoint.tar.gz

Displaying processes memory sizes from postgres-checkpoint.tar.gz

+-----+--------------+-------------+--------------------+
| PID | PROCESS NAME | MEMORY SIZE | SHARED MEMORY SIZE |
+-----+--------------+-------------+--------------------+
|   1 | postgres     | 2.3 MiB     | 142.6 MiB          |
+-----+--------------+-------------+--------------------+
|  55 | postgres     | 2.3 MiB     | 142.6 MiB          |
+-----+--------------+-------------+--------------------+
|  56 | postgres     | 2.3 MiB     | 142.6 MiB          |
+-----+--------------+-------------+--------------------+
|  58 | postgres     | 2.3 MiB     | 142.6 MiB          |
+-----+--------------+-------------+--------------------+
|  59 | postgres     | 2.6 MiB     | 143.6 MiB          |
+-----+--------------+-------------+--------------------+
|  60 | postgres     | 2.5 MiB     | 143.6 MiB          |
+-----+--------------+-------------+--------------------+
```

To display the contents of memory pages for a specific process (e.g., PID 1), use:

```bash
checkpointctl memparse postgres-checkpoint.tar.gz --pid=1 | less

Displaying memory pages content for process ID 1 from checkpoint: postgres-checkpoint.tar.gz

Address           Hexadecimal                                       ASCII            
-------------------------------------------------------------------------------------
000055996b20a000  48 83 ec 08 48 8b 05 3d 0f 79 00 48 85 c0 74 02  |H...H..=.y.H..t.|
000055996b20a010  ff d0 48 83 c4 08 c3 00 00 00 00 00 00 00 00 00  |..H.............|
000055996b20a020  ff 35 52 fe 78 00 ff 25 54 fe 78 00 0f 1f 40 00  |.5R.x..%T.x...@.|
000055996b20a030  ff 25 52 fe 78 00 68 00 00 00 00 e9 e0 ff ff ff  |.%R.x.h.........|
000055996b20a040  ff 25 4a fe 78 00 68 01 00 00 00 e9 d0 ff ff ff  |.%J.x.h.........|
000055996b20a050  ff 25 42 fe 78 00 68 02 00 00 00 e9 c0 ff ff ff  |.%B.x.h.........|
000055996b20a060  ff 25 3a fe 78 00 68 03 00 00 00 e9 b0 ff ff ff  |.%:.x.h.........|
000055996b20a070  ff 25 32 fe 78 00 68 04 00 00 00 e9 a0 ff ff ff  |.%2.x.h.........|
000055996b20a080  ff 25 2a fe 78 00 68 05 00 00 00 e9 90 ff ff ff  |.%*.x.h.........|
000055996b20a090  ff 25 22 fe 78 00 68 06 00 00 00 e9 80 ff ff ff  |.%".x.h.........|
000055996b20a0a0  ff 25 1a fe 78 00 68 07 00 00 00 e9 70 ff ff ff  |.%..x.h.....p...|
000055996b20a0b0  ff 25 12 fe 78 00 68 08 00 00 00 e9 60 ff ff ff  |.%..x.h.....`...|
000055996b20a0c0  ff 25 0a fe 78 00 68 09 00 00 00 e9 50 ff ff ff  |.%..x.h.....P...|
000055996b20a0d0  ff 25 02 fe 78 00 68 0a 00 00 00 e9 40 ff ff ff  |.%..x.h.....@...|
000055996b20a0e0  ff 25 fa fd 78 00 68 0b 00 00 00 e9 30 ff ff ff  |.%..x.h.....0...|
000055996b20a0f0  ff 25 f2 fd 78 00 68 0c 00 00 00 e9 20 ff ff ff  |.%..x.h..... ...|
```

## Conclusion

`checkpointctl` is a powerful tool for forensic analysis of container checkpoints, allowing investigators to scrutinize and understand the state of a container at a specific point in time. Its capabilities provide insights into the container's configuration, processes, files, and memory, facilitating effective forensic examinations in the ever-evolving landscape of cyber threats.