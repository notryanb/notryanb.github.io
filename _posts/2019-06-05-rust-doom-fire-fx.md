---
layout: post
title: "Rust Implementation of the Doom Fire FX"
date: 2019-06-06
categories:
- rust
- programming
- graphics
---
In December 2018 I had purchased the [Game Engine Black Book] by Fabien Sanglard.
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
- Preferrably macOS or linux (I wasn't able to get SDL2 configured on Windows properly)
- [Ferris], the Rust mascot

The code from my personal implementation is [located here](https://github.com/notryanb/doom_fire_fx) if want to skip the article.

I will not go into details about installing the SDL2 library as this process is different across machines and can be the hardest part of the project.
The SDL2 crate documentation does a fairly decent job of guiding the setup process.
I built this project on my 2013 MacBook Pro.
I am no authority on graphics programming (or even Rust for that matter!),
so please do not take this approach as a best practice.
It is meant to be used as a learning exercise and aimed towards new Rustaceans.

[Game Engine Black Book]: http://fabiensanglard.net/gebbdoom/index.html
[blog post]: http://fabiensanglard.net/doom_fire_psx/index.html
[HTML gist]: https://github.com/fabiensanglard/DoomFirePSX/blob/master/flames.html
[SDL2 crate]: https://github.com/Rust-SDL2/rust-sdl2
[Ferris]: https://rustacean.net/


To start off, we are trying to [implement this](https://youtu.be/YJB0gfP-GRY?t=13) by manipulating a collection of pixels and selecting the correct color from a palette.
The palette we're going to use is 36 colors in length ranging from *almost* black (colder) to white (hotter) with some red, orange, and yellow in the middle.
We're going to put almost all of the code in the main function to get things working, as we can always refactor later.
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
- Makes the effect appear a little more pixelated, which mimics the PSX version pretty well.
- Less indicies to iterate over every frame

The `color_palette` is an array of tuples with three members representing Red, Green, Blue hex values.
You can take those tuples (without the `0x` prefix) and plug them into any hex-to-rgb converter to see the colors they produce.

Our starting state should be an entirely black screen with the bottom row of pixels set to white.
The bottom line will be where the fire originates from.
In order to do this, we need a collection of pixels, or rather a *buffer* that represents all the pixels in our fire.
We can achieve this by creating a `Vec` with the [capacity] set to our `fire width * fire height`.
This vec will be updated on every frame, so it must be mutable.
When creating the Vec, it will be empty despite us setting the capacity.
We have to push all the black pixels into our buffer and then update it again with the white line we want at the bottom.

Not being used to graphics programming, the array indexing confused me when originally porting the code to Rust.
Our pixel buffer is 1-dimensional and layed out by row starting from the top left of the image.
Each indice will contain a number 0 through 36, which refers to a spot in our color palette tuple array.
The coordinate `x: 0, y: 0`is the top left corner of the screen.
As `x` increases, we're moving right and as `y` increases, we're moving towards the bottom of the screen.

[capacity]: https://doc.rust-lang.org/std/vec/struct.Vec.html#method.with_capacity

```rust
/*
  Example of how a 3x3 grid works.
  The first 3 positions pixel_buffer[0], pixel_buffer[1], pixel_buffer[2] are the top row
  and the last 3 positions (indicies 6, 7, 8) are the bottom row set to white (index 36 in color_palette)

  [
      0,  // { x: 0, y: 0 }
      0,  // { x: 1, y: 0 }
      0,  // { x: 2, y: 0 }
      0,  // { x: 0, y: 1 }
      0,  // { x: 1, y: 1 }
      0,  // { x: 2, y: 1 }
      36, // { x: 0, y: 2 }
      36, // { x: 1, y: 2 }
      36, // { x: 2, y: 2 }
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

Lets build the fire algorithm before actually writing any SDL code.
In my repo, I've arbitrarily put the SDL2 code first, which can all be changed during a refactoring.
Our algorithm needs to do two things.
- Check every "pixel" in the buffer.
- Decide how to spread the fire (what color it should be)

When indexing into the `pixel_buffer`, think about how the structure is laid out.
The width of our fire is `320`, which means the first indicies 0..319 represent a single horizontal row at the top of the image.
The next 320 indices represent then next row down.
Iterating down the screen and then over to the right (by column) will be easier for our spread fire algorithm.
To do this we must use the formula `y * FIRE_WIDTH + x`.


```rust
/*
    Fire pixel buffer will look like this for a 3x3 grid.

    The buffer is ordered by row then column. 
    ie. every FIRE_WIDTH index represents one ROW, starting at the top of the image.
    The last row represents the bottom of the image, AKA the entire white row.

    This function iterates down and across the window.
    ie. starts at the top of the first column, works it's way down,
    then moves into the next column to the right.
    
    [
        0  { x: 0, y: 0 }, never touched, this is the top of the fire where it doesn't go
        0  { x: 1, y: 0 }, never touched, this is the top of the fire where it doesn't go
        0  { x: 2, y: 0 }, never touched, this is the top of the fire where it doesn't go
        0  { x: 0, y: 1 }, <- 1. cursor first iteration
        0  { x: 1, y: 1 }, <- 3. cursor third iteration
        0  { x: 2, y: 1 }, <- 3. cursor fifth iteration
        36 { x: 0, y: 2 }, <- 2. cursor second iteration
        36 { x: 1, y: 2 }, <- 4. cursor fourth iteration
        36 { x: 2, y: 2 }, <- 6. cursor sixth iteration
    ]
*/
pub fn calculate_fire(pixel_buffer: &mut Vec<u32>) {
    for x in 0..FIRE_WIDTH {
        for y in 1..FIRE_HEIGHT {
            let fire_pixel_cursor = y * FIRE_WIDTH + x;
            spread_fire(fire_pixel_cursor, pixel_buffer);
        }
    }
}
```

Our `spread_fire` function will need the cursor we calculated for moving across the `pixel_buffer` and the buffer itself.
The fire algorithm is simple, but very clever (at least I think so, but I didn't create it...).
We need to check the "color" of the pixel, which again is a number that represents the index in the `color_palette` array.
If that color is black, we don't do anything.
This is because that pixel represents something cold and shouldn't effect anything around it.
When the pixel is a color besides the darkest color in our `color_palette`, > 0 ,
then we must somehow choose the next color.

When our image starts out, only the bottom row is white, which means that row is hot and everything else is cold.
Every iteration the "hot" pixels need to effect other closeby pixels by heating them up as well.
To do this we'll randomly select a pixel close to the one we're looking at and give it a random similar color than the source pixel.
This guarantees that the rows above the white one will start to turn red/orange/yellow.
As long as that white row is there, it will feed the fire.
Be sure to add `rand` to your `Cargo.toml` file.
You can find [rand here](https://crates.io/crates/rand).

```rust
extern crate rand;

use rand::Rng;

// ... main() {} 

pub fn spread_fire(cursor: u32, pixel_buffer: &mut Vec<u32>) {
    let pixel = pixel_buffer[cursor as usize];

    if pixel == 0 {
        // our cursor selected a black pixel, which means it's too cold to effect anything.
        let idx = (cursor - FIRE_WIDTH) as usize;
        pixel_buffer[idx] = 0;
    } else {
        // ensure the index will be 0,1,2
        let mut rng = rand::thread_rng(); 
        let random_index = (rng.gen::<f64>() * 3.0).round() as u32 & 3; 

        // Adjusting the distance will change how the fire behaves
        // by making it look like it is blowing left or right.
        let distance = cursor - random_index + 1;
        let new_index = (distance - FIRE_WIDTH) as usize;

        // Select a similar color for the random close pixel
        pixel_buffer[new_index] = pixel - (random_index & 1); 
    }
}
```

We're basically done with the fire algorithm.
The rest of this article will deal with passing these computed colors to SDL2 so we can see the work we've done.
Add the following code at the top of main to import everything we'll need for using SDL2.
We'll also need to include SDL2 to our `Cargo.toml`

```rust
// Cargo.toml

[dependencies]
rand = "0.6.3"

[dependencies.sdl2]
version = "0.32.1"
default-features = false
features = ["image"]



// ----------  /src/main.rs
extern crate sdl2;

use rand::Rng;
use sdl2::image::LoadTexture;
use sdl2::pixels::Color;
use sdl2::pixels::PixelFormatEnum;
use sdl2::rect::Rect;
use sdl2::render::{BlendMode, TextureCreator};
use sdl2::event::Event;
use sdl2::keyboard::Keycode;
```

For SDL2 to work, we need to create a [context, window], and [canvas].
I found that if I wanted to write our pixel buffer to the screen,
we need a [texture] to manipulate as well.
SDL gives us the ability to bind behavior to keyboard events which are nice for exiting our project.
We should take care of the setup process before starting the loop.
All loop and setup code should be in the `main()` function.
You can add it after all the color palette and pixel buffer code.

[context, window]: https://docs.rs/sdl2/0.32.2/sdl2/video/struct.Window.html#method.context
[canvas]: https://docs.rs/sdl2/0.32.2/sdl2/render/struct.Canvas.html
[texture]: https://docs.rs/sdl2/0.32.2/sdl2/render/struct.TextureCreator.html

```rust
    // Set Up SDL Windox & Canvas
    let sdl_context = sdl2::init().unwrap();
    let video_subsystem = sdl_context.video().unwrap();

    let window = video_subsystem
        .window("Rust Doom Fire FX", CANVAS_WIDTH, CANVAS_HEIGHT)
        .position_centered()
        .build()
        .unwrap();

    let mut canvas = window
        .into_canvas()
        .target_texture()
        .present_vsync()
        .build()
        .unwrap();

    let texture_creator: TextureCreator<_> = canvas.texture_creator();

    // RGBA8888 splits each pixel into four 8 bit sections taking a total of 4 bytes
    // This is how we'll set Red, Green Blue and Alpha.
    let mut fire_texture = texture_creator
        .create_texture_streaming(PixelFormatEnum::RGBA8888, FIRE_WIDTH, FIRE_HEIGHT)
        .map_err(|e| e.to_string())
        .unwrap();

    // Start with a blank slate and then present it for viewing.
    canvas.clear();
    canvas.set_draw_color(Color::RGBA(0x07, 0x07, 0x07, 255));
    canvas.present();

    // This gives us access to keyboard events
    let mut event_pump = sdl_context.event_pump().unwrap();

```

Our loop will take care of several things.
We will be clearning the screen on every iteration,
checking if the user has pressed escape to quit the program,
calculate the fire, write it to the fire texture, and preset it back to the screen.

```rust

    'running: loop {
        // Wipe the screen clean
        canvas.clear();

        // Simple check if the user has pressed escape, which will quit the program.
        for event in event_pump.poll_iter() {
            match event {
                Event::Quit { .. }
                | Event::KeyDown {
                    keycode: Some(Keycode::Escape),
                    ..
                } => break 'running,
                _ => {}
            }
        }

        // Write the state of the pixel buffer into the fire texture.
        fire_texture
            .with_lock(None, |buffer: &mut [u8], _pitch: usize| {
                // all the work we did before...
                calculate_fire(&mut pixel_buffer);

                for (idx, pixel_cursor) in pixel_buffer.iter().enumerate() {
                    // Each pixel is 4 bytes, so we need to offset the texture
                    // buffer by this much.
                    let offset = idx * 4;
    
                    let pixel = color_palette[*pixel_cursor as usize];
 
                    // Ensure the pixels are completely opaque when brighter 
                    // than our darkest color in the palette 
                    // Helpful when our eventual image will rise
                    // from behind the fire
                    let mut alpha = 255;

                    // Make transparent pixels when darker than darkest color
                    if pixel.0 <= 0x07 && pixel.1 <= 0x07 && pixel.2 <= 0x07 {
                        alpha = 0;
                    }
  
                    // Each offset + N is another offset into 
                    // each byte that represents that color 
                    buffer[offset] = alpha as u8; // alpha channel
                    buffer[offset + 1] = pixel.2 as u8; // blue channel
                    buffer[offset + 2] = pixel.1 as u8; // green channel
                    buffer[offset + 3] = pixel.0 as u8; // red channel
                }
            })
            .unwrap();

        // Display it all to the user
        let rect = Rect::new(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        canvas.copy(&fire_texture, None, Some(rect)).unwrap();
        canvas.present();
    }

```

Compile this as release, `cargo run --release` to see infinite flames!

While this is awesome and got me very excited the first time I saw it,
we should aim to complete the effect by having the fire eventually die down and display an image
rising in the background.
The reason we care about the alpha channel in our texture buffer is we want "cold" pixels to be transparent
so our logo can be seen through them.
Doom obviously uses the doom logo (which I have in my repo) version, but I'd like to keep things Rust-y
and use [Ferris].
Download a `.png` from the rustacean.net site and place it in your `/src` folder right along `main.rs`.

In order to create the rising Ferris, we need to keep track of how the image will scroll updwards.
Just after the fire texture, we can add a variable `y_scrolling` and set it to 540px down from the top of the image.
We will adjust the value of `y_scrolling` every iteration through the loop in order to bring Ferris up.
This can also be used to trigger when we want the fire to extinguish.
Inside our loop we can apply an algorithm to the pixel buffer to start decreasing the fire based on how much
Ferris has scrolled up in the background.

We will decrease scrolling by 2 until it has reached 70 pixels from the top of the screen.
Once Ferris arrives to 70 pixels from the top,
we can apply a "reverse" calculation to the fire to cool it off and eventually dissipate it.
This means the white row at the bottom will eventually go away and stop feeding the fire.

It took me a while to figure out how to get the image to display behind the fire even with the alpha set correctly,
so we'll add in one line of code to set the blend mode of the fire texture.

First, lets add the image loading code for Ferris anywhere before the loop.

```rust
    // ... SDL2 initialization code
    let mut y_scrolling = 540;
    let image_texture_creator = canvas.texture_creator();

    // Ferris Logo:
    // http://enosart.com/animated-crab-9974/
    let logo = image_texture_creator
        .load_texture("./src/ferris_logo.png")
        .unwrap();


    // ... fire texture code
```

Lastly, the code to put our fire out inside the loop, but after writing the texture.

```rust
    // ... fire texture loop

    // This is so we can see Ferris through the fire.
    &fire_texture.set_blend_mode(BlendMode::Blend);

    // Set the position for anything scrolling to stop at 70 pixels
    // from the top of the canvas
    if y_scrolling != 70 {
        y_scrolling -= 2;
    } else {
        // Start at the bottom white row of the FIRE and loop backwards.
        // We can stop a few rows above to get an extinguishing effect
        // Where the fire blows away
        for y in (161..168).rev() {
            for x in 0..FIRE_WIDTH {
                let index = (y * FIRE_WIDTH + x) as usize;

                // If the color isn't black, generate a new color slightly darker
                if pixel_buffer[index] > 0 {
                    let mut rng = rand::thread_rng();
                    let random_num: f64 = rng.gen(); // generates a float between 0 and 1
                    let random_decrement = random_num.round() as u32 & 3;
                    pixel_buffer[index] -= random_decrement;
                }
            }
        }
    }

    let rect = Rect::new(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // We need to add another rectangle to place Ferris' buffer.
    // The scrolling value will effect Ferris' placement every loop iteration.
    let logo_rect = Rect::new(40, y_scrolling, CANVAS_WIDTH - 75, 450);

    // Make sure to draw Ferri behind (before) the fire!
    canvas.copy(&logo, None, Some(logo_rect)).unwrap();
    canvas.copy(&fire_texture, None, Some(rect)).unwrap();
    canvas.present();

```

The moment of truth, run `cargo run --release`

We've done it! The Doom PSX fire effect using Rust and SDL2! 

![doom_ferris_fx](/assets/doom_ferris_fx.gif)


