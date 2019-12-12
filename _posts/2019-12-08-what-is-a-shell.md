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
The shell program is typically the outermost layer from the operating system kernel, which is where it gets the name "shell".
If you have ever interacted with MacOS/Linux *terminal* or CMD and PowerShell on Windows, you're using what most users will call "the shell".
Technically, the program that opens up the window you're typing into is most likley a terminal emulator,
but the program running inside accepting your input is the shell.

An operating system shell allows you interact with programs installed on the operating system which in turn operate on the file system, 
system processes, devices that make up the system you're on, and much more.
In some cases, you are able to communicate with completely different machines as over SSH, aka Secure Shell.
Software developers and IT professional use shells for many tasks such as batch processing files, searching the file system, running custom scripts, downloading the uploading files to the internet, automating their daily workflows, and even playing games!

Some examples of well known shells are Bash, Zsh, Fish, Powershell, Korn Shell, and csh.
There are many others (I'm sorry if I didn't mention your favorite one!), but listing them all would belabor the point.

### Example Usage

In the [Bash shell](https://en.wikipedia.org/wiki/Bash_%28Unix_shell%29) (bourne again shell), 
you can list directory contents using the command `ls`,
where it displays information about the current directory by default.
[Powershell](https://docs.microsoft.com/en-us/powershell/) on Windows provides users a similar functionality using the same `ls` command.

In order to alter the way information is displayed,
you may have to provide additional input to the command,
which is called a **flag**.
For example, `ls -l` provides a "long list" format which also shows file permissions, file creation and file access information.
That particular flag will work in Bash and most other Bash inspired shells, but it doesn't work in Powershell.

Powershell provides a similar features in the form of a cmdlet, pronounced _command-let_.
You can try `ls` in Powershell and it will work, but also try `man ls` to get the manual page.
You'll find that the cmdlet is actaully named `Get-ChildItem`.
If you use `alias ls` in Powershell,
you will see the command is an alias for the Get-ChildItem.

It's somewhat interesting that `ls` in Bash is similar to `ls -Name` in Powershell
and `ls -l` in Bash is similar to the default `ls` in Powershell.

There are plenty of other executable programs that operating systems have to offer.
For Linux/MacOS,
you most likely have the path `/usr/bin` in your `PATH` variable,
which is what directories your shell will look in to find executable programs.
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

We'll continue with `ls`,
as it is fairly simple to work with.
In Bash, if you want to `ls` only directories,
or in other words, _filter by directory_,
then you may use the command `ls -d */`.
The logic behind this is that the `-d` flag will output the / character after a directory and then we're using a glob to match anything that ends with the /.
If you're in powershell, you can take advantage of the `-Directory` flag.
The full command will look like `ls -Directory`.

These shells differ in their approach to how data is handled.
Bash handles data like raw text while Powershell seems to handle the data as objects.
Both approaches have advantages and disadvantages,
however if you need to context switch between shells this can be a lot of mental overhead.

Sometimes simple data manipulation goes well beyond one command.
If you are experienced in your shell of choice,
you've probably _piped_ commands together or even written scripts.
The idea is that commands can take some input, maybe from the user, maybe from something more formalized like standard-in,
and then pass it into a program.
Shell programs often output data via standard-out allowing you to continue this pattern of linking programs together.


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
`fetch https://jsonplaceholder.typicode.com/todos/`

Need to make a http request to a json endpoint and get the title data?  
`fetch https://jsonplaceholder.typicode.com/todos/ | get title`

Need to turn that into json array of titles?  
`fetch https://jsonplaceholder.typicode.com/todos/ | get title | to-json`

Need to save that result?  
`fetch https://jsonplaceholder.typicode.com/todos/ | get title | to-json | save titles.json`

This can all be done with existing shells but not in the same concise and declarative way.

### Give it a try!
Even if you're a staunch supporter for your favorite shell,
I encourage you to try out Nushell.
If you don't find it immediately useful in its current state,
you might end up taking back some ideas to your own environment.


...  
...  
...  
Oh... if you _do_ try Nushell and installed with it `--all-features`, `open` an NES rom =).

