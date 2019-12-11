---
layout: post
title: "Nushell - The Cross Platform Shell"
date: 2019-12-10
categories:
- rust
- programming
- commandline
---
### What is a Shell?

A shell is command line (text) or graphical interface that lets you interact with the programs of an operating system.
The shell program is typically the outermost layer from the operating system kernel, which is where it gets its name.
If you have ever interacted with MacOS/Linux *terminal* or CMD and PowerShell on Windows, you're using what most users will call "the shell".

An operating system shell allows you interact with programs, the file system, system processes, and devices that make up the system you're on.
In some cases, you are able to communicate with completely different machines as over SSH, aka Secure Shell.
Software developers and IT professional use shells for many tasks such as batch processing files, searching the file system, running custom scripts, downloading the uploading files to the internet, automating their daily workflows, and even playing games!

### Example Usage

In the [Bash shell](https://en.wikipedia.org/wiki/Bash_%28Unix_shell%29) (bourne again shell), you can interact with the file system using a command `ls`,
where it displays information about the current directory by default.
[Powershell](https://docs.microsoft.com/en-us/powershell/) on Windows provides users a similar functionality. 

In order to alter the way information is displayed,
you may have to provide additional input to the command,
which is called a flag.
For example, `ls -l` provides a "long list" format which also shows file permissions, file creation and file access information.

Powershell provides a similar features in the form of a cmdlet, pronounced _command-let_.
You can try `ls` in Powershell and it will work, but also try `man ls` to get the manual page.
You'll find that the cmdlet is `Get-ChildItem`.
If you use `alias ls` in Powershell,
you will see the command is an alias for the Get-ChildItem.

There are plenty of executable programs that operating systems have to offer.
For Linux/MacOS,
you most likely have the path `/usr/bin` in your `PATH` variable.
Try `ls -l /usr/bin` to see a list of executables which you can run from the command line.
If you're curious about any of them,
all you need is the manual page by typing the executable name preceded by `man`.
For example `man zip`.
Similar functionality can be achieved in Powershell by using `Get-Command`.

### Manipulating Data

In the previous section we saw how a user may list the available commands or executables they can run via their shell.
If you've been trying these on your own system,
you may have noticed an overwhelming amount of output.
Sometimes you may need all of it,
but often you might want a subset of the data.
If you wanted to get all the aliases out of `Get-Command`,
you can use `Get-Command | Where-Object {$_.CommandType -eq 'alias'}`.
While this is verbose,
you can figure out how to modify the command by changing the field and the comparison operator.
On Linux/MacOS you can use the `alias` command to list them all,
but what if you wanted to find all the symlinks in `/usr/bin`?
One way to do this is to _pipe_ the output of the `ls` program into another one like `grep`.
`grep` enables us to search the output.
You probably noticed from the original command that any symlinks contain "->" on their line pointing to their destination.
Try `ls -la /usr/bin | grep "\->"`

These two approaches both work well enough, but they're quite different.
Powershell gives us data in a table-like format while bash does offer data in table like format, but we have to think of how to parse each line.
Many shells offer a way to write scripts so you can automate entire workflows or even design programs.
I won't go into detail about how they differ among shells, as they all offer their own nuanced scripting languages.


### The Future of Shells
I think a fair number of developers probably have to work across multiple operating systems whether their position requires it or they enjoy using a different OS for personal use outside of work.
Having to maintain multiple shell environments can be tedious and error prone even if it is fun to learn the internals of all of them.
A recent project, [Nushell](https://www.nushell.sh/) aims to solve some of these issues.
Nushell is a cross-platform shell written in Rust which works on Windows, MacOS, and Linux.
It is still in the very early stages and only a few months old as of the time of this writing,
although development seems to be going at a rapid pace with a 3-week release cycle.
Aside from the cross-platform aspect of Nushell,
one of the more appealing features is how Nushell treats data.
Instead of treating all data as raw text,
Nushell takes some inspiration of Powershell and treats data as structured tables or objects.
This enables Nushell to support a rich command and plugin system to manipulate data in very useful and declarative ways.

### Nushell Examples
I won't go over the details for how to get started, 
because [Nushell already offers](https://book.nushell.sh/) a helpful book.

We can start off with the typical `ls` example.
Nushell offers its own version of `ls` which you can learn about by using the help command `help ls`.
Using only `ls` you'll see a table returned to you with some nice default information.
Do you want to find all the symlinks in your `/usr/bin` directory?
`ls /usr/bin | where type == Symlink`.
Okay, now what about all the symlinks in your `C:\Users` directory on Windows?
`ls /usr/bin | where type == Symlink`.
The same thing? Great!
While Nushell doesn't yet support scripting,
you'll be able to write scripts once and use them across all your system that have Nushell.

Need to make a http request to a json endpoint?  
`fetch https://jsonplaceholder.typicode.com/todos/ | get title`

Need to make a http request to a json endpoint and get the title data?  
`fetch https://jsonplaceholder.typicode.com/todos/ | get title`

Need to turn that into json array of titles?  
`fetch https://jsonplaceholder.typicode.com/todos/ | get title | to-json`

Need to save that result?  
`fetch https://jsonplaceholder.typicode.com/todos/ | get title | to-json | save titles.json`

This can all be done with existing shells but not in the same concise and declarative way.

Lastly, `open` an NES rom and see how nushell handles this - you'll need nushell installed with --all-features`.

