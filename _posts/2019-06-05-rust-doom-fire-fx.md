---
layout: post
title: "Rust Implementation of the Doom Fire FX"
date: 2019-06-06
categories:
- rust
- programming
- graphics
---

Near the start of this year I had purchased the [Game Engine Black Book] by Fabien Sanglard.
It celebrates the 25th anniversary of the release of PC Game, Doom.
Shortly after the doom black book was released, Fabien had written a [blog post]
covering how the opening fire effect was made for the PSX version of Doom.
Fabien goes on to explain the core mechanics of how the algorithm works.
At the end of the article there is a link to a [HTML gist]
featuring an implementation in JavaScript.
Seeing as how I've always wanted to start learning game development,
I figured this would be a good project to learn basic graphical programming concepts.
We'll start with an overview of what we're trying to accomplish and then do a fairly straight forward
port of the JavaScript implementation.

This post will cover creating the Doom fire effect using
- Stable Rust (1.35.0 as of time of writing)
- [SDL2 crate]
- Preferrably macOS or linux
- [Ferris], the Rust mascot

The code from my personal implementation is [located here](https://github.com/notryanb/doom_fire_fx)

I will not go into details about installing the SDL2 library as this can be wildly different across machines.
The SDL2 crate documentation does a fairly decent job of doing so.
I built this project on my 2013 MacBook Pro.
I am no authority on graphics programming (or even Rust for that matter!),
so please do not take this approach as a best practice.
It is meant to be used as a learning exercise and aimed towards new Rustaceans.

[Game Engine Black Book]: http://fabiensanglard.net/gebbdoom/index.html
[blog post]: http://fabiensanglard.net/doom_fire_psx/index.html
[HTML gist]: https://github.com/fabiensanglard/DoomFirePSX/blob/master/flames.html
[SDL2 crate]: https://github.com/Rust-SDL2/rust-sdl2
[Ferris]: https://rustacean.net/


To start off, we are trying to [implement this](https://youtu.be/YJB0gfP-GRY?t=13) by manipulating an array of pixels.
The general idea is to iterate over the collection of pixels and choose the correct color from a palette.
The palette we're going to use is 36 colors in length ranging from *almost* black (colder) to white (hotter) with some red, orange, and yellow in the middle.
We're going to put almost all of the code in the main section to get things working, as we can always refactor later.
Perhaps I'll eventually follow up this post on how to refactor this implementation in a more *rusty* way.

```rust
const FIRE_WIDTH: u32 = 320;
const FIRE_HEIGHT: u32 = 168;
const CANVAS_WIDTH: u32 = 800;
const CANVAS_HEIGHT: u32 = 600;

fn main() {
    let color_palette = [
        (0x07, 0x07, 0x07), // Dark, almost black
        (0x1F, 0x07, 0x07),
        (0x2F, 0x0F, 0x07),
        (0x47, 0x0F, 0x07),
        (0x57, 0x17, 0x07),
        (0x67, 0x1F, 0x07),
        (0x77, 0x1F, 0x07),
        (0x8F, 0x27, 0x07),
        (0x9F, 0x2F, 0x07),
        (0xAF, 0x3F, 0x07),
        (0xBF, 0x47, 0x07),
        (0xC7, 0x47, 0x07),
        (0xDF, 0x4F, 0x07),
        (0xDF, 0x57, 0x07),
        (0xDF, 0x57, 0x07),
        (0xD7, 0x5F, 0x07),
        (0xD7, 0x5F, 0x07),
        (0xD7, 0x67, 0x0F),
        (0xCF, 0x6F, 0x0F),
        (0xCF, 0x77, 0x0F),
        (0xCF, 0x7F, 0x0F),
        (0xCF, 0x87, 0x17),
        (0xC7, 0x87, 0x17),
        (0xC7, 0x8F, 0x17),
        (0xC7, 0x97, 0x1F),
        (0xBF, 0x9F, 0x1F),
        (0xBF, 0x9F, 0x1F),
        (0xBF, 0xA7, 0x27),
        (0xBF, 0xA7, 0x27),
        (0xBF, 0xAF, 0x2F),
        (0xB7, 0xAF, 0x2F),
        (0xB7, 0xB7, 0x2F),
        (0xB7, 0xB7, 0x37),
        (0xCF, 0xCF, 0x6F),
        (0xDF, 0xDF, 0x9F),
        (0xEF, 0xEF, 0xC7),
        (0xFF, 0xFF, 0xFF), // White, very hot
    ];
}
```
We start off by declaring a few constants.
Fire width and height represent how tall our fire is going to be, not how tall the window will be.
Our canvas (SDL Window) will be 800x600 pixels.
You may notice that the fire doesn't seem wide or high enough to cover most of our window.
We will actually end up scaling the pixels to "become larger", which does a few cool things.
- Makes the effect appear a little more pixelated, which mimic the PSX version pretty well.
- Less indicies to iterate over every frame
The `color_palette` is an array of tuples with three members representing Red, Green, Blue hex values.
You can take those tuples (without the `0x` prefix) and plug them into any hex-to-rgb converter to see the colors they produce.

Our starting state should be an entirely black screen with the bottom row of pixels set to white.
The bottom line will be where the fire originates from.
In order to do this, we need a collection of pixels, or rather a *buffer* that represents all the pixels in our fire.
We can achieve this by creating a `Vec` with the capacity set to our fire width * fire height.
This vec will be updated on every frame, so it must be mutable.
When creating the Vec, it will be empty despite us setting the capacity.
We have to push all the black pixels into our buffer and then update it again the the white line we want at the bottom.

Not being used to graphics programming, the array indexing through me for a loop when originally porting the code to Rust.
Our pixel buffer is 1-dimensional layed out by row starting from the top of the image.
The coordinate `x: 0, y: 0`is the top left corner of the screen.
As `x` increases, we're moving right and as `y` increases, we're moving towards the bottom of the screen.

```rust
/*
  Example of a 3x3 Grid. 
  The first 3 positions pixel_buffer[0], pixel_buffer[1], pixel_buffer[2] are the top row
  and the last 3 positions (indicies 6, 7, 8) are the bottom row set to white (36)

  [
      0  { x: 0, y: 0 },
      0  { x: 1, y: 0 },
      0  { x: 2, y: 0 },
      0  { x: 0, y: 1 },
      0  { x: 1, y: 1 },
      0  { x: 2, y: 1 },
      36 { x: 0, y: 2 },
      36 { x: 1, y: 2 },
      36 { x: 2, y: 2 }, 
  ]
*/

fn main() {
    // color palette code 
    // ...

    // Create the pixel buffer
    let mut pixel_buffer: Vec<u32> = Vec::with_capacity((FIRE_WIDTH * FIRE_HEIGHT) as usize);

    // Set all pixels to black
    for _ in 0..pixel_buffer.capacity() {
        pixel_buffer.push(0);
    }

    // Set bottom row of Pixels to white inside the pixel buffer.
    for i in 0..FIRE_WIDTH {
        let bottom_x_y = ((FIRE_HEIGHT - 1) * FIRE_WIDTH + i) as usize;
        pixel_buffer[bottom_x_y] = 36;
    }
```






