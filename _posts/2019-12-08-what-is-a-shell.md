---
layout: post
title: "Nushell - The Cross Platform Shell"
date: 2019-12-13
categories:
- rust
- programming
- commandline
---
### What is a Shell?

A shell is command-line (text input/output) or graphical interface that lets you interact with the programs of an operating system.
The shell program is typically the layer outside the operating system's kernel, which is where it gets the name "shell".
If you have ever interacted with MacOS/Linux *terminal* or CMD and PowerShell on Windows, you're using what most users will call "the shell".
Technically, the program that opens up the window you're typing into is most likley a terminal emulator,
but the program running inside accepting your input is the shell.

The shell allows you interact with programs that operate on the file system, 
system processes, devices that make up the system you're on, and much more.
In some cases, you are able to communicate with completely different machines as over SSH, aka Secure Shell.
Software developers and IT professional use shells for many tasks such as batch processing files, searching the file system, running custom scripts, downloading the uploading files to the internet, automating their daily workflows, and even playing games!

Some examples of well known command-line shells are Bourne Shell (sh), Bash (Bourne-again Shell), Zsh, Fish, PowerShell, Korn Shell, and csh,
while an example of a graphical (GUI or desktop) shell is Windows.
There are many others (I'm sorry if I didn't mention your favorite one!), but listing them all would belabor the point.

### Example Usage

In the [Bash shell](https://en.wikipedia.org/wiki/Bash_%28Unix_shell%29) (bourne again shell), 
you can list directory contents using the command `ls`,
where it displays information about the current directory by default.
[PowerShell](https://docs.microsoft.com/en-us/PowerShell/) on Windows provides users a similar functionality using the same `ls` command.

In order to alter the way information is displayed,
you may have to provide additional input to the command,
which is called a **flag**.
For example, `ls -l` provides a "long list" format which also shows file permissions, file creation and file access information.
That particular flag will work in Bash and most other Bash inspired shells, but it doesn't work in PowerShell.

PowerShell provides a similar features in the form of a cmdlet, pronounced _command-let_.
You can try `ls` in PowerShell and it will work, but also try `man ls` to get the manual page.
You'll find that the cmdlet is actually named `Get-ChildItem`.
If you use `alias ls` in PowerShell,
you will see the command is an alias for the Get-ChildItem.

It's somewhat interesting that `ls` in Bash is similar to `ls -Name` in PowerShell
and `ls -l` in Bash is similar to the default `ls` in PowerShell.

There are plenty of other executable programs that operating systems have to offer.
For Linux/MacOS,
you most likely have the path `/usr/bin` in your `PATH` variable,
which is what directories your shell will look in to find executable programs.
Try `ls -l /usr/bin` to see a list of executables which you can run from the command line.
If you're curious about any of them,
all you need is the manual page by typing the executable name preceded by `man`.
For example `man zip`.
Similar functionality can be achieved in PowerShell by using `Get-Command`.

### Manipulating Data

In the previous section we saw how a user may list the available commands or executables they can run via their shell.
If you've been trying these on your own system,
you may have noticed an overwhelming amount of output.
Sometimes you may need all of it,
but often you might want a subset of the data.

We'll continue with `ls`,
as it is fairly simple to work with.
In Bash, if you want to `ls` only directories,
or in other words, _filter entries by the type directory_,
then you may use the command `ls -d */`.
The logic behind this is that the `-d` flag will output the / character after a directory and then we're using a glob to match anything that ends with the /.
If you're in PowerShell, you can take advantage of the `-Directory` flag.
The full command will look like `ls -Directory`.

These shells differ in their approach to how data is handled.
Bash handles data like raw text while PowerShell seems to handle the data as objects.
Both approaches have advantages and disadvantages,
however if you need to context switch between shells this can be a lot of mental overhead.

Sometimes simple data manipulation goes well beyond one command.
If you are experienced in your shell of choice,
you've probably _piped_ commands together or even written scripts.
The idea is that commands can take some input, maybe from the user, maybe from something more formalized like standard-in,
and then pass it into a program.
Shell programs often output data via standard-out allowing you to continue this pattern of linking programs together.


### The Future of Shells
Many of the popular shells have reached maturity and are industry standards, but like all software, they have their drawbacks.
I think a fair number of developers probably have to work across multiple operating systems whether their position requires it or they enjoy using a different OS for personal use outside of work.
Having to maintain multiple shell environments can be tedious and error prone even if it is fun to learn the internals of all of them.

A recent project, [Nushell](https://www.nushell.sh/) aims to solve some of these issues.
Nushell is a cross-platform shell written in Rust which works on Windows, MacOS, and Linux.
It is still in the very early stages and only a few months old as of the time of this writing,
although development seems to be going at a rapid pace with a 3-week release cycle.
Aside from the cross-platform aspect of Nushell,
one of the more appealing features is how Nushell treats data.
Instead of treating all data as raw text,
Nushell takes some inspiration from PowerShell and treats data as structured tables or objects.
This enables Nushell to support a rich command and plugin system to manipulate data in very useful and declarative ways.

### Nushell Examples
I won't go over the details for how to get started with Nushell, 
because [it already offers](https://book.nushell.sh/) a helpful book.

We can start off with the typical `ls` example.
Nushell offers its own version of `ls` which you can learn about by using the help command `help ls`.
Using only `ls` you'll see a table returned to you with some nice default information.
Do you want to find all the symlinks in your `/usr/bin` directory?
`ls /usr/bin | where type == Symlink`.
Okay, now what about all the symlinks in your `C:\Users` directory on Windows?
`ls C:\Users | where type == Symlink`.
The same thing? Well, the same command aside from the directory... This is great!

Once you invest the time into learning Nushell,
you'll be able to use the same commands on any system that is running it.
Our example above using `ls` is actually using the `ls` command that is inside of Nushell and not the "native" `ls` on your system.
If you prefer the version your OS has, you can always escape the command by prefixing it with `^`, as in `^ls`.
From there Nushell can still take advantage of the output by piping the output of the native command into other Nushell commands.

As mentioned earlier, Nushell is still quite early in its development.
While it has [many useful features](https://www.nushell.sh/documentation.html), it does not yet support scripting or aliasing of commands.
As Nushell matures, many of the standard behaviors you might expect from a shell will be included ... and maybe more!?

Nushell offers a [plugin system](https://book.nushell.sh/en/plugins) in addition to its commands.
A Nushell plugin is meant to be optional and can be installed in addition to the "core" of Nushell.
Plugins can be written in many languages as long as they adhere to the plugin interface.
There already exist plugins written in [Rust](https://github.com/nushell/contributor-book/blob/master/en/plugins.md#creating-a-plugin-in-rust), [Go](https://vsoch.github.io/2019/nushell-plugin-golang/), [Python](https://github.com/nushell/contributor-book/blob/master/en/plugins.md#creating-a-plugin-in-python), and more!
Plugins can be offered as operating system specific programs like something that interacts with an OS specific API or even augment existing programs like SQLite, which is already supported!

My daily workflow involves testing REST APIs.
I am able to use the `fetch` command offered by nushell to download data and turn it into any format I want.
In addition to this, I can take files in one format, convert to another and then `post` to a url.
I frequently have to take CSV files and send them to an endpoint.
With Nushell I can open a CSV file,
turn it into a JSON payload,
and send it all in one line.

Here's some examples of using Nushell and the expected output.
This output has been reduced to fit on the screen.

```
> fetch https://jsonplaceholder.typicode.com/todos/
━━━┯━━━━━━━━┯━━━━┯━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┯━━━━━━━━━━━
 # │ userId │ id │ title                              │ completed
───┼────────┼────┼────────────────────────────────────┼───────────
 0 │      1 │  1 │ delectus aut autem                 │ No
 1 │      1 │  2 │ quis ut nam facilis et officia qui │ No
 2 │      1 │  3 │ fugiat veniam minus                │ No
━━━┷━━━━━━━━┷━━━━┷━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┷━━━━━━━━━━━
```


Getting only the title column out of the previous dataset.


```
> fetch https://jsonplaceholder.typicode.com/todos/ | get title
━━━┯━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 # │ <value>
───┼────────────────────────────────────
 0 │ delectus aut autem
 1 │ quis ut nam facilis et officia qui
 2 │ fugiat veniam minus
━━━┷━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Turning this new dataset into json.

```
> fetch https://jsonplaceholder.typicode.com/todos/ | get title | to-json
["delectus aut autem","quis ut nam facilis et officia qui","fugiat veniam minus"]
```

If you want to save that json, you can pipe it to `save`.

```
> fetch https://jsonplaceholder.typicode.com/todos/ | get title | to-json | save titles.json
```

This can all be done with existing shells but not in the same concise and declarative way.
The [Nushell Cookbook](https://github.com/nushell/cookbook#http) shows how to write some fun commands like this in practice.

### Give it a try!
Even if you're a staunch supporter for your favorite shell,
I encourage you to try out Nushell.
If you don't find it immediately useful in its current state,
you might end up taking back some ideas to your own environment.


...  
...  
...  
Oh... if you _do_ try Nushell and installed from the current `master` branch with `--features=stable`, `open` a JPEG or NES rom =).

Thank you to **thegedge** and **jonathandturner** for helping review this post.

