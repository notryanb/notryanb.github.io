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

The previous code works well in isolation, but also poses some scalability problems.
I think I remember reading somewhere that establishing a database connection is expensive and it also takes some time.
We don't really want every single visitor to our blog opening up a new connection everytime they hit a route.
What we need is a [Connection Pool].
Connection pools are a *cache* / store of connections that stick around
and can be reused to help enhance the performance of exeuting commands on our database.
When a connection is needed, it is plucked from the pool, used,
and then returned back to be available for another connection.

[Connection Pool]: https://en.wikipedia.org/wiki/Connection_pool

[r2d2] is a generic connection pool library for Rust and it happens to have an adapter for Diesel, [r2d2-diesel]!
We'll be using the r2d2-diesel library to manage the connection pool to our Postgres database.

[r2d2]: https://github.com/sfackler/r2d2
[r2d2-diesel]: https://github.com/diesel-rs/r2d2-diesel

Our immediate goal:
- set up a database connection pool with Rocket so it may talk to Diesel

Be forewarned, I'm going to make an arbitrary design decision here and put all our connection logic into `src/lib.rs`.
This will leave `src/bin/main.rs` to hold all the Rocket initialization / setup.
Consequently, all of our app business logic will be pulled together in `lib.rs` from other modules,
leaving most of our files focused and arranged by features.

I *would* like to cover [Rocket Request Guards] before we get started,
because they're fundamental to any Rocket application - even at this stage.
Request guards are similar to middleware, in that they intercept requests.
The validation policy can be built in, like we see from standard rocket request objects,
or we can implement our own custom validation policies.

Any type that implements the `FromRequest` trait is a request guard.
This is something we'll be using on our database connection to ensure type safety for every request.
In order for us to implement `FromRequest`,
we must define the [`from_request()`] required method.
This will become more interesting in later posts when we ensure user authentication
via the type system! =)

Before you jump down to the next section, which will be quite a bit of code, let's have a look at the [Rocket
Managed State and Connection Guard] documentation to see if this can help us out. 
I won't replicate that code here, because it can get long and we're going to build a slightly modified version.


[Rocket Request Guards]: https://rocket.rs/guide/requests/#request-guards
['from_request()`]: /from_requestFIXME
With further ado, check out our code!

[Rocket Managed State and Connection Guard]: https://rocket.rs/guide/state/#managed-pool


This is a lot of code and looks scary, but we're going to look at each portion in isolation to get a better understanding.

```rust

// Inside `src/lib.rs`

// Imports Diesel lib for database interaction and code generation for the 
// Diesel api
#[macro_use]
extern crate diesel;
#[macro_use]
extern crate diesel_codegen;

// Access to ENV vars - as we saw from the first example
extern crate dotenv;

// Connection Pool lib + plugin for Diesel
extern crate r2d2;
extern crate r2d2_diesel;

// Rocket lib + api
extern crate rocket;
extern crate rocket_contrib;

// Bring each necessary module into scope.
// These will be modules we reference in the rest of the file
use dotenv::dotenv;
use diesel::prelude::*;
use r2d2::{Config, Pool, PooledConnection};
use r2d2_diesel::ConnectionManager;
use rocket::{Outcome, Request, State};
use rocket::http::Status;
use rocket::request::{self, FromRequest};
use std::env;
use std::ops::Deref;


// This should look vaguely familiar, but we're setting up a connection pool
// instead of a single connection.
// Notice the return type is r2d2::Pool of type r2d2_diesel::ConnectionManager
// of type diesel::pg::PgConnection.
// We imported all those modules to avoid the nasty prefixing.
// We'll take a look at that a little bit later in the docs.
pub fn create_db_pool() -> Pool<ConnectionManager<PgConnection>> {
    dotenv().ok(); // Grabbing ENV vars

    // Pull DATABASE_URL env var
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    // Set default config for connection pool
    // r2d2::Config Docs: https://docs.rs/r2d2/0.7.4/r2d2/struct.Config.html
    let config = Config::default();

    // Create a connection pool manager for a Postgres connection at the `database_url`
    let manager = ConnectionManager::<PgConnection>::new(database_url);

    // Create the pool with the default config and the r2d2_diesel connection manager
    Pool::new(config, manager).expect("Failed to create pool.")
}

// This is the struct we will be passing around as a request guard.
// DbConn is a tuple-struct, which only has one field.
// It is accessed by `my_tuple_struct.0` and will serve as a wrapper
// to implent the FromRequest trait on.
pub struct DbConn(PooledConnection<ConnectionManager<PgConnection>>);

// Our impl of FromRequest for our DbConn tuple-struct.
// This is what actually enables our connection pool to become
// a request guard.
// Docs: https://api.rocket.rs/rocket/request/trait.FromRequest.html
impl<'a, 'r> FromRequest<'a, 'r> for DbConn {
    type Error = (); // Associated type, we must have an error we can `Debug`

    // This is our required method that does all the dirty work.
    // Because FromRequest is a "validation", we can put whatever logic we want in here
    // as long as it conforms to the function signature.
    fn from_request(request: &'a Request<'r>) -> request::Outcome<DbConn, ()> {

        // This next part is a little dense, but what it's doing is grabbing the 
        // `guard` property off of the `request` object. From there we have to give
        // it a type, which you'll see in this massive turbofish ::<<<<>>>.
        // ...Might be a world record :P

        // The outside most type is State, which is the managed state we will be registering
        // with our rocket app when we initialize it. Don't worry, we'll get to that soon enough,
        // but you'll have to trust me here.
        let pool = request.guard::<State<Pool<ConnectionManager<PgConnection>>>>()?;

        // Here were are using the `get()` method from the connection pool to grab 
        // the connection. If it's Ok, return the DbConn tuple-struct we made
        // wrapped in an `Outcome` to conform to the function signature.
        // If the `get()` returns an error, we're giving back  a tuple with the
        // signature (FailureType, ())
        match pool.get() {
            Ok(conn) => Outcome::Success(DbConn(conn)),
            Err(_) => Outcome::Failure((Status::ServiceUnavailable, ())),
        }
    }
}


// This is not as intuitive, but because our connection is wrapped up
// in the connection pool, we have a few layers of indirection between
// the DbConn tuple-struct and the actual PgConnection. 
//
// We implement Deref because we want that PgConnection directly.
// This enables us to write `&*connection_variable` when we want
// to get at the actual connection.
// Deref Rust Docs: https://doc.rust-lang.org/std/ops/trait.Deref.html
impl Deref for DbConn {
    type Target = PgConnection;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

```

Below is the file without comments

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

