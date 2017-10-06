---
layout: post
title:  "Making a simple blog with Rust: Part II"
date:   2017-10-06
categories:
- rust
- programming
- rocket
- diesel
---

Welcome to Part II in our Rust blog hacking adventure.
In this post, we'll be learning about connecting to the database
and using some very simple Diesel APIs to seed that database.
At the end of this post, we should have completed two fundamental tasks
- Have a seeded database with users and posts,
- Output each post title and author to our index page.

## Database Connection

The first thing we need to consider is our database connection.
Without this part of our application,
the Rocket framework will never be able to work with the Diesel framework and our backend database.

A good place to start getting some ideas is from elementary documentation.
The [Diesel Getting Started] guide introduces us to database connections.

```rust
// From the official Diesel page
#[macro_use] extern crate diesel;
extern crate dotenv;

use diesel::prelude::*;
use diesel::pg::PgConnection;
use dotenv::dotenv;
use std::env;

pub fn establish_connection() -> PgConnection {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    PgConnection::establish(&database_url)
        .expect(&format!("Error connecting to {}", database_url))
}
```

This is a great start.
Let's review the code here so we can understand the pros and cons of this approach.
The first two lines import the libs we need.
We need Diesel for our ORM/Query building and [dotenv] to pull out our database url we've stored in the `.env` file
from [Part I] of this series.

[dotenv]: https://github.com/purpliminal/rust-dotenv
[Part I]: 2017-09-15-rust-blog-series-1.md // FIXME BAD LINK

The next four `use` statments bring some modules into scope from those libraries.
`diesel::prelude::*;` imports a whole lot of wonderful parts of the diesel api,
which allow us build sequel queries out of diesel methods.

Turn your attention to the `establish_connection()` function.

```rust
pub fn establish_connection() -> PgConnection {
    dotenv().ok(); // Grab ENV vars from `.env`

    // Pull value from `DATABASE_URL` ENV var
    // `expect()` is used because env::var returns a Result
    // https://doc.rust-lang.org/std/env/fn.var.html
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    // Establishes a connection to the DB
    // again, `expect()` is used because a ConnectionResult is returned.
    // https://docs.diesel.rs/diesel/connection/trait.Connection.html#tymethod.establish
    PgConnection::establish(&database_url)
        .expect(&format!("Error connecting to {}", database_url))
}
```

`establish_connection` returns a [`PgConnection`], which will let us establish a connection to our Postgres database.
If we were to use Sqlite or Mysql,
then we would use the appropriate diesel imports for those backends and NOT use `pg::PgConnection`.

Remember that `.env` file from Part I of the series?
Well, this is the first important piece of code where we need it.
`dotenv().ok();` loads the environment variables from our `.env` file, which should be in the current directory
or any of the parent directories. Documentation for `dotenv` can be found [here](https://github.com/purpliminal/rust-dotenv).

The `database_url` grabs the database url string from the environment variables we just loaded and unwrapped via the `expect()` method.
We can then call the [`establish()`] method provided by `PgConnection` and pass in the `database_url`, which will grant us a connection to
our Postgres database!

[Diesel Getting Started]: http://diesel.rs/guides/getting-started/
[`PgConnection`]: https://docs.diesel.rs/diesel/pg/struct.PgConnection.html
[`establish()`]: https://docs.diesel.rs/diesel/connection/trait.Connection.html#tymethod.establish


## Connection Pools

I think I remember reading somewhere that establishing a database connection is expensive and it also takes some time.
The previous code works well in isolation,
but we don't really want every single visitor to our blog opening up a new connection everytime they hit a route.
What we need is a [Connection Pool].
Connection pools are a *cache* of connections that stick around
and can be reused to help enhance the performance of exeuting commands on our database.

[Connection Pool]: https://en.wikipedia.org/wiki/Connection_pool

[r2d2] is a generic connection pool library for Rust and it happens to have an adapter for Diesel, [r2d2-diesel]!
We'll be using the r2d2-diesel library to manage the connection pool to our Postgres database.

[r2d2]: https://github.com/sfackler/r2d2
[r2d2-diesel]: https://github.com/diesel-rs/r2d2-diesel

Our immediate goal:
- set up a database connection pool with Rocket so it may talk to Diesel

Be forewarned, I'm going to make an arbitrary design decision here and put all our connection logic into `src/lib.rs`.
This will leave `src/bin/main.rs` to hold all the Rocket setup.
Consequently, all of our app business logic will be pulled together in `lib.rs` from other modules,
leaving most of our files focused and arranged by features.

I *would* like to cover [Rocket Request Guards] before we get started,
because they're fundamental to any Rocket application - even at this stage.
Request guards are similar to middleware, in that they validate requests.
The validation policy can be built in, like we see from standard rocket request objects,
or we can implement our own custom validation policies.

Any type that implements `FromRequest` is a request guard. This is something we'll be using on our database connection
to ensure type safety for every request. This will become more interesting in later posts when we ensure user authentication
via the type system! =)


Before you jump down to the next section, which will be quite a bit of code, let's have a look at the [Rocket
Managed State and Connection Guard] documentation to see if this can help us out. 
I won't replicate that code here, because it can get long and we're going to build a slightly modified version.


[Rocket Request Guards]: https://rocket.rs/guide/requests/#request-guards

With further ado, check out our code!

[Rocket Managed State and Connection Guard]: https://rocket.rs/guide/state/#managed-pool

```rust
#![feature(plugin, custom_derive)]
#![plugin(rocket_codegen)]

#[macro_use]
extern crate diesel;
#[macro_use]
extern crate diesel_codegen;
extern crate dotenv;
extern crate r2d2;
extern crate r2d2_diesel;
extern crate rocket;
extern crate rocket_contrib;
extern crate serde;
#[macro_use]
extern crate serde_derive;
extern crate serde_json;
extern crate tera;

use dotenv::dotenv;
use diesel::prelude::*;
use r2d2::{Config, Pool, PooledConnection};
use r2d2_diesel::ConnectionManager;
use rocket::{Outcome, Request, State};
use rocket::http::Status;
use rocket::request::{self, FromRequest};
use std::env;
use std::ops::Deref;

pub fn create_db_pool() -> Pool<ConnectionManager<PgConnection>> {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let config = Config::default();
    let manager = ConnectionManager::<PgConnection>::new(database_url);
    Pool::new(config, manager).expect("Failed to create pool.")
}

pub struct DbConn(PooledConnection<ConnectionManager<PgConnection>>);

impl<'a, 'r> FromRequest<'a, 'r> for DbConn {
    type Error = ();

    fn from_request(request: &'a Request<'r>) -> request::Outcome<DbConn, ()> {
        let pool = request.guard::<State<Pool<ConnectionManager<PgConnection>>>>()?;
        match pool.get() {
            Ok(conn) => Outcome::Success(DbConn(conn)),
            Err(_) => Outcome::Failure((Status::ServiceUnavailable, ())),
        }
    }
}

impl Deref for DbConn {
    type Target = PgConnection;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
```

Ugh, sorry for the wall of code, but lets review this in chunks so it makes more sense.
While we're on the topic of database connections and resource management, let us ponder about how that happens in Rust.

