---
title: "Coordinated checkpointing with criu-coordinator and Podman"
author: "Kouame Behouba Manassé"
date: 20 Sep 2025
tags: [
   "CRIU", "Cybersecurity", "Container", "Docker", "Podman", "Checkpoint/Restore", "Rust", "Linux",
]
---

During Google Summer of Code 2025, I had the opportunity to work with the **CRIU (Checkpoint/Restore In Userspace)** project on the problem of **coordinated checkpointing of distributed applications**.

CRIU can save the complete state of a running application to disk and later restore it. This works well for a **single process**, but distributed applications involve multiple processes (sometimes across different nodes) that interact via **network connections**. Capturing and restoring their state in a consistent way requires coordination.

That’s where **criu-coordinator** comes in: a lightweight client–server tool that orchestrates CRIU’s checkpoint and restore phases across multiple processes, ensuring they move in lockstep.

In this post, I’ll walk you through a demo of how to use criu-coordinator with Podman to checkpoint and restore a simple distributed application consisting of a TCP client and server.

---

## Prerequisites
* A Linux operating system
* Podman installed
* CRIU installed

## Install criu-coordinator

Start by cloning the criu-coordinator repository and installing it:

```bash
git clone https://github.com/checkpoint-restore/criu-coordinator.git
cd criu-coordinator
sudo make install
```


## Build TCP client and server images
The demo uses simple TCP client and server programs written in C. You can find them inside the `tests/` directory of the criu-coordinator repository.

tcp-server.c:
```c
#include <arpa/inet.h>
#include <unistd.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <signal.h>

static void serve_new_conn(int sk)
{
    int counter = 0;

    printf("New connection\n");
    while (1) {
        sleep(1);
        if ((write(sk, &counter, sizeof(counter))) <= 0) {
            perror("Can't write socket");
            return;
        }
        counter++;
    }
}

static int main_srv(int argc, char **argv)
{
    int sk, port, option = 1;
    struct sockaddr_in addr;

    /* Ignore SIGCHLD to prevent zombie processes */
    signal(SIGCHLD, SIG_IGN);

    sk = socket(PF_INET, SOCK_STREAM, IPPROTO_TCP);

    /* Allow the port reuse immediately after the server is terminated. */
    setsockopt(sk, SOL_SOCKET, SO_REUSEADDR, &option, sizeof(option));
    if (sk < 0) {
        perror("Can't create socket");
        return -1;
    }

    port = atoi(argv[1]);
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_ANY);
    addr.sin_port = htons(port);

    printf("Binding to port %d\n", port);
    if ((bind(sk, (struct sockaddr *)&addr, sizeof(addr))) < 0) {
        perror("Can't bind socket");
        return -1;
    }

    if ((listen(sk, 16)) < 0) {
        perror("Can't put sock to listen");
        return -1;
    }

    printf("Waiting for connections...\n");
    while (1) {
        int ask, pid;

        ask = accept(sk, NULL, NULL);
        if (ask < 0) {
            perror("Can't accept new conn");
            return -1;
        }

        pid = fork();
        if (pid < 0) {
            perror("Can't fork");
            return -1;
        }

        if (pid > 0)
            close(ask);
        else {
            close(sk);
            serve_new_conn(ask);
            exit(0);
        }
    }
}


int main(int argc, char **argv)
{
    if (argc != 2) {
        printf("Usage: %s <port>\nExample: %s 8080\n", argv[0], argv[0]);
        return -1;
    }

    return main_srv(argc, argv);
}
```

tcp-client.c:
```c
#include <arpa/inet.h>
#include <unistd.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <sys/time.h>

static int main_cl(int argc, char **argv)
{
    int sk, port, ret, val = 1, rval;
    struct timeval t0, t1;
    struct sockaddr_in addr;

    sk = socket(PF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (sk < 0) {
        return -1;
    }

    port = atoi(argv[2]);

    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;

    if ((inet_aton(argv[1], &addr.sin_addr)) < 0) {
        return -1;
    }

    addr.sin_port = htons(port);
    if ((connect(sk, (struct sockaddr *)&addr, sizeof(addr))) < 0) {
        return -1;
    }

    printf("Connected to %s:%d ...\n", argv[1], port);

    while (1) {
        gettimeofday(&t0, NULL);
        while (read(sk, &rval, sizeof(rval)) == 0)
            sleep(0.0001);
        gettimeofday(&t1, NULL);
        printf("%f ms\n", (float)((t1.tv_sec - t0.tv_sec) * 1000.0 + (t1.tv_usec - t0.tv_usec) / 1000.0));
    }
    return -1;
}


int main(int argc, char **argv)
{
    if (argc != 3) {
        printf("Usage: %s <address> <port>\nExample: %s 127.0.0.1 8080\n", argv[0], argv[0]);
        return -1;
    }

    return main_cl(argc, argv);
}
```

## Build the images

Create Dockerfiles for both the client and server:

tests/tcp-server.Dockerfile:
```Dockerfile
FROM ubuntu:latest
COPY tcp-server /usr/local/bin/
CMD ["/usr/local/bin/tcp-server", "8080"]
```

tests/tcp-client.Dockerfile:
```Dockerfile
FROM ubuntu:latest
COPY tcp-client /usr/local/bin/
ENTRYPOINT ["/usr/local/bin/tcp-client"]
```

```bash
podman build -t tcp-server-e2e -f tests/tcp-server.Dockerfile .
podman build -t tcp-client-e2e -f tests/tcp-client.Dockerfile .
```

## Start the coordinator server

```bash
criu-coordinator server
```

This runs the central server that will coordinate all clients.

---

## Create a network for containers

```bash
podman network create --subnet 192.168.90.0/24 criu-e2e-network
```

This ensures both client and server containers can communicate.

---

## Run TCP client and server containers

```bash
podman run -dt --name tcp-server-e2e --network criu-e2e-network --ip 192.168.90.10 tcp-server-e2e

podman run -dt --name tcp-client-e2e --network criu-e2e-network --ip 192.168.90.20 tcp-client-e2e 192.168.90.10 8080
```

Now we have two containers:

* A **TCP server** listening on port 8080.
* A **TCP client** connecting to it.

You can check logs with:

```bash
podman logs -f tcp-client-e2e tcp-server-e2e
```

---

## Configure criu-coordinator

Create a configuration file for criu-coordinator that defines the dependencies between the two containers. Save it as `/etc/criu/criu-coordinator.json`.

```bash
CLIENT_ID=$(podman inspect --format {{.Id}} tcp-client-e2e)
SERVER_ID=$(podman inspect --format {{.Id}} tcp-server-e2e)

mkdir -p /etc/criu
cat <<EOF > /etc/criu/criu-coordinator.json
{
    "address": "127.0.0.1",
    "port": 8080,
    "dependencies": {
        "${CLIENT_ID}": ["${SERVER_ID}"],
        "${SERVER_ID}": ["${CLIENT_ID}"]
    }
}
EOF
```

This file tells the coordinator how containers depend on each other.

Also configure CRIU to use criu-coordinator as its action script:

```bash
COORDINATOR_PATH=$(realpath target/debug/criu-coordinator)
echo "action-script=${COORDINATOR_PATH}" > /etc/criu/default.conf
```

---

## Checkpoint both containers

Here we checkpoint both containers using Podman, ensuring to include the `--tcp-established` flag to preserve the TCP connection state.
We run each command on a separate terminal.

Terminal 1 (for the client):
```bash
podman container checkpoint --tcp-established -e /tmp/server.tar.gz tcp-server-e2e
```

Terminal 2 (for the server):
```bash
podman container checkpoint --tcp-established -e /tmp/client.tar.gz tcp-client-e2e
```

Both containers should be checkpointed while keeping their TCP state.

---

## Clean up

We can now remove the stopped containers:

```bash
podman ps -a
podman rm --all
```



---

## Restore both containers

Run each command on a separate terminal.

Terminal 1 (for the server):

```bash
podman container restore --tcp-established -i /tmp/server.tar.gz
```

Terminal 2 (for the client):
```bash
podman container restore --tcp-established -i /tmp/client.tar.gz
```

The containers should be restored and reconnect successfully. You can check the logs again to see the client receiving data from the server:

```bash
podman logs -f tcp-client-e2e tcp-server-e2e
```

That’s it! You have successfully checkpointed and restored a simple distributed application using criu-coordinator and Podman. Thank you for reading!

---

## Resources

- [CRIU Documentation](https://criu.org)
- [Podman Documentation](https://podman.io)
- [Linux Containers (LXC) Documentation](https://linuxcontainers.org/lxc/documentation/)
- GitHub Repository: [checkpoint-restore/criu-coordinator](https://github.com/checkpoint-restore/criu-coordinator)
- GSoC Final Report: [behouba/gsoc-2025](https://github.com/behouba/gsoc-2025)
- Demo Video: [YouTube](http://www.youtube.com/watch?v=bLzeN9JL6sk)

---
