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

[Rust] is a relatively new "systems programming language that runs blazingly fast, prevents segfaults, and guarantees thread safety."
It currently has a reputation for a steep learning curve,
but this blog series aims to help ease in new developers.
I come from a Ruby web development background and
this series will be aimed at developers with similar backgrounds.

[Rust]: https://www.rust-lang.org/en-US/

For this project we'll be using [Rust Nightly], [Diesel], [Rocket], and [Postgres].

Rocket is a web framework for Rust that makes it simple to write fast web applications
without sacrificing flexibility or type safety.
All with minimal code.

Diesel is a Safe, Extensible(...*"super, mega, amazing"*) ORM and Query Builder for Rust

In an effort to keep this blog focused on writing application code,
I won't be covering setting up Rust or Postgres.
They each may come with their own issues depending on which OS you're using.
If you're running into issues with environment setup,
the rust community is very friendly and can help point you in the right direction.
Please check out the [References](#references) section at the bottom of this page for more info.

[Rust Nightly]: https://www.rustup.rs/
[Diesel]: http://www.diesel.rs
[Rocket]: https://www.rocket.rs
[Postgres]: https://www.postgresql.org/

## Getting Started

First thing is to setup your new project.
I'm going to call my project "lil blog",
but you can name it whatever you want (this might be the hardest part of the project!).
From your command line (will now be referred to as CLI),
start a new rust project with `cargo new lil_blog`.
This will set up your project to be a cargo library,
so we'll also need to make a directory `src/bin` and create `src/bin/main.rs` by hand.

We'll also need to configure our dependencies in the [`Cargo.toml`] file.
`Cargo.toml` is a manifest file where you may set up dependencies and other
configurations for your rust project.
It should look like the following.
I'll explain our dependencies as they come up in code,
but this should be almost all we need for setting up a simple diesel/rocket project.

[`Cargo.toml`]: http://doc.crates.io/manifest.html

```rust
# inside `Cargo.toml`

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

# The following four dependencies will be touched upon
# at later times in this blog series
serde = "1.0.11"
serde_derive = "1.0.11"
serde_json = "1.0.2"
tera = "0.10"

# DB
diesel = { version = "0.16", features = ["postgres"] }
diesel_codegen = { version = "0.16", features = ["postgres"] }

# r2d2 is related to database connection pools
# this will be reviewed in a future post
r2d2 = "*"
r2d2-diesel = "*"

# SYS
dotenv = "0.10"
```

Next we're going to be installing the [diesel_cli] tool which will help us setup the database and run migrations.
From your CLI

[diesel_cli]: https://github.com/diesel-rs/diesel/tree/master/diesel_cli

> `cargo install diesel_cli --no-default-features --features postgres`

The reason we pass both of those long flags to install is because by default,
Diesel will assume you want all `sqlite`, `mysql`, and  `postgresql` backends.
Our project is only concerned with `postgres`,
so we'll just be focusing on that so you don't have to install everything else :P.

`diesel_cli` figures out how to setup the database by checking a file named `.env` for a database url.
Create the `.env` file in the root of your crate.
The first line of the file should be your database url.

```rust
// inside `.env`

DATABASE_URL=postgres://username:password@localhost/lil_blog
```

The `.env` file should not be checked into source control,
otherwise everyone will know your database url and credentials!!! Ahhh!!!
Once you have your `.env` file setup, run the following command 

> `diesel setup`

When succuessful, you should see the following output.

```bash
# CLI Output

Creating migrations directory at: /Users/ryan/Sites/rust_playground/lil_blog/migrations
Creating database: lil_blog
```

Congrats, `diesel_cli` created a new directory for you to keep track of migrations.
From the CLI, you should be able to use the `psql` command to log into postgres.
From there you can type `\d` to list all the databases you currently have.
You'll see `lil_blog` listed in the output if it worked.
Alternatively, you can also log into the db directly with `psql lil_blog`.
To check your tables, type `\l`.
It should be empty at this point.

Now we should think about our app and what functionality we want to provide.
I think a good starting point for a blog is creating a `users` and `posts` table.
A `User` can *have many* `Posts` and in return,
a `Post` *belongs to* a (or *has one*) `User`.
Here is a list of some features we should aim for.

- basic user authorization(login/signup/page restriction)
- [CRUD] actions on users and posts
- draft/publish posts

[CRUD]: https://en.wikipedia.org/wiki/Create,_read,_update_and_delete

The next step is to create a migration.
To keep things simple, we'll create our users and posts tables in the same migration.
We're just starting a new app,
so this is fine for demonstration, but once you're running in production,
any changes should be made incrementally with small and focused migrations.

> `diesel migrations generate create_users_and_posts`

```
# CLI Output

Creating migrations/20170915130246_create_users_and_posts/up.sql
Creating migrations/20170915130246_create_users_and_posts/down.sql
``` 

We'll now have two files which help diesel keep track of migrations.
UP migrations will be for moving forward and making changes to the database
and  DOWN migrations will be for reverting the database to its previous state.
Diesel has a bunch of handy CLI features to assert control over your migrations.

> `diesel migration -h`

The above command will give us a nice help menu for exploring the tool.
Let's check the migrations we've yet to run!

> `diesel migration list`

```
# CLI Output

Migrations:
  [ ] 20170915130246_create_users_and_posts
```

Alright, the output of the list command shows the first migration as being unchecked(not completed).
If we try to run migrations now, `diesel_cli` will detect that the files are empty and report that back to us.

```
# CLI Output

Running migration 20170915130246
Received an empty query
```

Up until this point we've only been concerned with setup, so lets write some code!
The first code to write in our rust project will be `SQL`! 0_o.
We'll get to rust soon enough. :)

We already discussed the tables we want present in our database.
Diesel expects the migration files to be SQL that is compatible with our database backend.
If we were to use a different backend than `postgres`, our column types will look different.

Diesel also offers a feature that lets you infer your database schema from a file rather than 
infer it from our database url.
We won't be covering that in this guide, but the diesel team is currently working on official documentation
to cover these scenarios.

In `migrations/...create_users_and_posts/up.sql` migration

```sql
/* In the up.sql migration file */

CREATE TABLE users ( 
  id SERIAL PRIMARY KEY,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title VARCHAR NOT NULL,
  content TEXT NOT NULL,
  published BOOLEAN NOT NULL DEFAULT 'f'
);
```

In the `migrations/...create_users_and_posts/down.sql` migration

```
/* In the down.sql migration file */

DROP table users;
DROP table posts;
```

Great, now we have UP and DOWN migrations.
Lets run them and check if it works.

> `diesel migration run`

Now let's use diesel_cli's `redo` command to revert the migrations and re-run them.
This will let us know that both UP and DOWN work correctly. 
In most situations you'll just be running `diesel migration run`.

> `diesel migration redo`

```bash
# CLI Output

Rolling back migration 20170915130246
Running migration 20170915130246
```

Now we should be able to see that Diesel completed the migration and is tracking it.

> `diesel migration list`

```bash
Migrations:
  [X] 20170915130246_create_users_and_posts
```

We can also verify this in postgres with `psql lil_blog` and then typing `\d`

```bash
                   List of relations
 Schema |            Name            |   Type   | Owner
--------+----------------------------+----------+-------
 public | __diesel_schema_migrations | table    | ryan
 public | posts                      | table    | ryan
 public | posts_id_seq               | sequence | ryan
 public | users                      | table    | ryan
 public | users_id_seq               | sequence | ryan

```

PHEW! Okay, I think we can start thinking about our application.
For now, lets just get a simple server running with an index page.
You might be asking "What?!?! We did all this setup with diesel and we're not even going to do any database stuff yet?!?
Don't worry!
Part II of this series will introduce how to work with our Diesel backend from within the context of a Rocket app.

Let's open up `src/bin/main.rs` and write some rust. Wooooo!!!

```rust
// Inside `src/bin/main.rs`

#![feature(plugin, custom_derive)]
#![plugin(rocket_codegen)]

extern crate rocket;

fn main() {
  rocket::ignite()
    .mount("/", routes![index])
    .launch();
}

#[get("/")]
fn index() -> String {
  "Hello Wooooooorrrrlllld! Not much a blog yet, eh?".to_string()
}
```

If you would be so kind, please enter `cargo run` into your cli.
I won't spoil the surprise, but expect some nice output!
Navigate to `localhost:8000` in your browser or `cURL` and you should see our string displayed.


It's official. We've made our first rocket (and sort of diesel...) app!
We will be building upon this pattern in our `bin`(aka main.rs) to make our app more complex.
Let's review the first few lines of code in `main.rs`

```rust
#![feature(plugin, custom_derive)]
#![plugin(rocket_codegen)]

extern crate rocket;
```

Rocket is using some nightly rust features to generate a lot of boilerplate code for us.
Inside the main function we're using quite a bit of Rocket's api without having to care too much about how it is implemented or works.
We just need to know the api itself.
Oh yeah, we're also importing the `rocket` crate here.

The main function is setting up our `rocket` app and registering the routes we want to navigate.
In this case `mount()` first parameter is a string to match against the url path
and the second parameter is essentially a `vec![]` of the routes we want to register.

```rust
fn main() {
  rocket::ignite()
    .mount("/", routes![index])
    .launch();
}

```

Below we are declaring that the `index()` function is a GET request to
the root path where the route is mounted,
which in this case is also `"/"`.
We could've specified `"/whatevers"` and then  navigated to `localhost:8000/whatevers` for the same string result.
The [Rocket Guide] covers routing in much more detail.
We will be revisiting some intermediate routing techniques once our app becomes more complex.
The function returns a rust `String`, so we better return that as well!
We'll dive into templates next and setup a simple `tera` template for the index.

[Rocket Guide]: https://rocket.rs/guide/overview/#routing

```rust

#[get("/")]
fn index() -> String {
  "Hello Wooooooorrrrlllld! Not much a blog yet, eh?".to_string()
}
```

Take a break. This is a lot of stuff we just went though. Let's review what has been accomplished so far.

- Install `diesel_cli` specifically for `postgres`
- Point `diesel_cli` to a specific database url
- Have `diesel_cli` create the DB
- Think about our app features and write migrations to support those features
- Run migrations with `diesel_cli` and confirm they work via postgres cli
- Create a barebones `rocket` app to eventually link up with diesel.

Such Wow, Such Amazement. 
That was a lot of work,
but I still want to link up a template before calling it quits for the evening.
Create a directory in the root of your crate named `/templates`.
Now create a template file `templates/layout.html.tera`.
I'm calling mine `layout` because this will be the base layout for every page.
If you're familiar with Ruby on Rails, this is similar to the `layout.html.erb` file.
Other suitable names might be `base.html.tera` or `main.html.tera`.

```html
<!-- inside `base.html.tera` -->
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8" />
    </head>
    <body>
        <div class="container">
          <p>Check out this tera Context:<p>
         {% raw %} <p>{{ my_message }}</p>{% endraw %}
        </div>
    </body>
</html>
```

Those funky double curly braces in our second `<p></p>` block enable us to take a `tera::Context` and output it to the user.
This is going to be how we render dynamic content such as a post list or user info.
Using templates and contexts means we need to modify the code in `main.rs`.

We need to make use of Rocket's [fairings] and Tera's [Context].

[fairings]: https://rocket.rs/guide/fairings/
[Context]: http://clux.github.io/blog/tera/struct.Context.html

```rust
// Inside `src/bin/main.rs`

#![feature(plugin, custom_derive)]
#![plugin(rocket_codegen)]

extern crate rocket;
extern crate rocket_contrib;
extern crate tera;

// Bring both Template and Context into scope
use rocket_contrib::Template;
use tera::Context;

fn main() {
    rocket::ignite()
        .mount("/", routes![index])
        .attach(Template.fairing()) // This lets us use templating
        .launch();
}

#[get("/")]
fn index() -> Template {
    let mut context = Context::new();

    context.add("my_message", "Heya from template context!");
    Template::render("layout", &context);
}
```

Go ahead.. just try compiling that :P.

```bash
error[E0277]: the trait bound `str: std::marker::Sized` is not satisfied
  --> src/bin/main.rs:22:13
   |
22 |     context.add("my_message", "Heya from template context!");
   |             ^^^ `str` does not have a constant size known at compile-time
   |
   = help: the trait `std::marker::Sized` is not implemented for `str`
```

Ugh. It's saying the second parameter to `context.add()` doesn't have a size that can be verified at compile time.
If we check out the rust docs for the [Sized] trait,
we'll see that it says

[Sized]: https://doc.rust-lang.org/std/marker/trait.Sized.html

> Types with a constant size known at compile time.

Our second parameter (the message) is a string literal, aka `&str`, aka `string slice`.
[This] stack overflow post explains `str` has a dynamic length,
which is why the size is not known at compile time.
A `String` does have a size at compile time because it has a `capacity`.
Let's try converting our string literal to a `String` with `String::from()` or `to_string()`.
Oh also, for reference checkout the rust docs on [`str`] and [`String`].

```rust
    context.add("my_message", String::from("Heya from template context!"));
```


[This]: https://stackoverflow.com/questions/24158114/what-are-the-differences-between-rusts-string-and-str
[`str`]: https://doc.rust-lang.org/1.20.0/book/second-edition/ch04-03-slices.html
[`String`]: https://doc.rust-lang.org/1.20.0/book/second-edition/ch08-02-strings.html


```bash
  --> src/bin/main.rs:22:31
   |
22 |     context.add("my_message", String::from("Heya from template context!"));
   |                               ^^^^^^^^^^^^^^^^^^^^^^^^ expected reference, 
   | found struct `std::string::String`
   |
   = note: expected type `&_`
              found type `std::string::String`
   = help: try with `&String::from("Heya from template context!")`
```

*AHHH!!!!11!1!*, Okay. I'll just read the error message again and figure this out.

*expected reference and found struct String* .
We gave context an actual `String` value, but it was expecting a reference passed in.
Okay... Try this. References to the rescue!

```rust
    context.add("my_message", &String::from("Heya from template context!"));
    Template::render("layout", &context);
```

`cargo run`. Niiiiice! This works, but we could've checked out the docs for [Tera::Context] a little more closely.
For the `add()` method, the `val` argument accepts a reference(&, remember?) for any type that implements `Serialize`.

*clicks ["Serialize"](https://docs.serde.rs/serde/ser/trait.Serialize.html)*

> A data structure that can be serialized into any data format supported by Serde.
>
> Serde provides Serialize implementations for many Rust primitive and standard library types. 
> The complete list is here. All of these can be serialized using Serde out of the box.

*clicks ["here"](https://docs.serde.rs/serde/ser/index.html)*

Wow, looks like `Serialize` is implemented for both `str` and `String` already.
Maaaaaybe we didn't have to do the conversion to a `String`?

```rust
context.add("my_message", &"Heya from template context!");
```

[Tera::Context]: https://docs.rs/tera/0.8.1/tera/struct.Context.html

Fantastic! `cargo run` again and navigate to `localhost:8000` in your browser.
You should see not only the content hard-coded into `<p>` tag, but also the `<p>` context content that was generated inside route.
Templates are working and showing "dynamic" data for us. Thanks for sticking around and reading thus far.
The very last line of our `index()` function loads & renders the template by pointing to the template path and giving it a reference
to the `Context` we made. Rocket automatically looks in the `/templates` folder and will match them by their prefix.
ie. `layout` instead of `layout.html.tera`.

In the next post we will explore
- Seeding the database with posts
- Listing those posts on the index page
- Creating & understanding a database thread pool

## <a name="references"></a>References

- [Diesel Getting Started Guide](http://diesel.rs/guides/getting-started/)
- [Rocket Hello World Example](https://rocket.rs/guide/getting-started/#hello-world)
- [Diesel CLI Source & Guide](https://github.com/diesel-rs/diesel/tree/master/diesel_cli)
- [Rust Community](https://www.rust-lang.org/en-US/community.html)
- [Diesel Gitter](https://gitter.im/diesel-rs/diesel)
- [Crates and Cargo](http://doc.crates.io/manifest.html)
- [Tera Templating Engine](https://github.com/Keats/tera)
- [Jinja Templating Engine](http://jinja.pocoo.org/) => Inspired tera and shares a lot of the api
- [serde::ser::Serialize](https://docs.serde.rs/serde/ser/trait.Serialize.html)
