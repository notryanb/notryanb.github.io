---
layout: post
title:  "Increasing Rust's Reach: Afterthoughts"
date:   2017-11-01
categories:
- rust
- programming
- reflection
---

It's coming up on the last week of the [Increasing Rust's Reach] program,
which ended up being one of the best projects to help further my programming skills.
This program intended to bring under-represented people into large Rust projects
to help make Rust a more accessible language and foster a welcoming community.
I felt I somewhat fit the criteria as I got started programming late (first software developer job at the age of 30),
had come from a non-technical background (BS Psychology) and *really* wanted to get better at Rust.

## Backstory

I first heard about Rust when I was at a Ruby conference a little over a year ago (Ancient City Ruby 2016).
That is where my soon to be "mentor" Sean Griffin and Rust evangelist Steve Klabnik were speaking.
I was amazed by what Rust had to offer. 
Speed & safety!
The first few attemps at making anything more complex than a simple CLI script 
were very frustrating and I again felt like an incompetant programmer.

Many of the Rubyists I respected seemed to be jumping into this language,
so I kept at it, albeit infrequently.
Come RailsConf 2016/2017 - I see Yehuda & Godfrey from Tilde giving talks about Helix,
which aims at giving Rubyists an easy way to augment their *slow* Ruby code without using C,
but by using safe & fast Rust!
I started trying to make small Rust projects to show off to co-workers this past summer,
which kept me in the loop of all the progress happening in the Rust community.
As luck would have it,
I stumbled across the Increasing Rust's Reach program,
which would enable me to work directly with an experienced Rust developers and thought-leaders
in the Rust community.

## Acceptance

I don't know why or how I was plucked from the pool of applicants, but I am surely thankful.
I, along with another new Rustacean, Katrina Brock,
were placed on the Rust Webframework story team writing docs,
tutorials, and code for both the [Diesel] ORM and [Rocket] web frameworks. 
My Rust partner was Sean Griffin, 
whom I was very excited to work with as I was already familiar with his work in the Ruby community.

Nervous and *very* excited, I started blasting out cards on my trello board for this project.
This was everything from ideas for projects, tons of questions, and my goals.
I decided the best thing to do was work on a very basic application that I could code with my eyes closed in Ruby,
a web blog.

I know this is terribly boring, 
but I barely knew the Rust language and there is nothing like Rails in the Rust web community,
so this was going to be a challenge.
One of the biggest hurdles besides getting comfortable with the language was figuring out the 
stuff I take for granted in a Ruby on Rails app.
User auth, password security, database constraints to name a few...

## Accomplishments

With the help of the Diesel Core team,
I got pretty far in implementing [my blog] with most of the features I wanted.
It's still a WIP and has lots of bad code,
but a great playground to experiment with new ideas.
This blog itself (sorry, it's Jekyll for now... heh),
features articles on what I've learned in setting up and creating the Rust Blog project.
There will be more to come :)!

[my blog]: https://github.com/notryanb/rust-blog-demo

Aside from that personal project,
I made my **first open source pull request** with some guide documentation on Diesel's codegen.
Since then I have made a handful of contributions related to both documentation (including doctests)
and actual code (better errors with `compile_error!`). 

Katrina and I also accepted membership to the official Diesel Contributors team.

## Relfection

Working with the Diesel team has been a wonderful experience.
They were there for all my ridiculous questions and gave excellent and honest feedback
on all of my work.
As silly as it seems,
I am no longer afraid of strongly typed languages
and learning more difficult computer science concepts.

Moving foward I will continue to work on my Rust web project blog series
and be an active member of the Diesel team.
I have also decided to get involved in Rust game / audio development and start working
on the [Piston] project.
Game development is the whole reason I became a programmer in the first place
(I've been wanting to do this for 20+ years,
but was told otherwise by traditional academia :/ ).

I think I can finally call myself a *Rustacean* 
and look forward to helping keep the Rust community a welcoming and enriching place to program.

Special thanks to Sean Griffin, Katrina Brock, Pascal Hertleif, and Bastien Orivel.
I promise to stop *breaking* CI.

[Piston]: https://github.com/PistonDevelopers/piston
[Increasing Rust's Reach]: https://blog.rust-lang.org/2017/06/27/Increasing-Rusts-Reach.html
[Diesel]: http://diesel.rs
[Rocket]: https://rocket.rs
