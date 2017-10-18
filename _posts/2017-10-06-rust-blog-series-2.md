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
and using some very simple Diesel APIs to seed (add initial dummy data) that database.
At the end of this post, we should have completed two fundamental tasks
1. Seed the database with users and posts,
2. Output each post title and author to our index page.

If you haven't checked out [Part I],
please do as it covers project setup and will be referenced heavily throughout this guide.

[Part I]: ./rust-blog-series-1.html

## infer_schema!

Our "entry point" for Diesel applications.
The Diesel [schema in depth guide] reviews all the options for database schema in greater details.
All we need to know for the purpose of the guide is...

> infer_schema! is a macro provided by diesel_codegen when you have enabled the 
> feature for one or more database backends.
> The macro will establish a database connection at compile time,
> query for a list of all the tables,
> and generate infer_table_from_schema! for each one.
> infer_schema will skip any table names which start with __.

Using `infer_schema!` will give us some implicit benefits for joining tables later in development,
but it's also easy to get started with which is why we're using it here.

To enable this feature, we must create the file `src/schema.rs`

```rust
// Inside `src/schema.rs`

infer_schema!("dotenv:DATABASE_URL");
```

This file will be brought into scope in our `src/lib.rs` file  via a `use` statement.
Doing so will enable access to our schema from anywhere in our app.

[schema in depth guide]: https://github.com/diesel-rs/diesel/blob/master/guide_drafts/schema-in-depth.md


## Database Models

Now that we have a schema, Rust can interact with database tables,
however that is a little different than interacting with a database model
(referring to the "M" of the [MVC] pattern I'm used to in Ruby on Rails).
Diesel is a bit different than other ORMS, in that its main focus is on query building.
I expected to work with a single object as my database model,
however in Diesel you should feel comfortable defining specialized structs to support your queries.
This may seem odd at first, but it should feel more natural by the time we get to designing all CRUD endpoints.

[MVC]: https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller#Components

At the moment, we really only care about two database operations; Create and Read.
This amounts to SQL INSERT and SELECT statements.

We have two database tables, users and posts, and we need to perform two operations on each.
The data structs for our models *may* look like this.
- User
- NewUser
- Post
- NewPost

Lets create a `src/models.rs` file and review the code that goes into it.


```rust
// Inside `src/models.rs`

// This `models` file will also be imported into our `lib`
// We JUST made the schema file...
// Lets take advantage of it by bringing it into scope here
use schema::{posts, users};

#[derive(Debug, Queryable)]
struct User {
    id: i32,
    first_name: String,
    last_name: String,
    email: String,
    password: String, 
}

#[derive(Debug, Insertable)]
#[table_name="users"]
struct NewUser {
    first_name: String,
    last_name: String,
    email: String,
    password: String, 
}

#[derive(Debug, Queryable)]
struct Post {
    id: i32,
    user_id: i32,
    title: String,
    content: String,
    published: bool,
}

#[derive(Debug, Insertable)]
#[table_name="posts"]
struct NewPost {
    user_id: i32,
    title: String,
    content: String,
}

```

If you're thinking *"whoa, whoa, whoa... WUT are those weird DERIVE things?!?!"*,
don't worry, they're your friend!

The `diesel_codegen` crate takes some of those `#[derive()]`'s
and generates boilerplate code so we may focus on the business logic of our application.

`Debug` should look somewhat familiar because it is provided by the Rust language and not Diesel.
It enables you to print/format values that otherwise don't have a way to be printed.
If you're unfamiliar with `Debug`, please check out the official [Derive] docs.

The really interesting derives are `Insertable` and `Queryable`.
`Insertable` is Diesel's way of saying that *the values of this struct map to the columns of a table and can be inserted in a row*

`Insertable` structs should be designed to closely mirror the data being passed around by web forms or API endpoints.
Diesel currently (v0.16) offers `insert(values).into(table)`
as the pattern to generate `INSERT` SQL statements.
This will be deprecated by v1.0(currently in master) in favor of `insert_into(table).values(some_values)`
to mirror the raw SQL you would be writing anyway.
Just by looking at those function signatures,
you can probably see that `Insertable` structs *must* correspond to a single table.
This is also evident from our model file `table_name` annotations.
With `Insertable`, we don't generally include any auto-incrementing primary key columns because our database takes care of that for us.

*Diesel master branch only* - for simple inserts that don't involve deserializng a form / large data structure,
you may use a simple tuple.
This won't be covered in any examples because we're working with 0.16,
but feel free to point to Diesel's master branch 
or use Diesel v1.0 when it's released in late November 2017 to make use of this feature.

[Derive]: https://rustbyexample.com/trait/derive.html

A `Queryable` struct represents data that is returned from a database query.
Most examples you will find show a struct that directly correlates to a database table,
however this doesn't mean that your `Queryable` structs *must* be coupled directly to a single table.
You may have a `Queryable` struct that represents the result of a complex query over several tables.
`Queryable` only cares about the order of the fields returned and their types.

Diesel supports nearly all database column types and maps them to Rust values.
In our current models file, we are primarily using Rust types `i32`, and `String`,
but we will eventually use
`&str`, and datetime types from the `chrono` crate in another blog post.
Diesel supports custom types, but this requires some impls on your part.
We will not be covering advanced cases like that in this blog series.

One small thing to note is our `NewPost` struct is missing the `published` field.
This is because it has a default value of `FALSE` (see [Part I]).
Thinking ahead, we will want a feature of the app to publish posts after they are done.
This is one way of keeping posts in a *draft* state.

There are several more derives available in Diesel.
They are not entirely important for the goals we defined earlier,
however we will be making extensive use of them in Part III of this series.

## Database Connection

The first thing we need to consider when linking Rocket to Diesel is our database connection.
Without this part of our application,
the Rocket framework will never be able to work with the Diesel framework and our backend database.

A good place to start getting some ideas is from elementary documentation.
The [Diesel Getting Started] guide introduces us to database connections.

```rust
// From the official Diesel page
#[macro_use] extern crate diesel;
extern crate dotenv;

use diesel::prelude::*;
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

The next four `use` statements bring some modules into scope from those libraries.
`diesel::prelude::*;` imports a whole lot of wonderful parts of the diesel api,
which allow us build SQL queries out of diesel methods.

Turn your attention to the `establish_connection()` function.

```rust
pub fn establish_connection() -> PgConnection {
    dotenv().ok(); // Grab ENV vars from `.env`

    // Pull value from `DATABASE_URL` ENV var
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    // Establishes a connection to the DB
    // https://docs.diesel.rs/diesel/connection/trait.Connection.html#tymethod.establish
    PgConnection::establish(&database_url)
        .expect(&format!("Error connecting to {}", database_url))
}
```

`establish_connection` returns a [`PgConnection`], which is the connection to our Postgres database.
If we were to use SQLite or MySQL,
then our return type would be of a different connection type.
All backend connection types are now imported with the `diesel::prelude`.

Remember that `.env` file from [Part I] of the series?
Besides `diesel setup`,
it is also useful when making database connections inside our application.

`dotenv().ok();` loads the environment variables from our `.env` file, which should be in the current directory
or any of the parent directories. Documentation for `dotenv` can be found [here](https://github.com/purpliminal/rust-dotenv).

The `database_url` variable grabs the database url string from the environment variables we just loaded and unwrapped via the `expect()` method.
We can then call the [`establish()`] method provided by `PgConnection` and pass in the `database_url`, which will grant us a connection to
our Postgres database!

[Diesel Getting Started]: http://diesel.rs/guides/getting-started/
[`PgConnection`]: https://docs.diesel.rs/diesel/pg/struct.PgConnection.html
[`establish()`]: https://docs.diesel.rs/diesel/connection/trait.Connection.html#tymethod.establish


## Connection Pools

The previous code works well in isolation, but also poses some scalability problems.
I think I [remember reading somewhere] that establishing a database connection is expensive.
Most ORMs use a [*prepared statement cache*] which stores our queries to avoid re-parsing and processing.
Our database backend might be processing statements from multiple clients concurrently
and can be slowed down if it unnecessarily repeats operations.
In fact, database connections aren't the only type of connections that benefit from being reused.
Most browsers reuse connections for HTTP requests because even the cost of a TCP handshake can impact performance.

For these reasons,
we don't really want every single visitor to our blog opening up a new database connection everytime they hit a route.
What we need is a [Connection Pool].
Connection pools are a *cache* / store of connections that stick around
and can be reused to help enhance the performance of executing commands on our database.
When a connection is needed, it is plucked from the pool, used,
and then returned back to be available for another connection.

[*prepared statement cache*]: http://www.theserverside.com/news/1365244/Why-Prepared-Statements-are-important-and-how-to-use-them-properly
[remember reading somewhere]: https://stackoverflow.com/questions/34303678/database-connection-expensive-to-create
[Connection Pool]: https://en.wikipedia.org/wiki/Connection_pool

[r2d2] is a generic connection pool library for Rust and it happens to have an adapter for Diesel, [r2d2-diesel]!
We'll be using the both libraries to manage the connection pool to our Postgres database.

[r2d2]: https://github.com/sfackler/r2d2
[r2d2-diesel]: https://github.com/diesel-rs/r2d2-diesel

Our immediate goal:
- set up a database connection pool so Rocket may pass around connections to Postgres

Be forewarned, I'm going to make an arbitrary design decision here and put all our connection logic into `src/lib.rs`.
This will leave `src/bin/main.rs` to hold all the Rocket initialization / setup.
Consequently, all of our app business logic will be pulled together in `lib.rs` from other modules,
leaving most of our files focused and arranged by features.

Remember `src/schema.rs` and `src/models.rs`?
They will both be re-exported by our `lib` so various parts of our application may make use of them.

I should cover [Rocket Request Guards] and [Managed State] before we get started,
because they're fundamental to any Rocket application - even at this stage.
Request guards are *similar* to middleware, in that they intercept requests.
A request guard is mainly used for request validation and can force redirection based on their outcome.
The validation policy can be built in, like we see from standard rocket request objects (ie. web forms),
or we can implement our own custom validation policies like we will for accessing the connection pool.

Any type that implements the `FromRequest` trait is a request guard.
Rocket automatically invokes the implementation of each request guard 
before it is passed to the route handler.
Rocket will only dispatch requests to the handler when all request guards are validated.
It is important to note that we won't be implementing this trait directly on our database connection.
Our database connection must be "validated" in each route that needs a connection (a route that modifies the database).
This behavior shouldn't be on the connection pool itself,
rather we wrap our connection pool in a tuple struct that implements the Request Guard behavior.
That wrapper will be able to determine if a connection is available to use.

In order for us to implement `FromRequest`,
we must define the [`from_request()`] required method.
`from_request()` is the method that is invoked to perform validation.
Each request can carry some type of "global" state around that is managed by your Rocket application.
This is a feature of Rocket called `Managed State`

Managed State is registered when we are setting up our Rocket app by
invoking the `manage()` method on our Rocket instance.
Rocket can only keep track of one state per given type.
That is to say, Rocket can only manage one `DbConn`
(the tuple struct we are wrapping our connection pool with).
We can access this application state from within our request guards 
via the `request::guard::<State<T>>()` method.
Without even writing this code yet, we know each Request Guard will take in a Request object, with a guard property, that manages some State<T>.


Before you jump down to the next section, which will be quite a bit of code, let's have a look at the [Rocket
Managed State and Connection Guard] documentation to see if this can help us out. 
I won't replicate that code here, because it can get long and we're going to build a slightly modified version.

[Rocket Request Guards]: https://rocket.rs/guide/requests/#request-guards
[Managed State]: https://rocket.rs/guide/state/
[`from_request()`]: /from_requestFIXME
Without further ado, check out our code!

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

// These two mod declarations re-export those files / modules.
// schema contains the `infer_schema!` macro to help generate table APIs.
// models are be our database models we setup in `src/models.rs`
// We re-export so any file that includes this `lib.rs`, may have access
// to these as well.
pub mod schema;
pub mod models;

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


// This should look somewhat similar to the diesel establish_connection() example, 
// but we're setting up a connection pool instead of a single connection.
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
// It is accessed with the notation `my_tuple_struct.0` and will serve as a wrapper
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
        // If the `get()` returns an Error, we're returning a tuple with the
        // signature (SomeFailureType, ())
        match pool.get() {
            Ok(conn) => Outcome::Success(DbConn(conn)),
            Err(_) => Outcome::Failure((Status::ServiceUnavailable, ())),
        }
    }
}


// This is not immediately apparent, but because our connection is wrapped up
// in a PooledConnection, we have a few layers of indirection between
// the DbConn tuple-struct and the actual PgConnection.
//
// PooledConnection is a smart pointer referencing a connection.
// Doc: https://docs.rs/r2d2/0.7.4/r2d2/struct.PooledConnection.html
//
// We implement Deref because we want that PgConnection directly and it's behind a smart pointer.
// PooledConnection already implements Deref to do this, but our Managed State has a hold of
// DbConn, the wrapper!
//
// Implementing Deref for DbConn enables us to write `&*connection_variable` when we want
// to get at the actual connection.
// Deref Rust Docs: https://doc.rust-lang.org/std/ops/trait.Deref.html
impl Deref for DbConn {
    type Target = PgConnection;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

```

Run either `cargo run` or `cargo build` at this point to compile the app.
You should still see the same output from the previous blog post if you're running it,
as we haven't changed anything from the perspective of a visiting user.
The last objective which ties everything together will be seeding the database
and outputting that seed data to the user.

## Seeding the Database

Seeding the database is really only used for the dev environment, but may also be applicable for test environments as well.
If you're unsure what seeding the database is - it's just generating a bunch of dummy data to fill our database.
It might be hard to develop this app if we didn't have any posts or users to load,
especially if we want to experiment with different SQL queries or do some UI/UX design!

There are a number of ways to go about seeding, but from my experience in the Ruby on Rails world,
I decided to go with a seed file. 

Go ahead and make a `src/bin/seed.rs` rust file.

We're adding this file to the `bin` directory, so we'll have to make some adjustments to `Cargo.toml` to alert
Cargo that we have another bin. The consequence of this is we need to be a little more verbose when compiling/running.
Instead of `cargo run` or `cargo build`, we'll be typing `cargo run --bin seed` or `cargo run --bin main`.
The last argument being passed in is the name of the `bin` that we want to run or build.
I'm arbitrarily naming them `seed` and `main`, but you'll see we can name these whatever we want.
Let's take a look at what needs to be added to `Cargo.toml`.

```rust
// Inside `Cargo.toml`

[package]
name = "lil blog"
version = "0.1.0"
authors = ["Ryan B <notryanb@gmail.com>"]

// Here we've renamed the lil_blog bin to `main`
// `cargo run --bin main` will point to the path we define here
[[bin]]
name = "main"
path = "src/bin/main.rs"

// Here we've added a new bin to target named `seed`
// `cargo run --bin seed` will point to the path we define here
[[bin]]
name = "seed"
path = "src/bin/seed.rs"

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

// Adding the fake crate for seeding purposes.
// This crate will randomly generate all types of information for us
// Docs: https://github.com/cksac/fake-rs
fake = "*"

# SYS
dotenv = "0.10"

```

Our seed file needs to accomplish two things.
- Generate a bunch of users
- Generate a bunch of posts

There are a few more gotchas we need to take into account while seeding the database.
We need to generate random dummy data and also make sure our application isn't
storing plain text passwords.


```rust
// `src/bin/seed.rs`

// First thing we need to do is import some more crates.
// This file is essentially stand-alone code and ideally will
// not be run very often.

// This is our lib file and the name we gave it from `Cargo.toml`
// We need this import for the `create_db_pool()` function we just made!
extern crate lil_lib;

// bcrypt is used for secure hashing of passwords.
// Important for password security
extern crate bcrypt; 

// We will be doing some work in the database, so we need diesel here
extern crate diesel;

// The `fake` crate makes heavy use of rust macros for its api,
// so we'll need that `#[macro_use]` prefix to use them.
#[macro_use] extern crate fake;

// These are the modules we'll need to bring into scope.
// They will be apparent from their use in the soon-to-be-written code
use bcrypt::{DEFAULT_COST, hash};
use diesel::prelude::*;
use lil_lib::*;
use lil_lib::models;

fn main() {
    // `infer_schema!` is important here
    // Here we bring all the availble Diesel DSL methods into scope
    // so we can interact with the database tables
    use schema::posts::dsl::*;
    use schema::users::dsl::*;

    // This is going to be our database connection that we worked so hard
    // on in the `src/lib.rs` file.
    let connection = create_db_pool().get().unwrap();

    // We want to store a password on the User records, but NOT THE PLAIN TEXT PW!!!
    // We must have an easy password for dev environments, but also follow the secure
    // practice of hashing passwords. 
    // Here we create a `&str` and then hash it using the `bcrypt` library.
    let plain_text_pw = "testing";
    let hashed_password = match hash (plain_text_pw, DEFAULT_COST) {
        Ok(hashed) => hashed,
        Err(_) => panic!("Error hashing")
    };

    // I like to clear out the database before each time I run the seed file. 
    // Posts goes first here because we will eventually be making use
    // of foreign key constraints. The reverse order will throw errors in the DB.
    diesel::delete(posts).execute(&*connection).expect("Error deleteing posts");
    diesel::delete(users).execute(&*connection).expect("Error deleteing users");

     // Randomly generate user info.
     // Pass in the hashed password.
     // `fake!()` macro will return a String value for us to insert into the DB.
     fn generate_user_info(pw: &str) -> NewUser {
         NewUser {
            first_name: fake!(Name.name),
            last_name: fake!(Name.name),
            email: fake!(Internet.free_email),

            // the password being passed in is a &str, aka slice.
            // We must convert it to String.
            password: pw.to_string(),
         }
     }

     // Randomly generate post info
     fn generate_post_info(uid: i32) -> NewPost {
         NewPost {
            user_id: uid,
            title: fake!(Lorem.sentence(1, 4)),
            content: fake!(Lorem.paragraph(5,5)),
         }
     }

     // Create personal login
     let me = NewUser {
         first_name: "Ryan".to_string(),
         last_name: "B".to_string(),
         email: "notryanb@gmail.com".to_string(),
         password: hashed_password.to_string(),
     };

     // Using Diesel Insert api to create an INSERT statement
     // and execute with the connection. 
     // NOTE: This api form will be deprecated for Diesel 1.0.
     // Check Diesel docs, as it's currently in master now.
     diesel::insert(&me)
         .into(users)
         .execute(&*connection)
         .expect("Error inserting users");

     // Create 10 randomly generated users stored in a vec
     let new_user_list: Vec<NewUser> = (0..10)
         .map( |_| generate_user_info(&hashed_password))
         .collect();

     // INSERT that vec of users and get a vec back of the newely inserted users.
     // They will have ids that we can assign to the posts.
     let returned_users = diesel::insert(&new_user_list)
         .into(users)
         .get_results::<User>(&*connection)
         .expect("Error inserting users");

     // For each of the new users, create some posts
     let new_post_list: Vec<NewPost> = returned_users
         .into_iter()
         .map(|user| generate_post_info(user.id))
         .collect();

      // Insert those posts
      diesel::insert(&new_post_list)
          .into(posts)
          .execute(&*connection)
          .expect("Error inserting posts");
}

```

If you'd like the visual feedback, add some `println!()` macros after the INSERTS or queries for confirmation from the seed file.
We'll be confirming directly from Postgres.
Get into your database via the Postgres CLI with the following command.
Make sure to use the database name that is in your DATABASE_URL.

> psql lil_blog

Once logged in, you should be able to run both of these commands and get back some nice table data.

> SELECT * FROM users;

Queries and returns user data

> SELECT * FROM posts;

Queries and returns post data

Woohoo! Wow, pretty impressive. We have one last step. Lets take a quick breather and review what was done so far.

- Setup / generated database schema via Diesel macros
- Created models file which has all of the models we currently need for seeding.
- Setup out Postgres connection pool.
- Configured a Rocket request guard that wraps our database connection
- Update our dependencies
- Seeded the database.

Lets direct out attention back to `src/bin/main.rs` , configure our managed state and log some posts / users.

```rust
// Inside `src/bin/main.rs`

#![feature(plugin, custom_derive)]
#![plugin(rocket_codegen)]

extern crate lil_blog;
extern crate diesel;
extern crate rocket;
extern crate rocket_contrib;
extern crate tera;

use diesel::prelude::*;
use lil_blog::*;
use lil_blog::models::*;
use rocket_contrib::Template;
use tera::Context;

fn main() {
    rocket::ignite()
        .manage(create_db_pool()) // Register connection pool with Managed State
        .mount("/", routes![index])
        .attach(Template::fairing())
        .launch();
}

// Check out our DbConn Request Guard!
// Our route now has access to a database connection.
// It's dereferrenced when passed into the `load()` method.
#[get("/")]
fn index(connection: DbConn) -> Template {
    use schema::posts::dsl::*;
    use schema::users::dsl::*;

    let mut context = Context::new();
   
    // `load()` returns all the records from each table it is called on.
    // the `posts::dsl::*` enables us to use `posts` instead of `posts::table`
    // the types <Post> and <User> are imported by `lib_blog::models::*`
    let post_list = posts.load::<Post>(&*connection).expect("Error loading posts");
    let user_list = users.load::<User>(&*connection).expect("Error loading users");
  
    context.add("posts",&post_list);
    context.add("users",&user_list);

    Template::render("layout", &context)
}
```

The above code won't compile *just yet*.
Lets update the base layout page and see what errors we get afterwards.
We're going to iterate over both post_list and user_list and output some data.
To do this, we use some tera iteration syntax and get access
to a local variable inside each pass.
From there we can access each property of the struct... as long as it was *serialized*.

```rust
<!-- inside `base.html.tera` -->
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8" />
    </head>
    <body>
        <div class="container">
          <h1>MOAR POSTS AND USERS!</h1>{% raw %}
          {% for user in users %}
            <p>{{ user.first_name }} {{ user.last_name }} - {{ user.email }}</p>
          {% endfor %}

          {% for post in posts %}
            <h2>{{ post.title }}</h2>
            <p>{{ post.content }}</p>
          {% endfor %} {% endraw %}
        </div>
    </body>
</html>
```

Now give this a try

> cargo run --bin main

```rust
error[E0277]: the trait bound `lil_lib::models::Post: serde::ser::Serialize` is not satisfied
  --> src/bin/main.rs:35:13
   |
35 |     context.add("posts", &post_list);
   |             ^^^ the trait `serde::ser::Serialize` is not implemented 
for `lil_lib::models::Post`
   |
   = note: required because of the requirements on the impl of `serde::ser::Serialize` 
            for `std::vec::Vec<lil_lib::models::Post>`

error[E0277]: the trait bound `lil_lib::models::User: serde::ser::Serialize` is not satisfied
  --> src/bin/main.rs:36:13
   |
36 |     context.add("users", &user_list);
   |             ^^^ the trait `serde::ser::Serialize` is not implemented 
for `lil_lib::models::User`
   |
   = note: required because of the requirements on the impl of `serde::ser::Serialize` 
            for `std::vec::Vec<lil_lib::models::User>`

error: aborting due to 2 previous errors
```

Sorry! I knew this would happen!!!
Each error is pointing to the fact that we need to `Serialize` our lists.
The [`Context::add`] docs will show us that exact trait bound.
When the response is sent over the wire, we can't transmit an actual Rust struct,
but we can transmit some serialized data whether it's text, json, etc.
We need to add the `serde_derive` library and *derive* `Serialize` for the User and Post structs.

[`Context::add`]: http://clux.github.io/blog/tera/struct.Context.html#method.add

We already have a few serde libs in our `Cargo.toml`,
so we just need to import one for now and bring the important parts into scope.
Please open up your lib.rs file.

```rust
// `src/lib.rs`

// ... obfuscated code
extern crate rocket;
extern crate rocket_contrib;
#[macro_use] extern crate serde_derive; // <- Add this anywhere on top

pub mod schema;
pub mod models;

// ... obfuscated code

```

```rust
// `src/models.rs`

use schema::{posts, users};

// Add that `Serialize` derive
#[derive(Debug, Queryable, Serialize)]
struct User {
    id: i32,
    first_name: String,
    last_name: String,
    email: String,
    password: String, 
}

// ... obfuscated code

// And again here.
#[derive(Debug, Queryable, Serialize)]
struct Post {
    id: i32,
    user_id: i32,
    title: String,
    content: String,
    published: bool,
}

// ... obfuscated code
```

Go for it!

> cargo run --bin main

*Drum Roll*...
...
...
TADA! If all is well, you'll see a bunch of users output followed by a bunch of posts.
Congrats if you made it this far.
We've only started our amazing journey with using Rust on the web.

## Conclusion

In Part III we will explore more of Rocket, setting up endpoints for
creating, reading, updating, destroying our posts,
adding a "lil style" via css,
and associating tables / joining in Diesel.

The following section will feature all of the files with comments removed
and a list of references to help reinforce some of the concepts we've covered.
If you have found any errors with the information presented,
found any aspects confusing,
or would like to add some important missing pieces of information,
feel free to open a [pull request](https://github.com/notryanb/notryanb.github.io)
or create an issue in my [repo](https://github.com/notryanb/notryanb.github.io)

## Our Folder Structure & Files w/o Comments

```rust
// Folder Structure

|
|_ /migrations
|_ /src
    |_ lib.rs
    |_ models.rs
    |_ schema.rs
    |_ /bin
       |_ main.rs
       |_ seed.rs
|_ /target
|_ /templates

```


```rust
// `src/lib.rs`

#![feature(plugin, custom_derive)]
#![plugin(rocket_codegen)]

#[macro_use] extern crate diesel;
#[macro_use] extern crate diesel_codegen;
extern crate dotenv;
extern crate r2d2;
extern crate r2d2_diesel;
extern crate rocket;
extern crate rocket_contrib;
#[macro use] serde_derive;

pub mod schema;
pub mod models;

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

```rust
// Inside `src/bin/main.rs`

#![feature(plugin, custom_derive)]
#![plugin(rocket_codegen)]

extern crate lil_blog;
extern crate diesel;
extern crate rocket;
extern crate rocket_contrib;
extern crate tera;

use diesel::prelude::*;
use lil_blog::*;
use lil_blog::models::*;
use rocket_contrib::Template;
use tera::Context;

fn main() {
    rocket::ignite()
        .manage(create_db_pool())
        .mount("/", routes![index])
        .attach(Template::fairing())
        .launch();
}

#[get("/")]
fn index(connection: DbConn) -> Template {
    use schema::posts::dsl::*;
    use schema::users::dsl::*;

    let mut context = Context::new();
   
    let post_list = posts.load::<Post>(&*connection).expect("Error loading posts");
    let user_list = users.load::<User>(&*connection).expect("Error loading users");
  
    context.add("posts", &post_list);
    context.add("users", &user_list);

    Template::render("layout", &context)
}
```
```rust
// Inside `src/models.rs`

use schema::{posts, users};

#[derive(Debug, Queryable, Serialize)]
struct User {
    id: i32,
    first_name: String,
    last_name: String,
    email: String,
    password: String, 
}

#[derive(Debug, Insertable)]
#[table_name="users"]
struct NewUser {
    first_name: String,
    last_name: String,
    email: String,
    password: String, 
}

#[derive(Debug, Queryable, Serialize)]
struct Post {
    id: i32,
    user_id: i32,
    title: String,
    content: String,
    published: bool,
}

#[derive(Debug, Insertable)]
#[table_name="posts"]
struct NewPost {
    user_id: i32,
    title: String,
    content: String,
}

```

```rust
// `src/bin/seed.rs`

extern crate lil_lib;
extern crate bcrypt; 
extern crate diesel;
#[macro_use] extern crate fake;

use bcrypt::{DEFAULT_COST, hash};
use diesel::prelude::*;
use lil_lib::*;
use lil_lib::models;

fn main() {
    use schema::posts::dsl::*;
    use schema::users::dsl::*;
    
    let connection = create_db_pool().get().unwrap();
    let plain_text_pw = "testing";
    let hashed_password = match hash (plain_text_pw, DEFAULT_COST) {
        Ok(hashed) => hashed,
        Err(_) => panic!("Error hashing")
    };

    diesel::delete(posts).execute(&*connection).expect("Error deleteing posts");
    diesel::delete(users).execute(&*connection).expect("Error deleteing users");

    fn generate_user_info(pw: &str) -> NewUser {
        NewUser {
            first_name: fake!(Name.name),
            last_name: fake!(Name.name),
            email: fake!(Internet.free_email),

            password: pw.to_string(),
         }
     }

    fn generate_post_info(uid: i32) -> NewPost {
        NewPost {
          user_id: uid,
          title: fake!(Lorem.sentence(1, 4)),
          content: fake!(Lorem.paragraph(5,5)),
        }
    }

    let me = NewUser {
        first_name: "Ryan".to_string(),
        last_name: "B".to_string(),
        email: "notryanb@gmail.com".to_string(),
        password: hashed_password.to_string(),
    };

    diesel::insert(&me)
        .into(users)
        .execute(&*connection)
        .expect("Error inserting users");

    let new_user_list: Vec<NewUser> = (0..10)
        .map( |_| generate_user_info(&hashed_password))
        .collect();

    let returned_users = diesel::insert(&new_user_list)
        .into(users)
        .get_results::<User>(&*connection)
        .expect("Error inserting users");

    let new_post_list: Vec<NewPost> = returned_users
        .into_iter()
        .map(|user| generate_post_info(user.id))
        .collect();

    diesel::insert(&new_post_list)
        .into(posts)
        .execute(&*connection)
        .expect("Error inserting posts");
}

```

```rust
// Inside `src/schema.rs`

infer_schema!("dotenv:DATABASE_URL");
```

## <a name="references"></a>References
- [Diesel Statement Cache Interal Docs](https://github.com/diesel-rs/diesel/blob/d30821a6625a574b77ab9aaaeedf7283676d3946/diesel/src/connection/statement_cache.rs#L1-L91)
- [Rocket Request Guards](https://rocket.rs/guide/requests/#request-guards)
- [About Connection Pools](https://en.wikipedia.org/wiki/Connection_pool)
- [Dotenv docs](https://docs.rs/dotenv/0.10.1/dotenv/)
