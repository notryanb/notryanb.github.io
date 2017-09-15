---
layout: post
title:  "Making a simple blog with Rust: Part I"
date:   2017-09-15
categories:
- rust
- programming
- rocket
- diesel
---

[Rust] is a relatively new systems language programming language that runs blazingly fast, prevents segfaults, and guarantees thread safety.
It currently has a reputation for a steep learning curve,
but this blog series aims to help alleviate some of those issues.
I come from a Ruby web development background and this series will be aimed at developers with similar backgrounds.

[Rust]: https://www.rust-lang.org/en-US/

For this project we'll be using [Rust Nightly], [Diesel], [Rocket], and [Postgres].
In an effort to keep this blog focused on writing the app,
I won't be covering setting up Rust or Postgres.
They each may come with their own issues depending on which OS you're using.

[Rust Nightly]: https://www.rustup.rs/
[Diesel]: http://www.diesel.rs
[Rocket]: https://www.rocket.rs
[Postgres]: https://www.postgresql.org/

## Getting Started

First thing is to setup your new project.
From your command line, start a new rust project with `cargo new lil_blog`.
This will set up your project to be a cargo library,
so we'll also need to make a directory `src/bin` and create `src/bin/main.rs`.

We'll also need to configure our dependencies in our `Cargo.toml` file.
It should look like the following.
I'll explain our dependencies as they come up in code,
but this should be almost all we need for setting up a simple diesel/rocket project.

```
[package]
name = "lil blog"
version = "0.1.0"
authors = ["Ryan B <notryanb@gmail.com>"]

# bin is the entry point for `cargo run` or `cargo build`
[[bin]]
name = "lil_blog"
path = "src/bin/main.rs"

# lib is going to be the entry point for all our main app code
# it will import everything and also set up some app wide config
# so it can all be imported into our `bin`
[lib]
name = "lil_lib"
path = "src/lib.rs"

[dependencies]
# Server
rocket = "0.3.2"
rocket_codegen = "0.3.2"
rocket_contrib = { version = "0.3.2", default-features = false, features = ["tera_templates"] }
serde = "1.0.11"
serde_derive = "1.0.11"
serde_json = "1.0.2"
tera = "0.10"

# DB
diesel = { version = "0.16", features = ["postgres"] }
diesel_codegen = { version = "0.16", features = ["postgres"] }
r2d2 = "*"
r2d2-diesel = "*"

# SYS
dotenv = "0.10"
```

We're going to be installing the [diesel cli]() which will help us setup the database and run migrations.
In your command line => `cargo install diesel_cli --no-default-features --features postgres`.
The reason we pass both of those long flags to install is because by default,
Diesel will assume you want `sqlite`, `mysql`, and  `postgresql`.
Our project is only concerned with `postgres`,
so we'll just be focusing on that so you don't have to install everything else :P.

`diesel_cli` figure out how to setup the database by checking a file called `.env` for a database url.
Create your `.env` file in the root of your crate and make the first line of the file say
`DATABASE_URL=postgres://username:password@localhost/lil_blog`.
The `.env` file should not be checked into source control,
otherwise everyone will know your database url and credentials!!! Ahhh!!!.

Once you have your `.env` file setup, run the command `diesel setup`.
When succuessful, you should see the following output.

```bash
Creating migrations directory at: /Users/ryan/Sites/rust_playground/lil_blog/migrations
Creating database: lil_blog
```

From the CLI, you should be able to use the `psql` command to get into postgres.
From there you can type `\d` to list all the databases you currently have.
You'll see `lil_blog` if it worked.
Alternatively, you can also log into the db directly with `psql lil_blog`.
To check your tables, type `\l`.
It should be empty at this point.


