---
title: "What Happens When You Boot Your LInux System"
author: "Kouame Behouba Manassé"
date: 2020-03-14T18:45:52+01:00
tags: [
    "OS", "Fedora", "Linux",
]
---

Have you ever wondered what’s really going on when you press the power button on your Linux machine? I mean, sure, you see your distribution logo, maybe a loading spinner, and then the login screen. But what’s happening *under the hood*? Let’s take a journey together, from the moment you hit that power button to when you’re greeted by the login screen. I’ll explain this process for Fedora which is my favorite Linux distribution!

---

## Power-On and the BIOS/UEFI Dance

You press the power button. Your computer wakes up, but it’s not ready to run Fedora just yet. First, it hands control over to the **BIOS** (Basic Input/Output System) or **UEFI** (Unified Extensible Firmware Interface). Think of this as the computer’s "warm-up routine."

- **BIOS/UEFI** does a quick check to make sure all your hardware is present and accounted for. This is called the **Power-On Self-Test (POST)**. If something’s wrong (like your RAM is missing), it’ll let you know with a beep or an error message.
- Once the hardware check is done, the BIOS/UEFI looks for a bootable device. This is usually your hard drive or SSD, but it could also be a USB stick or network boot if you’ve set it up that way.

On a Fedora system, UEFI is more common these days, and it’s a bit fancier than the old-school BIOS. UEFI can read partitions and files directly, which makes the next step smoother.

---

## GRUB to the Rescue

Now that the BIOS/UEFI has found your bootable device, it hands control over to the **bootloader**. On Fedora, this is usually **GRUB** (Grand Unified Bootloader). GRUB is like the bouncer at a club—it decides which operating system (or kernel) gets to run.

- GRUB loads its configuration file (usually located in `/boot/grub2/grub.cfg`) and presents you with a menu. If you’ve got multiple kernels installed (maybe you’re testing a new one), you’ll see them listed here.
- If you don’t press anything, GRUB will boot the default option after a few seconds. This is typically the latest Linux kernel installed on your system.

Once you’ve made your choice (or let the timer run out), GRUB loads the selected **Linux kernel** into memory and hands over control.

---

## The Kernel Takes Over

The kernel is the heart of your Linux system. It’s what makes everything tick. When GRUB hands control to the kernel, a lot of magic happens:

1. **Hardware Initialization**: The kernel detects and initializes all your hardware—CPU, RAM, storage devices, network interfaces, you name it.
2. **Root Filesystem Mounting**: The kernel needs to mount the root filesystem (`/`) so it can access all the files and programs required to boot the system. On Fedora, this is usually an `ext4` or `btrfs` partition.
3. **Initramfs**: Sometimes, the kernel needs a little help to mount the root filesystem, especially if it’s on an encrypted drive or a RAID array. That’s where the **initramfs** (initial RAM filesystem) comes in. It’s a temporary filesystem loaded into memory that contains tools and drivers needed to mount the real root filesystem.

Once the root filesystem is mounted, the kernel starts the first user-space process: **systemd**.

---

## systemd Says "Hello"

Ah, **systemd**. Love it or hate it, it’s the init system used by Fedora (and most modern Linux distributions). When the kernel hands control to systemd, it’s like passing the baton in a relay race.

- **systemd** is responsible for starting and managing all the services and processes required to bring your system to life. It reads its configuration files (usually in `/etc/systemd/system/`) and starts services in parallel, which makes booting faster.
- Some of the key services systemd starts include:
  - **dbus**: Handles communication between processes.
  - **NetworkManager**: Manages your network connections.
  - **GDM**: The GNOME Display Manager, which handles the graphical login screen.

---

## GDM and the Login Screen

Finally, we’re getting close to the finish line! Once systemd has started all the necessary services, it launches **GDM** (GNOME Display Manager). GDM is what gives you that sleek Fedora login screen.

- GDM starts the X server or Wayland (Fedora uses Wayland by default these days), which handles the graphical environment.
- It also loads your desktop theme, fonts, and other graphical elements so everything looks pretty.

When you see the login screen, your system is fully booted and ready for you to log in. Enter your password, and you’re in!

---

So, there you have it—a whirlwind tour of what happens when you boot your Fedora Workstation. From the BIOS/UEFI to GRUB, the kernel, systemd, and finally GDM, it’s a well-orchestrated dance of software and hardware working together to bring your system to life.
